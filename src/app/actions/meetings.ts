"use server";

import { revalidatePath } from "next/cache";
import { requireUser, isStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fromLocalInput } from "@/lib/format";
import { sendPush } from "@/lib/push";
import type { ActionResult } from "@/lib/types";

const MODES = ["video", "presenza", "telefono"] as const;
const MODE_LABEL: Record<string, string> = { video: "videochiamata", presenza: "in sede", telefono: "telefono" };

type MeetingRow = {
  id: string;
  student_id: string;
  teacher_id: string;
  topic: string;
  status: "requested" | "proposed" | "confirmed" | "cancelled";
  starts_at: string | null;
  duration_min: number;
  mode: string;
  place: string;
  proposed_by: string | null;
  kind?: "colloquio" | "lezione" | "revisione";
};

const KIND_LABEL = { colloquio: "colloquio", lezione: "lezione privata", revisione: "revisione dell'elaborato" } as const;

const when = (iso: string) =>
  new Date(iso).toLocaleString("it-IT", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

function refresh() {
  revalidatePath("/area/colloqui");
  revalidatePath("/docente/colloqui");
  revalidatePath("/area", "layout");
  revalidatePath("/docente", "layout");
}

function parseStart(v: FormDataEntryValue | null): { iso: string | null; error?: string } {
  const raw = String(v ?? "");
  if (!raw) return { iso: null };
  const iso = fromLocalInput(raw);
  if (!iso) return { iso: null, error: "Data e ora non valide." };
  if (new Date(iso).getTime() < Date.now() + 15 * 60000) return { iso: null, error: "Scegli una data e un'ora future." };
  return { iso };
}

/** Avviso nella chat tra i due (resta sulla piattaforma) e notifica sul telefono. */
async function announce(m: Pick<MeetingRow, "student_id" | "teacher_id">, senderId: string, body: string) {
  const admin = createAdminClient();
  await admin.from("messages").insert({ student_id: m.student_id, teacher_id: m.teacher_id, sender_id: senderId, body });
  const to = senderId === m.student_id ? m.teacher_id : m.student_id;
  const url = to === m.student_id ? "/area/colloqui" : "/docente/colloqui";
  await sendPush([to], { title: "Colloquio", body: body.split("\n")[0].slice(0, 140), url }).catch(() => {});
}

function describe(m: Pick<MeetingRow, "starts_at" | "duration_min" | "mode" | "place">) {
  if (!m.starts_at) return "";
  return `${when(m.starts_at)} · ${m.duration_min} min · ${MODE_LABEL[m.mode] ?? m.mode}${m.place ? ` (${m.place})` : ""}`;
}

/** Il discente chiede un colloquio a un docente, con un orario facoltativo. */
export async function requestMeeting(formData: FormData): Promise<ActionResult> {
  const { user, profile } = await requireUser();
  if (isStaff(profile)) return { ok: false, error: "Solo i discenti possono chiedere un colloquio." };
  const admin = createAdminClient();
  const teacherId = String(formData.get("teacher_id") ?? "");
  const topic = String(formData.get("topic") ?? "").trim().slice(0, 300);
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000);
  const mode = MODES.includes(String(formData.get("mode")) as (typeof MODES)[number]) ? String(formData.get("mode")) : "video";
  if (!topic) return { ok: false, error: "Scrivi l'argomento del colloquio." };
  const { data: t } = await admin.from("profiles").select("id").eq("id", teacherId).in("role", ["teacher", "admin"]).maybeSingle();
  if (!t) return { ok: false, error: "Scegli il docente." };
  const start = parseStart(formData.get("starts_at"));
  if (start.error) return { ok: false, error: start.error };

  // lezioni private e revisioni si pagano con i minuti acquistati
  const kindRaw = String(formData.get("kind") ?? "colloquio");
  const kind = (["colloquio", "lezione", "revisione"].includes(kindRaw) ? kindRaw : "colloquio") as "colloquio" | "lezione" | "revisione";
  const duration = kind === "revisione" ? 30 : kind === "lezione" ? Math.min(180, Math.max(30, Number(formData.get("duration_min")) || 60)) : 30;
  if (kind !== "colloquio") {
    const { creditBalance } = await import("@/lib/credits");
    const bal = await creditBalance(user.id);
    if (bal.minutes < duration) return { ok: false, error: "Minuti insufficienti: acquista un pacchetto di lezioni private." };
  }

  const row = {
    student_id: user.id,
    teacher_id: teacherId,
    topic,
    note,
    mode,
    kind,
    duration_min: duration,
    status: start.iso ? "proposed" : "requested",
    starts_at: start.iso,
    proposed_by: start.iso ? user.id : null,
    created_by: user.id,
  };
  const { data: created, error } = await admin.from("meetings").insert(row).select("id").single();
  if (error || !created) return { ok: false, error: "Richiesta non inviata. Riprova." };
  if (kind !== "colloquio") {
    const { spendCredits } = await import("@/lib/credits");
    const ok = await spendCredits(user.id, "minutes", duration, { meeting_id: created.id, note: KIND_LABEL[kind] });
    if (!ok) {
      await admin.from("meetings").delete().eq("id", created.id);
      return { ok: false, error: "Minuti insufficienti: acquista un pacchetto di lezioni private." };
    }
  }
  const label = kind === "colloquio" ? "colloquio" : KIND_LABEL[kind];
  await announce(
    row,
    user.id,
    `📅 Richiesta di ${label}: ${topic}${kind !== "colloquio" ? ` (${duration} min, già pagata)` : ""}\n${start.iso ? `Orario proposto: ${describe({ ...row, place: "" })}` : "Nessun orario indicato: proponine uno tu."}${note ? `\n${note}` : ""}\nRispondi da Colloqui.`,
  );
  refresh();
  revalidatePath("/area/lezioni-private");
  return { ok: true, message: "Richiesta inviata. Il docente ti proporrà o confermerà l'orario." };
}

/** Il docente fissa un colloquio con un discente: il discente accetta o propone un altro orario. */
export async function scheduleMeeting(formData: FormData): Promise<ActionResult> {
  const { user, profile } = await requireUser();
  if (!isStaff(profile)) return { ok: false, error: "Non autorizzato." };
  const admin = createAdminClient();
  const studentId = String(formData.get("student_id") ?? "");
  const topic = String(formData.get("topic") ?? "").trim().slice(0, 300);
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000);
  const mode = MODES.includes(String(formData.get("mode")) as (typeof MODES)[number]) ? String(formData.get("mode")) : "video";
  const place = String(formData.get("place") ?? "").trim().slice(0, 300);
  const duration = Math.min(180, Math.max(10, Number(formData.get("duration_min")) || 30));
  if (!topic) return { ok: false, error: "Scrivi l'argomento." };
  const { data: s } = await admin.from("profiles").select("id").eq("id", studentId).eq("role", "student").maybeSingle();
  if (!s) return { ok: false, error: "Scegli il discente." };
  const start = parseStart(formData.get("starts_at"));
  if (start.error || !start.iso) return { ok: false, error: start.error ?? "Indica data e ora." };

  const row = {
    student_id: studentId,
    teacher_id: user.id,
    topic,
    note,
    mode,
    place,
    duration_min: duration,
    status: "proposed",
    starts_at: start.iso,
    proposed_by: user.id,
    created_by: user.id,
  };
  const { error } = await admin.from("meetings").insert(row);
  if (error) return { ok: false, error: "Colloquio non salvato." };
  await announce(row, user.id, `📅 Ti propongo un colloquio: ${topic}\n${describe(row)}${note ? `\n${note}` : ""}\nConfermalo o proponi un altro orario da Colloqui.`);
  refresh();
  return { ok: true, message: "Colloquio proposto: il discente lo confermerà o proporrà un altro orario." };
}

async function loadOwn(id: string) {
  const { user, profile } = await requireUser();
  const admin = createAdminClient();
  const { data: m } = await admin.from("meetings").select("*").eq("id", id).maybeSingle<MeetingRow>();
  const isAdmin = profile.role === "admin" || !!profile.is_super;
  if (!m || (m.student_id !== user.id && m.teacher_id !== user.id && !isAdmin)) return null;
  // un amministratore che interviene agisce dal lato del docente
  const me = m.student_id === user.id ? user.id : m.teacher_id === user.id ? user.id : m.teacher_id;
  return { m, me, admin, staff: isStaff(profile) };
}

/** Conferma l'orario proposto dall'altra parte. */
export async function acceptMeeting(id: string): Promise<ActionResult> {
  const ctx = await loadOwn(id);
  if (!ctx) return { ok: false, error: "Colloquio non trovato." };
  const { m, me, admin } = ctx;
  if (m.status !== "proposed" || !m.starts_at) return { ok: false, error: "Non c'è un orario da confermare." };
  if (m.proposed_by === me) return { ok: false, error: "Aspetta la risposta dell'altra parte." };
  if (new Date(m.starts_at).getTime() < Date.now()) return { ok: false, error: "L'orario proposto è già passato: proponine un altro." };
  const { error } = await admin.from("meetings").update({ status: "confirmed", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: "Non riuscito." };
  await announce(m, me, `✅ Colloquio confermato: ${m.topic}\n${describe(m)}`);
  refresh();
  return { ok: true, message: "Colloquio confermato." };
}

/** Propone un orario diverso (o il primo, se la richiesta non ne aveva). */
export async function proposeMeeting(id: string, formData: FormData): Promise<ActionResult> {
  const ctx = await loadOwn(id);
  if (!ctx) return { ok: false, error: "Colloquio non trovato." };
  const { m, me, admin, staff } = ctx;
  if (m.status === "cancelled") return { ok: false, error: "Il colloquio è stato annullato." };
  const start = parseStart(formData.get("starts_at"));
  if (start.error || !start.iso) return { ok: false, error: start.error ?? "Indica data e ora." };
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  const patch: Record<string, unknown> = {
    status: "proposed",
    starts_at: start.iso,
    proposed_by: me,
    updated_at: new Date().toISOString(),
  };
  if (staff) {
    const mode = String(formData.get("mode") ?? "");
    if (MODES.includes(mode as (typeof MODES)[number])) patch.mode = mode;
    if (formData.has("place")) patch.place = String(formData.get("place") ?? "").trim().slice(0, 300);
    const d = Number(formData.get("duration_min"));
    // la durata delle lezioni pagate resta quella acquistata
    if (d && (m.kind ?? "colloquio") === "colloquio") patch.duration_min = Math.min(180, Math.max(10, d));
  }
  const { error } = await admin.from("meetings").update(patch).eq("id", id);
  if (error) return { ok: false, error: "Non riuscito." };
  const next = { ...m, ...patch } as MeetingRow;
  await announce(
    m,
    me,
    `🔁 ${m.status === "requested" ? "Orario proposto" : "Nuovo orario proposto"} per il colloquio: ${m.topic}\n${describe(next)}${note ? `\n${note}` : ""}\nConferma o proponi un altro orario da Colloqui.`,
  );
  refresh();
  return { ok: true, message: "Nuovo orario inviato." };
}

/** Annulla il colloquio (con un motivo facoltativo). */
export async function cancelMeeting(id: string, reason: string): Promise<ActionResult> {
  const ctx = await loadOwn(id);
  if (!ctx) return { ok: false, error: "Colloquio non trovato." };
  const { m, me, admin } = ctx;
  if (m.status === "cancelled") return { ok: true };
  const { error } = await admin.from("meetings").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: "Non riuscito." };
  const why = reason.trim().slice(0, 500);
  // minuti restituiti se annulla il docente, se l'orario non era ancora confermato o con almeno 24 ore di preavviso
  let refunded = false;
  if ((m.kind ?? "colloquio") !== "colloquio") {
    const early = !m.starts_at || m.status !== "confirmed" || new Date(m.starts_at).getTime() - Date.now() > 24 * 3600000;
    if (me !== m.student_id || early) {
      const { refundCredits } = await import("@/lib/credits");
      await refundCredits({ meeting_id: m.id });
      refunded = true;
    }
  }
  const label = KIND_LABEL[m.kind ?? "colloquio"];
  await announce(
    m,
    me,
    `✖ ${label.charAt(0).toUpperCase() + label.slice(1)} ${(m.kind ?? "colloquio") === "colloquio" ? "annullato" : "annullata"}: ${m.topic}${m.starts_at ? `\n(era previsto ${when(m.starts_at)})` : ""}${why ? `\nMotivo: ${why}` : ""}${(m.kind ?? "colloquio") !== "colloquio" ? (refunded ? "\nI minuti sono stati restituiti." : "\nAnnullata con meno di 24 ore di preavviso: i minuti non vengono restituiti.") : ""}`,
  );
  refresh();
  revalidatePath("/area/lezioni-private");
  return { ok: true, message: refunded ? "Annullato: minuti restituiti." : "Annullato." };
}

/** Messaggio a tutti i partecipanti di un incontro, nei Messaggi della piattaforma. */
export async function messageLessonParticipants(lessonId: string, body: string): Promise<ActionResult> {
  const { user, profile } = await requireUser();
  if (!isStaff(profile)) return { ok: false, error: "Non autorizzato." };
  const text = body.trim();
  if (!text) return { ok: false, error: "Scrivi il messaggio." };
  if (text.length > 6000) return { ok: false, error: "Il messaggio è troppo lungo." };
  const admin = createAdminClient();
  const { data: l } = await admin.from("lessons").select("id, title, scheduled_at, package_ids, booking_enabled").eq("id", lessonId).maybeSingle();
  if (!l) return { ok: false, error: "Incontro non trovato." };
  const { bookedStudents, enrolledStudents } = await import("@/lib/recipients");
  const people = l.booking_enabled ? await bookedStudents(l.id) : await enrolledStudents(l.package_ids ?? []);
  if (!people.length) return { ok: false, error: l.booking_enabled ? "Nessun prenotato a cui scrivere." : "Nessun iscritto a cui scrivere." };
  const head = `📍 ${l.title}${l.scheduled_at ? ` · ${when(l.scheduled_at)}` : ""}`;
  const rows = people.map((p) => ({ student_id: p.id, teacher_id: user.id, sender_id: user.id, body: `${head}\n\n${text}` }));
  const { error } = await admin.from("messages").insert(rows);
  if (error) return { ok: false, error: "Messaggio non inviato." };
  await sendPush(
    people.map((p) => p.id),
    { title: l.title, body: text.slice(0, 140), url: `/area/messaggi/${user.id}` },
  ).catch(() => {});
  revalidatePath("/docente/messaggi");
  return { ok: true, message: `Messaggio inviato a ${people.length} ${people.length === 1 ? "discente" : "discenti"}. Lo trovano in Messaggi.` };
}

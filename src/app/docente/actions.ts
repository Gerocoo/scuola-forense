"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailLayout, escapeHtml, notify } from "@/lib/notify";
import { siteUrl } from "@/lib/stripe";
import { fromLocalInput, KIND_LABEL, dateTime } from "@/lib/format";
import type { ActionResult, AssignmentKind, LessonKind, Role, UploadedMeta } from "@/lib/types";

const KINDS: AssignmentKind[] = ["parere", "atto", "esercizio", "documento"];

/* ------------------------------------------------------------------ */
/*  Esercitazioni                                                      */
/* ------------------------------------------------------------------ */

export async function createAssignments(input: {
  batchId: string;
  studentIds: string[];
  kind: AssignmentKind;
  title: string;
  instructions: string;
  dueLocal: string;
  files: UploadedMeta[];
}): Promise<ActionResult & { firstId?: string }> {
  const { supabase, user, profile } = await requireStaff();

  const title = input.title.trim().slice(0, 200);
  if (!title) return { ok: false, error: "Inserisci un titolo." };
  if (!input.studentIds.length) return { ok: false, error: "Scegli almeno un discente." };
  if (!KINDS.includes(input.kind)) return { ok: false, error: "Tipo non valido." };
  if (input.files.some((f) => !f.path.startsWith(`tracce/${input.batchId}/`))) {
    return { ok: false, error: "Percorso dei file non valido." };
  }

  const due = fromLocalInput(input.dueLocal);
  const rows = input.studentIds.map((sid) => ({
    batch_id: input.batchId,
    teacher_id: user.id,
    student_id: sid,
    kind: input.kind,
    title,
    instructions: input.instructions.trim().slice(0, 20000),
    due_at: due,
  }));

  const { data: created, error } = await supabase.from("assignments").insert(rows).select("id, student_id");
  if (error || !created) {
    console.error("[createAssignments]", error);
    return { ok: false, error: "Creazione non riuscita. Riprova." };
  }

  if (input.files.length) {
    const fileRows = created.flatMap((a) =>
      input.files.map((f) => ({
        assignment_id: a.id,
        role: "traccia" as const,
        uploaded_by: user.id,
        storage_path: f.path,
        file_name: f.name.slice(0, 200),
        size_bytes: f.size,
        mime_type: f.type || null,
      })),
    );
    const { error: fErr } = await supabase.from("assignment_files").insert(fileRows);
    if (fErr) console.error("[createAssignments files]", fErr);
  }

  // Notifiche ai discenti
  const { data: students } = await createAdminClient()
    .from("profiles")
    .select("id, email, full_name")
    .in("id", created.map((c) => c.student_id));
  await Promise.all(
    (students ?? []).map((s) => {
      const a = created.find((c) => c.student_id === s.id)!;
      return notify({
        to: s.email,
        subject: `Nuova traccia: ${title}`,
        html: emailLayout(
          "Hai una nuova traccia da svolgere",
          `<p>${escapeHtml(profile.full_name || "Il docente")} ti ha assegnato <strong>${escapeHtml(title)}</strong> (${KIND_LABEL[input.kind].toLowerCase()}).</p>
           ${due ? `<p>Scadenza: <strong>${dateTime(due)}</strong>.</p>` : ""}`,
          { label: "Apri la traccia", href: `${siteUrl()}/area/esercitazioni/${a.id}` },
        ),
      });
    }),
  );

  revalidatePath("/docente/esercitazioni");
  revalidatePath("/docente");
  return { ok: true, firstId: created.length === 1 ? created[0].id : undefined };
}

export async function updateAssignment(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  if (!title) return { ok: false, error: "Il titolo è obbligatorio." };
  const { error } = await supabase
    .from("assignments")
    .update({
      title,
      instructions: String(formData.get("instructions") ?? "").slice(0, 20000),
      due_at: fromLocalInput(String(formData.get("due") ?? "")),
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Salvataggio non riuscito." };
  revalidatePath(`/docente/esercitazioni/${id}`);
  return { ok: true, message: "Traccia aggiornata." };
}

export async function deleteAssignment(id: string) {
  const { supabase } = await requireStaff();
  const { data: files } = await supabase.from("assignment_files").select("storage_path, role").eq("assignment_id", id);
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (!error && files?.length) {
    // le tracce possono essere condivise con altri discenti dello stesso invio: si rimuovono solo se orfane
    const admin = createAdminClient();
    for (const f of files) {
      if (f.role === "traccia") {
        const { count } = await admin.from("assignment_files").select("id", { count: "exact", head: true }).eq("storage_path", f.storage_path);
        if (count) continue;
      }
      await admin.storage.from("materiali").remove([f.storage_path]);
    }
  }
  revalidatePath("/docente/esercitazioni");
  redirect("/docente/esercitazioni");
}

export async function setAssignmentStatus(
  id: string,
  to: "in_correzione" | "assegnato",
): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const from = to === "in_correzione" ? ["consegnato", "corretto"] : ["consegnato", "in_correzione", "corretto"];
  const patch = to === "assegnato" ? { status: to, corrected_at: null } : { status: to };
  const { error, count } = await supabase
    .from("assignments")
    .update(patch, { count: "exact" })
    .eq("id", id)
    .in("status", from);
  if (error || !count) return { ok: false, error: "Operazione non riuscita: lo stato è cambiato nel frattempo." };

  if (to === "assegnato") {
    const { data: a } = await supabase.from("assignments").select("title, student_id").eq("id", id).single();
    const { data: s } = await createAdminClient().from("profiles").select("email").eq("id", a!.student_id).single();
    if (s?.email) {
      await notify({
        to: s.email,
        subject: `Da riconsegnare: ${a!.title}`,
        html: emailLayout(
          "Il docente ti chiede di riconsegnare",
          `<p>Puoi modificare i file di <strong>${escapeHtml(a!.title)}</strong> e consegnare di nuovo. Se ti ha scritto, trovi il messaggio nella tua area.</p>`,
          { label: "Apri l'esercitazione", href: `${siteUrl()}/area/esercitazioni/${id}` },
        ),
      });
    }
  }

  revalidatePath(`/docente/esercitazioni/${id}`);
  revalidatePath("/docente");
  return { ok: true };
}

export async function registerTeacherFile(
  assignmentId: string,
  role: "correzione" | "traccia",
  meta: UploadedMeta,
): Promise<ActionResult> {
  const { supabase, user } = await requireStaff();
  const prefix = role === "correzione" ? `correzioni/${assignmentId}/` : "tracce/";
  if (!meta.path.startsWith(prefix)) return { ok: false, error: "Percorso del file non valido." };
  const { error } = await supabase.from("assignment_files").insert({
    assignment_id: assignmentId,
    role,
    uploaded_by: user.id,
    storage_path: meta.path,
    file_name: meta.name.slice(0, 200),
    size_bytes: meta.size,
    mime_type: meta.type || null,
  });
  if (error) {
    await supabase.storage.from("materiali").remove([meta.path]);
    return { ok: false, error: "Registrazione del file non riuscita." };
  }
  revalidatePath(`/docente/esercitazioni/${assignmentId}`);
  return { ok: true };
}

export async function removeTeacherFile(fileId: string): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { data: f } = await supabase.from("assignment_files").select("*").eq("id", fileId).maybeSingle();
  if (!f) return { ok: false, error: "File non trovato." };
  await supabase.from("assignment_files").delete().eq("id", fileId);
  const { count } = await supabase.from("assignment_files").select("id", { count: "exact", head: true }).eq("storage_path", f.storage_path);
  if (!count) await supabase.storage.from("materiali").remove([f.storage_path]);
  revalidatePath(`/docente/esercitazioni/${f.assignment_id}`);
  return { ok: true };
}

export async function saveReview(assignmentId: string, feedback: string, grade: string): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("assignment_reviews").upsert({
    assignment_id: assignmentId,
    feedback: feedback.slice(0, 20000),
    grade: grade.trim().slice(0, 60) || null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "Salvataggio della bozza non riuscito." };
  return { ok: true, message: "Bozza salvata." };
}

export async function publishCorrection(assignmentId: string, feedback: string, grade: string): Promise<ActionResult> {
  const { supabase } = await requireStaff();

  const saved = await saveReview(assignmentId, feedback, grade);
  if (!saved.ok) return saved;

  const { count: corrFiles } = await supabase
    .from("assignment_files")
    .select("id", { count: "exact", head: true })
    .eq("assignment_id", assignmentId)
    .eq("role", "correzione");
  if (!corrFiles && !feedback.trim()) {
    return { ok: false, error: "Allega l'elaborato annotato o scrivi un commento prima di pubblicare." };
  }

  const { data: a, error } = await supabase
    .from("assignments")
    .update({ status: "corretto", corrected_at: new Date().toISOString() })
    .eq("id", assignmentId)
    .in("status", ["consegnato", "in_correzione"])
    .select("title, student_id")
    .maybeSingle();
  if (error || !a) return { ok: false, error: "Pubblicazione non riuscita: controlla lo stato dell'esercitazione." };

  const { data: s } = await createAdminClient().from("profiles").select("email, full_name").eq("id", a.student_id).single();
  if (s?.email) {
    await notify({
      to: s.email,
      subject: `Correzione pronta: ${a.title}`,
      html: emailLayout(
        "La tua correzione è pronta",
        `<p>Il docente ha corretto <strong>${escapeHtml(a.title)}</strong>${grade.trim() ? ` con giudizio <strong>${escapeHtml(grade.trim())}</strong>` : ""}.</p>
         <p>Nella tua area trovi l'elaborato annotato e il commento.</p>`,
        { label: "Leggi la correzione", href: `${siteUrl()}/area/esercitazioni/${assignmentId}` },
      ),
    });
  }

  revalidatePath(`/docente/esercitazioni/${assignmentId}`);
  revalidatePath("/docente/esercitazioni");
  revalidatePath("/docente");
  return { ok: true, message: "Correzione pubblicata: il discente ha ricevuto un'email." };
}

/* ------------------------------------------------------------------ */
/*  Lezioni                                                            */
/* ------------------------------------------------------------------ */

export async function saveLesson(id: string | null, formData: FormData): Promise<ActionResult & { id?: string }> {
  const { supabase, user } = await requireStaff();
  const kind = String(formData.get("kind")) as LessonKind;
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  if (!title) return { ok: false, error: "Inserisci un titolo." };
  if (kind !== "registrata" && kind !== "in_presenza") return { ok: false, error: "Tipo di lezione non valido." };

  const packageIds = formData.getAll("package_ids").map(String).filter(Boolean);
  if (!packageIds.length) return { ok: false, error: "Scegli almeno un corso che vede la lezione." };

  const duration = Number(formData.get("duration_min")) || null;
  const row = {
    kind,
    title,
    summary: String(formData.get("summary") ?? "").slice(0, 20000),
    video_url: String(formData.get("video_url") ?? "").trim() || null,
    scheduled_at: fromLocalInput(String(formData.get("scheduled_at") ?? "")),
    location: String(formData.get("location") ?? "").trim() || null,
    meeting_url: String(formData.get("meeting_url") ?? "").trim() || null,
    duration_min: duration,
    package_ids: packageIds,
    published: formData.get("published") === "on",
    sort: Number(formData.get("sort")) || 0,
  };

  if (kind === "in_presenza" && !row.scheduled_at) return { ok: false, error: "Indica data e ora dell'incontro." };
  if (kind === "registrata" && row.published && !row.video_url) return { ok: false, error: "Inserisci il link del video prima di pubblicare." };

  if (id) {
    const { error } = await supabase.from("lessons").update(row).eq("id", id);
    if (error) return { ok: false, error: "Salvataggio non riuscito." };
  } else {
    const { data, error } = await supabase.from("lessons").insert({ ...row, teacher_id: user.id }).select("id").single();
    if (error || !data) return { ok: false, error: "Creazione non riuscita." };
    id = data.id;
  }
  revalidatePath("/docente/lezioni");
  revalidatePath("/area/lezioni");
  return { ok: true, id: id!, message: "Lezione salvata." };
}

export async function deleteLesson(id: string) {
  const { supabase } = await requireStaff();
  const { data: files } = await supabase.from("lesson_files").select("storage_path").eq("lesson_id", id);
  await supabase.from("lessons").delete().eq("id", id);
  if (files?.length) await supabase.storage.from("materiali").remove(files.map((f) => f.storage_path));
  revalidatePath("/docente/lezioni");
  redirect("/docente/lezioni");
}

export async function registerLessonFile(lessonId: string, meta: UploadedMeta): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  if (!meta.path.startsWith(`lezioni/${lessonId}/`)) return { ok: false, error: "Percorso del file non valido." };
  const { error } = await supabase.from("lesson_files").insert({
    lesson_id: lessonId,
    storage_path: meta.path,
    file_name: meta.name.slice(0, 200),
    size_bytes: meta.size,
    mime_type: meta.type || null,
  });
  if (error) return { ok: false, error: "Registrazione del file non riuscita." };
  revalidatePath(`/docente/lezioni/${lessonId}`);
  return { ok: true };
}

export async function removeLessonFile(fileId: string): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { data: f } = await supabase.from("lesson_files").select("lesson_id, storage_path").eq("id", fileId).maybeSingle();
  if (!f) return { ok: false, error: "File non trovato." };
  await supabase.from("lesson_files").delete().eq("id", fileId);
  await supabase.storage.from("materiali").remove([f.storage_path]);
  revalidatePath(`/docente/lezioni/${f.lesson_id}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Amministrazione                                                    */
/* ------------------------------------------------------------------ */

function cents(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim().replace(/\./g, "").replace(",", ".");
  if (!s) return null;
  const n = Math.round(Number(s) * 100);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export async function savePackage(id: string | null, formData: FormData): Promise<ActionResult & { id?: string }> {
  const { supabase } = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const price = cents(formData.get("price"));
  const promo = cents(formData.get("promo_price"));

  if (!title || !slug) return { ok: false, error: "Titolo e indirizzo della pagina sono obbligatori." };
  if (price == null || Number.isNaN(price)) return { ok: false, error: "Prezzo non valido." };
  if (Number.isNaN(promo)) return { ok: false, error: "Prezzo promozionale non valido." };
  if (promo != null && promo >= price) return { ok: false, error: "Il prezzo promozionale deve essere inferiore al prezzo pieno." };

  const date = (k: string) => String(formData.get(k) ?? "") || null;
  const row = {
    title,
    slug,
    tagline: String(formData.get("tagline") ?? "").trim(),
    description: String(formData.get("description") ?? ""),
    period_label: String(formData.get("period_label") ?? "").trim(),
    starts_on: date("starts_on"),
    ends_on: date("ends_on"),
    access_until: date("access_until"),
    price_cents: price,
    promo_price_cents: promo,
    promo_label: String(formData.get("promo_label") ?? "").trim() || null,
    promo_until: fromLocalInput(String(formData.get("promo_until") ?? "")),
    features: String(formData.get("features") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    highlight: formData.get("highlight") === "on",
    active: formData.get("active") === "on",
    sort: Number(formData.get("sort")) || 0,
  };

  if (id) {
    const { error } = await supabase.from("packages").update(row).eq("id", id);
    if (error) return { ok: false, error: error.code === "23505" ? "Esiste già un corso con questo indirizzo." : "Salvataggio non riuscito." };
  } else {
    const { data, error } = await supabase.from("packages").insert(row).select("id").single();
    if (error || !data) return { ok: false, error: error?.code === "23505" ? "Esiste già un corso con questo indirizzo." : "Creazione non riuscita." };
    id = data.id;
  }
  revalidatePath("/");
  revalidatePath("/docente/pacchetti");
  return { ok: true, id: id!, message: "Corso salvato." };
}

export async function setRole(userId: string, role: Role): Promise<ActionResult> {
  const { supabase, user } = await requireAdmin();
  if (userId === user.id) return { ok: false, error: "Non puoi modificare il tuo ruolo." };
  if (!["student", "teacher", "admin"].includes(role)) return { ok: false, error: "Ruolo non valido." };
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { ok: false, error: "Modifica non riuscita." };
  revalidatePath("/docente/utenti");
  return { ok: true };
}

/** Iscrizione manuale (bonifico, rate, borse di studio). */
export async function manualEnroll(userId: string, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const packageId = String(formData.get("package_id") ?? "");
  const amount = cents(formData.get("amount")) ?? 0;
  if (!packageId) return { ok: false, error: "Scegli il corso." };
  const { data: pkg } = await supabase.from("packages").select("access_until").eq("id", packageId).single();
  const { error } = await supabase.from("enrollments").insert({
    user_id: userId,
    package_id: packageId,
    status: "active",
    amount_cents: Number.isNaN(amount) ? 0 : amount,
    ends_at: pkg?.access_until ? new Date(`${pkg.access_until}T23:59:59+01:00`).toISOString() : null,
  });
  if (error) return { ok: false, error: "Iscrizione non riuscita." };
  revalidatePath(`/docente/discenti/${userId}`);
  return { ok: true, message: "Iscrizione attivata." };
}

export async function setEnrollmentStatus(enrollmentId: string, status: "active" | "expired" | "refunded"): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("enrollments").update({ status }).eq("id", enrollmentId).select("user_id").single();
  if (error || !data) return { ok: false, error: "Modifica non riuscita." };
  revalidatePath(`/docente/discenti/${data.user_id}`);
  return { ok: true };
}

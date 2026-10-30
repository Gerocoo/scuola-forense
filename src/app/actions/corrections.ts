"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, isStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { creditBalance, refundCredits, spendCredits } from "@/lib/credits";
import { hasArchiveAccess } from "@/lib/archive";
import { sendPush } from "@/lib/push";
import type { ActionResult } from "@/lib/types";

/** Docente con meno elaborati in attesa di correzione (a parità, il primo in ordine di nome). */
async function pickTeacher() {
  const admin = createAdminClient();
  const { data: teachers } = await admin.from("profiles").select("id, role, full_name").in("role", ["teacher", "admin"]).order("full_name");
  if (!teachers?.length) return null;
  const pool = teachers.some((t) => t.role === "teacher") ? teachers.filter((t) => t.role === "teacher") : teachers;
  const { data: load } = await admin.from("assignments").select("teacher_id").in("status", ["consegnato", "in_correzione"]).in("teacher_id", pool.map((t) => t.id));
  const count = new Map<string, number>();
  for (const r of load ?? []) count.set(r.teacher_id, (count.get(r.teacher_id) ?? 0) + 1);
  return [...pool].sort((a, b) => (count.get(a.id) ?? 0) - (count.get(b.id) ?? 0))[0].id as string;
}

/** Il discente usa una correzione: si crea la traccia, poi carica il suo elaborato e lo consegna. */
export async function requestCorrection(formData: FormData) {
  const { supabase, user, profile } = await requireUser();
  if (isStaff(profile)) redirect("/docente");
  const admin = createAdminClient();
  const bal = await creditBalance(user.id);
  if (bal.corrections < 1) redirect("/area/correzioni?errore=crediti");

  const trackId = String(formData.get("track_id") ?? "");
  let title = String(formData.get("title") ?? "").trim().slice(0, 200);
  let instructions = String(formData.get("instructions") ?? "").trim().slice(0, 20000);
  let kind = String(formData.get("kind") ?? "parere") === "atto" ? "atto" : "parere";

  if (trackId) {
    const { data: t } = await admin.from("past_tracks").select("year, title, body, kind, free").eq("id", trackId).maybeSingle();
    if (!t) redirect("/area/correzioni?errore=traccia");
    if (!t.free && !(await hasArchiveAccess(supabase))) redirect("/area/correzioni?errore=archivio");
    title = `${t.title} (${t.year})`;
    instructions = t.body;
    kind = t.kind;
  }
  if (!title) redirect("/area/correzioni?errore=titolo");

  const teacherId = await pickTeacher();
  if (!teacherId) redirect("/area/correzioni?errore=docenti");

  const { data: a, error } = await admin
    .from("assignments")
    .insert({ teacher_id: teacherId, student_id: user.id, kind, title, instructions, on_request: true })
    .select("id")
    .single();
  if (error || !a) redirect("/area/correzioni?errore=1");
  const ok = await spendCredits(user.id, "corrections", 1, { assignment_id: a.id, note: title });
  if (!ok) {
    await admin.from("assignments").delete().eq("id", a.id);
    redirect("/area/correzioni?errore=crediti");
  }
  await sendPush([teacherId], { title: "Nuova correzione richiesta", body: `${profile.full_name || "Un discente"}: ${title}`.slice(0, 140), url: "/docente/esercitazioni" }).catch(() => {});
  revalidatePath("/area/correzioni");
  redirect(`/area/esercitazioni/${a.id}?nuova=1`);
}

/** Annulla una richiesta non ancora consegnata: la correzione torna disponibile. */
export async function cancelCorrection(assignmentId: string): Promise<ActionResult> {
  const { user } = await requireUser();
  const admin = createAdminClient();
  const { data: a } = await admin.from("assignments").select("id, student_id, status, on_request").eq("id", assignmentId).maybeSingle();
  if (!a || a.student_id !== user.id || !a.on_request) return { ok: false, error: "Richiesta non trovata." };
  if (a.status !== "assegnato") return { ok: false, error: "L'elaborato è già stato consegnato." };
  await refundCredits({ assignment_id: a.id });
  await admin.from("assignments").delete().eq("id", a.id);
  revalidatePath("/area/correzioni");
  return { ok: true, message: "Richiesta annullata: la correzione è di nuovo disponibile." };
}

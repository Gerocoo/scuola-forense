"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailLayout, escapeHtml, notify } from "@/lib/notify";
import { siteUrl } from "@/lib/stripe";
import type { ActionResult, UploadedMeta } from "@/lib/types";

/** Registra un file di svolgimento già caricato nello storage dal browser. */
export async function registerSubmissionFile(assignmentId: string, meta: UploadedMeta): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!meta.path.startsWith(`svolgimenti/${assignmentId}/`)) return { ok: false, error: "Percorso del file non valido." };

  const { error } = await supabase.from("assignment_files").insert({
    assignment_id: assignmentId,
    role: "svolgimento",
    uploaded_by: user.id,
    storage_path: meta.path,
    file_name: meta.name.slice(0, 200),
    size_bytes: meta.size,
    mime_type: meta.type || null,
  });

  if (error) {
    console.error("[registerSubmissionFile]", error);
    // il file nello storage resterebbe orfano: lo rimuoviamo
    await supabase.storage.from("materiali").remove([meta.path]);
    return { ok: false, error: "Non è possibile aggiungere file: l'esercitazione è già in correzione." };
  }
  revalidatePath(`/area/esercitazioni/${assignmentId}`);
  return { ok: true };
}

export async function removeSubmissionFile(fileId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data: file } = await supabase
    .from("assignment_files")
    .select("id, assignment_id, storage_path, role")
    .eq("id", fileId)
    .maybeSingle();
  if (!file || file.role !== "svolgimento") return { ok: false, error: "File non trovato." };

  const { error, count } = await supabase.from("assignment_files").delete({ count: "exact" }).eq("id", fileId);
  if (error || !count) return { ok: false, error: "Non puoi più rimuovere questo file: è già in correzione." };

  await supabase.storage.from("materiali").remove([file.storage_path]);

  // Se non resta nessun file, l'esercitazione torna "da svolgere".
  const { count: left } = await supabase
    .from("assignment_files")
    .select("id", { count: "exact", head: true })
    .eq("assignment_id", file.assignment_id)
    .eq("role", "svolgimento");
  if (!left) {
    await createAdminClient()
      .from("assignments")
      .update({ status: "assegnato", submitted_at: null })
      .eq("id", file.assignment_id)
      .eq("status", "consegnato");
  }

  revalidatePath(`/area/esercitazioni/${file.assignment_id}`);
  return { ok: true };
}

export async function submitAssignment(assignmentId: string): Promise<ActionResult> {
  const { supabase, profile } = await requireUser();

  const { data: before } = await supabase.from("assignments").select("status, title, teacher_id").eq("id", assignmentId).maybeSingle();
  const { error } = await supabase.rpc("submit_assignment", { aid: assignmentId });
  if (error) return { ok: false, error: error.message };

  // Notifica al docente solo alla prima consegna.
  if (before && before.status === "assegnato") {
    const { data: teacher } = await createAdminClient().from("profiles").select("email").eq("id", before.teacher_id).single();
    if (teacher?.email) {
      await notify({
        to: teacher.email,
        subject: `Elaborato consegnato: ${before.title}`,
        html: emailLayout(
          "Nuovo elaborato da correggere",
          `<p><strong>${escapeHtml(profile.full_name || profile.email)}</strong> ha consegnato <strong>${escapeHtml(before.title)}</strong>.</p>`,
          { label: "Apri l'elaborato", href: `${siteUrl()}/docente/esercitazioni/${assignmentId}` },
        ),
      });
    }
  }

  revalidatePath(`/area/esercitazioni/${assignmentId}`);
  revalidatePath("/area/esercitazioni");
  revalidatePath("/area");
  return { ok: true, message: "Elaborato consegnato." };
}

export async function updateProfile(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const full_name = String(formData.get("full_name") ?? "").trim().slice(0, 120);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40) || null;
  if (!full_name) return { ok: false, error: "Inserisci nome e cognome." };

  const subj = String(formData.get("exam_subject") ?? "");
  const exam_subject = ["civile", "penale", "amministrativo"].includes(subj) ? subj : null;
  const { error } = await supabase
    .from("profiles")
    .update(formData.has("exam_subject") ? { full_name, phone, exam_subject } : { full_name, phone })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Salvataggio non riuscito." };
  revalidatePath("/area", "layout");
  revalidatePath("/docente", "layout");
  return { ok: true, message: "Profilo aggiornato." };
}

export async function bookLesson(lessonId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("book_lesson", { lid: lessonId });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/area/lezioni/${lessonId}`);
  revalidatePath("/area/calendario");
  return { ok: true, message: "Posto prenotato. Ti mandiamo un promemoria il giorno prima." };
}

export async function cancelBooking(lessonId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("cancel_booking", { lid: lessonId });
  if (error) return { ok: false, error: "Annullamento non riuscito." };
  revalidatePath(`/area/lezioni/${lessonId}`);
  revalidatePath("/area/calendario");
  return { ok: true, message: "Prenotazione annullata." };
}

export async function saveLessonNote(lessonId: string, body: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("lesson_notes").upsert({
    lesson_id: lessonId,
    user_id: user.id,
    body: body.slice(0, 50000),
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "Appunti non salvati. Controlla la connessione." };
  return { ok: true };
}

/** Salva il progresso di visione: i tratti visti si sommano, non si perdono mai. */
export async function saveVideoProgress(
  lessonId: string,
  buckets: string,
  position: number,
  duration: number | null,
): Promise<{ ok: boolean; percent: number; completed: boolean; justCompleted: boolean }> {
  const { supabase, user } = await requireUser();
  const { BUCKETS, EMPTY_BUCKETS, countBuckets, mergeBuckets } = await import("@/lib/progress");
  if (!/^[01]+$/.test(buckets) || buckets.length !== BUCKETS) return { ok: false, percent: 0, completed: false, justCompleted: false };

  const { data: prev } = await supabase
    .from("lesson_progress")
    .select("buckets, completed_at")
    .eq("lesson_id", lessonId)
    .eq("user_id", user.id)
    .maybeSingle();

  const merged = mergeBuckets(prev?.buckets ?? EMPTY_BUCKETS, buckets);
  const percent = Math.round((countBuckets(merged) / BUCKETS) * 100);
  const completedAt = prev?.completed_at ?? (percent >= 100 ? new Date().toISOString() : null);

  const { error } = await supabase.from("lesson_progress").upsert({
    lesson_id: lessonId,
    user_id: user.id,
    buckets: merged,
    percent,
    position_seconds: Math.max(0, Math.floor(position)),
    duration_seconds: duration ? Math.floor(duration) : null,
    completed_at: completedAt,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, percent, completed: !!completedAt, justCompleted: false };

  const justCompleted = !prev?.completed_at && !!completedAt;
  if (justCompleted) {
    revalidatePath("/area/lezioni");
    revalidatePath("/area");
  }
  return { ok: true, percent, completed: !!completedAt, justCompleted };
}

/* ---------- foto profilo ---------- */

/** Carica la foto profilo (già ridimensionata nel browser) nell'archivio pubblico delle foto. */
export async function uploadAvatar(formData: FormData): Promise<ActionResult & { url?: string }> {
  const { user } = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Scegli un'immagine." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { ok: false, error: "Formato non supportato: usa JPG o PNG." };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: "Immagine troppo grande." };

  const admin = createAdminClient();
  const path = `${user.id}/${Date.now()}.jpg`;
  const { error } = await admin.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, error: "Caricamento non riuscito. Riprova." };

  const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
  await admin.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", user.id);

  // elimina le foto precedenti
  const { data: old } = await admin.storage.from("avatars").list(user.id);
  const stale = (old ?? []).map((o) => `${user.id}/${o.name}`).filter((p) => p !== path);
  if (stale.length) await admin.storage.from("avatars").remove(stale);

  revalidatePath("/area", "layout");
  revalidatePath("/docente", "layout");
  return { ok: true, url: pub.publicUrl, message: "Foto aggiornata." };
}

export async function removeAvatar(): Promise<ActionResult> {
  const { user } = await requireUser();
  const admin = createAdminClient();
  const { data: old } = await admin.storage.from("avatars").list(user.id);
  if (old?.length) await admin.storage.from("avatars").remove(old.map((o) => `${user.id}/${o.name}`));
  await admin.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  revalidatePath("/area", "layout");
  revalidatePath("/docente", "layout");
  return { ok: true, message: "Foto rimossa." };
}

/* ---------- orale ---------- */

export async function saveQuizAttempt(topic: string | null, score: number, total: number): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!(total > 0 && score >= 0 && score <= total && total <= 50)) return { ok: false, error: "Dati non validi." };
  const { error } = await supabase.from("quiz_attempts").insert({ user_id: user.id, topic, score, total });
  if (error) return { ok: false, error: "Risultato non salvato." };
  revalidatePath("/area/orale");
  return { ok: true };
}

export async function bookOralSlot(slotId: string): Promise<ActionResult> {
  const { supabase, user, profile } = await requireUser();
  const { error } = await supabase.rpc("book_oral_slot", { sid: slotId });
  if (error) return { ok: false, error: error.message };
  const admin = createAdminClient();
  const { data: slot } = await admin.from("oral_slots").select("starts_at, meeting_url, teacher_id").eq("id", slotId).maybeSingle();
  if (slot) {
    const { data: t } = await admin.from("profiles").select("email, full_name").eq("id", slot.teacher_id).maybeSingle();
    const when = new Date(slot.starts_at).toLocaleString("it-IT", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Rome" });
    if (t?.email) {
      await notify({
        to: t.email,
        subject: `Simulazione d'orale prenotata: ${when}`,
        html: emailLayout("Nuova simulazione d'orale", `<p>${escapeHtml(profile.full_name || user.email || "Un discente")} ha prenotato la simulazione d'orale di <strong>${when}</strong>.</p>`, {
          label: "Vedi le prenotazioni",
          href: `${siteUrl()}/docente/orale`,
        }),
      });
    }
    if (user.email) {
      await notify({
        to: user.email,
        subject: `Simulazione d'orale confermata: ${when}`,
        html: emailLayout(
          "Simulazione d'orale confermata",
          `<p>Ti aspettiamo <strong>${when}</strong> con ${escapeHtml(t?.full_name || "il docente")}.</p>${slot.meeting_url ? `<p>Collegamento: <a href="${slot.meeting_url}">${escapeHtml(slot.meeting_url)}</a></p>` : ""}`,
          { label: "Apri la sezione Orale", href: `${siteUrl()}/area/orale` },
        ),
      });
    }
  }
  revalidatePath("/area/orale");
  return { ok: true, message: "Prenotazione confermata. Ti abbiamo mandato un'email." };
}

export async function cancelOralSlot(slotId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("cancel_oral_slot", { sid: slotId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/area/orale");
  return { ok: true, message: "Prenotazione annullata." };
}

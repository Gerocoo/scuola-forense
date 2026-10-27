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

  const { error } = await supabase.from("profiles").update({ full_name, phone }).eq("id", user.id);
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

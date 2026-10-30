"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailConfigured, emailLayout, escapeHtml, notify } from "@/lib/notify";
import { siteUrl } from "@/lib/stripe";
import { fromLocalInput, KIND_LABEL, dateTime } from "@/lib/format";
import { bunnyConfigured, createUpload, deleteVideo, getVideo } from "@/lib/bunny";
import { enrolledStudents, inBatches } from "@/lib/recipients";
import type { ActionResult, AssignmentKind, LessonKind, Role, UploadedMeta } from "@/lib/types";
import { cleanScores, totalOf } from "@/lib/grading";

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
  lessonId?: string | null;
  /** Esercizio di corso: va a tutti gli iscritti attivi e, in automatico, a chi si iscrive dopo. */
  packageId?: string | null;
  /** Simulazione d'esame a tempo: apertura e durata in minuti (la scadenza si calcola da sole). */
  timed?: { opensLocal: string; durationMin: number } | null;
  /** Cartella dei file caricati, se diversa dal batch (stessa traccia inviata a più corsi). */
  uploadBatchId?: string;
}): Promise<ActionResult & { firstId?: string; count?: number }> {
  const { supabase, user, profile } = await requireStaff();

  const title = input.title.trim().slice(0, 200);
  if (!title) return { ok: false, error: "Inserisci un titolo." };
  if (!KINDS.includes(input.kind)) return { ok: false, error: "Tipo non valido." };
  const folder = input.uploadBatchId && /^[0-9a-f-]{36}$/i.test(input.uploadBatchId) ? input.uploadBatchId : input.batchId;
  if (input.files.some((f) => !f.path.startsWith(`tracce/${folder}/`))) {
    return { ok: false, error: "Percorso dei file non valido." };
  }

  let due = fromLocalInput(input.dueLocal);
  let opensAt: string | null = null;
  if (input.timed) {
    opensAt = fromLocalInput(input.timed.opensLocal);
    const minutes = Math.round(Number(input.timed.durationMin));
    if (!opensAt) return { ok: false, error: "Indica data e ora di inizio della simulazione." };
    if (new Date(opensAt).getTime() < Date.now() - 60_000) return { ok: false, error: "L'inizio della simulazione è già passato." };
    if (!minutes || minutes < 15 || minutes > 24 * 60) return { ok: false, error: "Durata non valida." };
    due = new Date(new Date(opensAt).getTime() + minutes * 60_000).toISOString();
  }
  const timedCols = { opens_at: opensAt, timed: !!input.timed };

  if (input.packageId) {
    const { data: allowed } = await supabase.rpc("teaches_package", { pid: input.packageId });
    if (!allowed) return { ok: false, error: "Non sei tra i docenti di questo corso." };
    const { error: ceErr } = await supabase.from("course_exercises").insert({
      id: input.batchId,
      package_id: input.packageId,
      teacher_id: user.id,
      kind: input.kind,
      title,
      instructions: input.instructions.trim().slice(0, 20000),
      due_at: due,
      lesson_id: input.lessonId || null,
      files: input.files,
      ...timedCols,
    });
    if (ceErr) {
      console.error("[createAssignments course]", ceErr);
      return { ok: false, error: "Creazione non riuscita. Riprova." };
    }
    const nowIso = new Date().toISOString();
    const { data: enr } = await supabase
      .from("enrollments")
      .select("user_id, ends_at")
      .eq("package_id", input.packageId)
      .eq("status", "active");
    input.studentIds = [...new Set((enr ?? []).filter((e) => !e.ends_at || e.ends_at > nowIso).map((e) => e.user_id as string))];
    revalidatePath(`/docente/corsi/${input.packageId}`);
    if (!input.studentIds.length) return { ok: true, count: 0, message: "Esercizio salvato: lo riceveranno gli iscritti del corso." };
  }

  if (!input.studentIds.length) return { ok: false, error: "Scegli almeno un discente." };
  const rows = input.studentIds.map((sid) => ({
    batch_id: input.batchId,
    teacher_id: user.id,
    student_id: sid,
    kind: input.kind,
    title,
    instructions: input.instructions.trim().slice(0, 20000),
    due_at: due,
    lesson_id: input.lessonId || null,
    package_id: input.packageId || null,
    ...timedCols,
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
        subject: opensAt ? `Simulazione d'esame: ${title}` : `Nuova traccia: ${title}`,
        html: opensAt
          ? emailLayout(
              "Simulazione d'esame in calendario",
              `<p>${escapeHtml(profile.full_name || "Il docente")} ha fissato la simulazione <strong>${escapeHtml(title)}</strong> (${KIND_LABEL[input.kind].toLowerCase()}).</p>
               <p>La traccia si apre <strong>${dateTime(opensAt)}</strong> e va consegnata entro <strong>${dateTime(due)}</strong>, come all'esame.</p>
               <p>Tieni a portata di mano i codici annotati.</p>`,
              { label: "Vedi la simulazione", href: `${siteUrl()}/area/esercitazioni/${a.id}` },
            )
          : emailLayout(
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
  return { ok: true, firstId: created.length === 1 && !input.packageId ? created[0].id : undefined, count: created.length };
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

export async function saveReview(assignmentId: string, feedback: string, grade: string, scores?: unknown): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const clean = cleanScores(scores);
  const { error } = await supabase.from("assignment_reviews").upsert({
    assignment_id: assignmentId,
    feedback: feedback.slice(0, 20000),
    grade: grade.trim().slice(0, 60) || null,
    scores: clean,
    total: totalOf(clean),
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "Salvataggio della bozza non riuscito." };
  return { ok: true, message: "Bozza salvata." };
}

export async function publishCorrection(assignmentId: string, feedback: string, grade: string, scores?: unknown): Promise<ActionResult> {
  const { supabase } = await requireStaff();

  const saved = await saveReview(assignmentId, feedback, grade, scores);
  if (!saved.ok) return saved;

  const [{ count: corrFiles }, { count: annotated }] = await Promise.all([
    supabase.from("assignment_files").select("id", { count: "exact", head: true }).eq("assignment_id", assignmentId).eq("role", "correzione"),
    supabase.from("assignment_annotations").select("file_id", { count: "exact", head: true }).eq("assignment_id", assignmentId),
  ]);
  if (!corrFiles && !annotated && !feedback.trim() && !totalOf(cleanScores(scores))) {
    return { ok: false, error: "Annota l'elaborato, compila la griglia o scrivi un commento prima di pubblicare." };
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
    booking_enabled: kind === "in_presenza" && formData.get("booking_enabled") === "on",
    sequential: kind === "registrata" ? formData.get("sequential") === "on" : false,
    capacity: kind === "in_presenza" ? Number(formData.get("capacity")) || null : null,
    package_ids: packageIds,
    published: formData.get("published") === "on",
    sort: Number(formData.get("sort")) || 0,
    ...(formData.has("product")
      ? {
          product: ["corso", "lezioni", "correzioni", "simulazione", "abbonamento", "accessorio"].includes(String(formData.get("product")))
            ? String(formData.get("product"))
            : "corso",
          credit_minutes: Math.min(6000, Math.max(0, Math.round(Number(formData.get("credit_minutes")) || 0))),
          credit_corrections: Math.min(100, Math.max(0, Math.round(Number(formData.get("credit_corrections")) || 0))),
          duration_days: formData.get("duration_days") ? Math.min(1100, Math.max(1, Math.round(Number(formData.get("duration_days"))))) : null,
          includes_archive: formData.get("includes_archive") === "on",
          includes_oral: formData.get("includes_oral") === "on",
        }
      : {}),
  };

  if (kind === "in_presenza" && !row.scheduled_at) return { ok: false, error: "Indica data e ora dell'incontro." };
  if (kind === "in_presenza" && row.scheduled_at && new Date(row.scheduled_at).getTime() < Date.now() - 5 * 60_000) {
    // una data passata è ammessa solo se l'incontro esisteva già con quella data (modifica di un incontro svolto)
    const { data: prev } = id ? await supabase.from("lessons").select("scheduled_at").eq("id", id).maybeSingle() : { data: null };
    const unchanged = prev?.scheduled_at && new Date(prev.scheduled_at).getTime() === new Date(row.scheduled_at).getTime();
    if (!unchanged) return { ok: false, error: "La data dell'incontro è già passata. Scegli una data futura." };
  }
  if (kind === "registrata" && row.published && !row.video_url) {
    const { data: existing } = id
      ? await supabase.from("lessons").select("bunny_video_id").eq("id", id).maybeSingle()
      : { data: null };
    if (!existing?.bunny_video_id) {
      return { ok: false, error: "Carica il video o inserisci un link prima di pubblicare. Puoi salvare come bozza e caricarlo dopo." };
    }
  }

  let wasPublished = false;
  if (id) {
    const { data: before } = await supabase.from("lessons").select("published").eq("id", id).maybeSingle();
    wasPublished = !!before?.published;
    const { error } = await supabase.from("lessons").update(row).eq("id", id);
    if (error) return { ok: false, error: "Salvataggio non riuscito." };
  } else {
    const { data, error } = await supabase.from("lessons").insert({ ...row, teacher_id: user.id }).select("id").single();
    if (error || !data) return { ok: false, error: "Creazione non riuscita." };
    id = data.id;
  }

  // Alla prima pubblicazione avvisa gli iscritti dei corsi scelti.
  let message = "Lezione salvata.";
  if (row.published && !wasPublished) {
    const students = await enrolledStudents(packageIds);
    const href = `${siteUrl()}/area/lezioni/${id}`;
    await inBatches(students, 5, (st) =>
      notify({
        to: st.email,
        subject: kind === "in_presenza" ? `Nuovo incontro in calendario: ${title}` : `Nuova lezione: ${title}`,
        html: emailLayout(
          kind === "in_presenza" ? "Nuovo incontro in presenza" : "Nuova lezione disponibile",
          kind === "in_presenza"
            ? `<p><strong>${escapeHtml(title)}</strong><br>${dateTime(row.scheduled_at)}${row.location ? `<br>${escapeHtml(row.location)}` : ""}</p>
               ${row.booking_enabled ? "<p>Per partecipare prenota il tuo posto dalla pagina dell'incontro.</p>" : ""}`
            : `<p>È online <strong>${escapeHtml(title)}</strong>${duration ? ` (${duration} minuti)` : ""}. Guardala quando vuoi dalla tua area.</p>`,
          { label: kind === "in_presenza" ? "Vedi l'incontro" : "Guarda la lezione", href },
        ),
      }),
    );
    message = students.length ? `Lezione pubblicata: ${students.length} discenti avvisati via email.` : "Lezione pubblicata.";
  }

  revalidatePath("/docente/lezioni");
  revalidatePath("/area/lezioni");
  return { ok: true, id: id!, message };
}

export async function deleteLesson(id: string) {
  const { supabase } = await requireStaff();
  const { data: files } = await supabase.from("lesson_files").select("storage_path").eq("lesson_id", id);
  const { data: l } = await supabase.from("lessons").select("bunny_video_id").eq("id", id).maybeSingle();
  if (l?.bunny_video_id) await deleteVideo(l.bunny_video_id);
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
/*  Video delle lezioni (Bunny Stream)                                 */
/* ------------------------------------------------------------------ */

export type VideoUpload = { endpoint: string; videoId: string; libraryId: string; expire: number; signature: string };

/** Prepara il caricamento: il file va dal browser direttamente a Bunny, senza passare dal nostro server. */
export async function startVideoUpload(lessonId: string): Promise<{ ok: true; upload: VideoUpload } | { ok: false; error: string }> {
  const { supabase } = await requireStaff();
  if (!bunnyConfigured()) return { ok: false, error: "Il caricamento video non è ancora configurato (Bunny Stream)." };

  const { data: l } = await supabase.from("lessons").select("title, bunny_video_id").eq("id", lessonId).maybeSingle();
  if (!l) return { ok: false, error: "Lezione non trovata." };

  try {
    const upload = await createUpload(l.title);
    if (l.bunny_video_id) await deleteVideo(l.bunny_video_id); // sostituzione del video
    await supabase.from("lessons").update({ bunny_video_id: upload.videoId, video_status: "uploading" }).eq("id", lessonId);
    return { ok: true, upload };
  } catch (e) {
    console.error("[startVideoUpload]", e);
    return { ok: false, error: "Impossibile avviare il caricamento. Riprova tra poco." };
  }
}

export async function refreshVideoStatus(lessonId: string, justUploaded = false): Promise<ActionResult & { status?: string }> {
  const { supabase } = await requireStaff();
  const { data: l } = await supabase.from("lessons").select("bunny_video_id, duration_min").eq("id", lessonId).maybeSingle();
  if (!l?.bunny_video_id) return { ok: false, error: "Nessun video caricato." };
  const v = await getVideo(l.bunny_video_id).catch(() => null);
  let status = v?.status ?? "error";
  if (justUploaded && status === "uploading") status = "processing";
  await supabase
    .from("lessons")
    .update({ video_status: status, duration_min: l.duration_min ?? v?.durationMin ?? null })
    .eq("id", lessonId);
  revalidatePath(`/docente/lezioni/${lessonId}`);
  return { ok: true, status };
}

export async function removeVideo(lessonId: string): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { data: l } = await supabase.from("lessons").select("bunny_video_id").eq("id", lessonId).maybeSingle();
  if (l?.bunny_video_id) await deleteVideo(l.bunny_video_id);
  await supabase.from("lessons").update({ bunny_video_id: null, video_status: "none" }).eq("id", lessonId);
  revalidatePath(`/docente/lezioni/${lessonId}`);
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
  const slug = String(formData.get("slug") || `${title} ${String(formData.get("period_label") ?? "")}`)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const price = cents(formData.get("price"));
  const promo = cents(formData.get("promo_price"));

  if (!title || !slug) return { ok: false, error: "Inserisci il nome del corso." };
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
    subject: ["civile", "penale", "amministrativo"].includes(String(formData.get("subject"))) ? String(formData.get("subject")) : null,
    promise_recorded_month: formData.get("promise_recorded_month") === "" ? null : Number(formData.get("promise_recorded_month")) || 0,
    promise_live_month: formData.get("promise_live_month") === "" ? null : Number(formData.get("promise_live_month")) || 0,
    promise_exercises_month: formData.get("promise_exercises_month") === "" ? null : Number(formData.get("promise_exercises_month")) || 0,
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

  // docenti del corso, se il modulo li contiene
  if (formData.get("teachers_present")) {
    const chosen = formData.getAll("teacher_ids").map(String).filter(Boolean);
    await supabase.from("package_teachers").delete().eq("package_id", id!).not("teacher_id", "in", `(${chosen.length ? chosen.join(",") : "00000000-0000-0000-0000-000000000000"})`);
    if (chosen.length) {
      await supabase.from("package_teachers").upsert(chosen.map((t) => ({ package_id: id!, teacher_id: t })), { onConflict: "package_id,teacher_id" });
    }
  }

  revalidatePath("/");
  revalidatePath("/docente/pacchetti");
  revalidatePath("/docente/corsi");
  revalidatePath(`/docente/corsi/${id}`);
  return { ok: true, id: id!, message: "Corso salvato." };
}

export async function setRole(userId: string, role: Role): Promise<ActionResult> {
  const { supabase, user } = await requireAdmin();
  if (userId === user.id) return { ok: false, error: "Non puoi modificare il tuo ruolo." };
  if (!["student", "teacher", "admin"].includes(role)) return { ok: false, error: "Ruolo non valido." };
  const { data: target } = await supabase.from("profiles").select("is_super").eq("id", userId).maybeSingle();
  if (target?.is_super) return { ok: false, error: "Il ruolo del super amministratore non si può modificare." };
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { ok: false, error: "Modifica non riuscita." };
  revalidatePath("/docente/utenti");
  return { ok: true };
}

/** Iscrizione manuale (bonifico, rate, borse di studio). */
const METHODS = ["bonifico", "contanti", "pos", "gratuito", "altro"] as const;

function billingFrom(formData: FormData) {
  const g = (k: string) => String(formData.get(`b_${k}`) ?? "").trim().slice(0, 200);
  const b = {
    name: g("name"),
    tax_code: g("tax_code").toUpperCase(),
    vat_number: g("vat_number"),
    address: g("address"),
    postal_code: g("postal_code"),
    city: g("city"),
    province: g("province").toUpperCase(),
    country: (g("country") || "IT").toUpperCase(),
    email: g("email"),
    sdi: g("sdi").toUpperCase(),
    pec: g("pec"),
  };
  return Object.values(b).some((v) => v && v !== "IT") ? b : null;
}

/**
 * Iscrizione gestita dalla segreteria. Se il pagamento è già arrivato l'iscrizione è subito attiva;
 * altrimenti resta "in attesa di pagamento" (nessun accesso) finché non viene segnata come pagata.
 */
export async function manualEnroll(userId: string, formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireAdmin();
  const packageId = String(formData.get("package_id") ?? "");
  const amount = cents(formData.get("amount")) ?? 0;
  const method = String(formData.get("payment_method") ?? "bonifico");
  const paidNow = formData.get("paid") === "on" || method === "gratuito";
  if (!packageId) return { ok: false, error: "Scegli il corso." };
  if (!METHODS.includes(method as (typeof METHODS)[number])) return { ok: false, error: "Metodo di pagamento non valido." };
  if (Number.isNaN(amount)) return { ok: false, error: "Importo non valido." };
  const paidDate = String(formData.get("paid_at") ?? "");
  const { data: pkg } = await supabase.from("packages").select("access_until, title, duration_days").eq("id", packageId).single();
  const { error } = await supabase.from("enrollments").insert({
    user_id: userId,
    package_id: packageId,
    status: paidNow ? "active" : "pending",
    amount_cents: amount,
    ends_at: pkg?.duration_days
      ? new Date(Date.now() + pkg.duration_days * 86400000).toISOString()
      : pkg?.access_until
        ? new Date(`${pkg.access_until}T23:59:59+01:00`).toISOString()
        : null,
    payment_method: method,
    payment_reference: String(formData.get("payment_reference") ?? "").trim().slice(0, 120) || null,
    payment_note: String(formData.get("payment_note") ?? "").trim().slice(0, 500) || null,
    paid_at: paidNow ? (paidDate ? new Date(`${paidDate}T12:00:00+01:00`).toISOString() : new Date().toISOString()) : null,
    recorded_by: user.id,
    billing: billingFrom(formData),
  });
  if (error) return { ok: false, error: "Iscrizione non riuscita." };
  if (paidNow) {
    await sendEnrollmentActive(userId, pkg?.title ?? "il corso");
    const { data: last } = await supabase.from("enrollments").select("id").eq("user_id", userId).eq("package_id", packageId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (last) {
      const { grantPurchaseCredits } = await import("@/lib/credits");
      await grantPurchaseCredits(last.id);
    }
    if (last && amount > 0) {
      const { issueInvoice } = await import("@/lib/invoices");
      await issueInvoice(last.id);
    }
  }
  revalidatePath(`/docente/discenti/${userId}`);
  revalidatePath("/docente/pagamenti");
  return { ok: true, message: paidNow ? "Iscrizione attivata." : "Iscrizione registrata in attesa del bonifico: si attiva quando la segni come pagata." };
}

/** Il bonifico è arrivato: l'iscrizione si attiva e il discente riceve l'email (e gli esercizi del corso). */
export async function markEnrollmentPaid(enrollmentId: string, formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireAdmin();
  const paidDate = String(formData.get("paid_at") ?? "");
  const amount = cents(formData.get("amount"));
  const { data: e } = await supabase.from("enrollments").select("user_id, status, package:packages(title)").eq("id", enrollmentId).maybeSingle();
  if (!e) return { ok: false, error: "Iscrizione non trovata." };
  const patch: Record<string, unknown> = {
    status: "active",
    paid_at: paidDate ? new Date(`${paidDate}T12:00:00+01:00`).toISOString() : new Date().toISOString(),
    payment_reference: String(formData.get("payment_reference") ?? "").trim().slice(0, 120) || null,
    recorded_by: user.id,
  };
  if (amount != null && !Number.isNaN(amount)) patch.amount_cents = amount;
  const { error } = await supabase.from("enrollments").update(patch).eq("id", enrollmentId);
  if (error) return { ok: false, error: "Modifica non riuscita." };
  const pk = (Array.isArray(e.package) ? e.package[0] : e.package) as unknown as { title?: string } | null;
  const title = pk?.title ?? "il corso";
  if (e.status !== "active") await sendEnrollmentActive(e.user_id, title);
  const { grantPurchaseCredits } = await import("@/lib/credits");
  await grantPurchaseCredits(enrollmentId);
  const { issueInvoice } = await import("@/lib/invoices");
  await issueInvoice(enrollmentId);
  revalidatePath(`/docente/discenti/${e.user_id}`);
  revalidatePath("/docente/pagamenti");
  return { ok: true, message: "Pagamento registrato: iscrizione attiva." };
}

/** Avvisa chi ha frequentato un corso di un prodotto o di un'offerta (es. Orale scontato dopo i risultati). */
export async function announceToAlumni(packageId: string, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const admin = createAdminClient();
  const { data: pkg } = await supabase.from("packages").select("id, slug, title, tagline, active, product").eq("id", packageId).maybeSingle();
  if (!pkg) return { ok: false, error: "Prodotto non trovato." };
  if (!pkg.active) return { ok: false, error: "Metti prima il prodotto in vendita." };
  const message = String(formData.get("message") ?? "").trim().slice(0, 1500);
  const key = `annuncio:${pkg.id}`;
  const { data: last } = await admin.from("app_settings").select("value").eq("key", key).maybeSingle();
  const lastAt = (last?.value as { at?: string } | null)?.at;
  if (lastAt && Date.now() - new Date(lastAt).getTime() < 20 * 3600000) return { ok: false, error: "Hai già inviato questo avviso nelle ultime 24 ore." };

  // ex corsisti: un corso vero (attivo o concluso), che non hanno già questo prodotto
  const { data: rows } = await admin
    .from("enrollments")
    .select("user_id, package_id, status, package:packages!inner(slug, product)")
    .in("status", ["active", "expired"]);
  const alumni = new Set<string>();
  const owners = new Set<string>();
  for (const r of (rows ?? []) as unknown as { user_id: string; package_id: string; status: string; package: { slug: string; product: string } }[]) {
    if (r.package_id === pkg.id && r.status === "active") owners.add(r.user_id);
    if (r.package.product === "corso" && r.package.slug !== "prova-gratuita") alumni.add(r.user_id);
  }
  const targets = [...alumni].filter((u) => !owners.has(u));
  if (!targets.length) return { ok: false, error: "Nessun ex corsista da avvisare." };
  const { data: people } = await admin.from("profiles").select("id, email, full_name").in("id", targets).eq("role", "student");
  const href =
    pkg.slug === "modulo-orale" ? `${siteUrl()}/area/orale` : pkg.slug === "archivio-tracce" ? `${siteUrl()}/area/archivio` : pkg.product === "corso" ? `${siteUrl()}/corsi/${pkg.slug}` : `${siteUrl()}/servizi`;
  await inBatches(people ?? [], 5, (p: { email: string; full_name: string | null }) =>
    notify({
      to: p.email,
      subject: pkg.title,
      html: emailLayout(
        pkg.title,
        `<p>${p.full_name ? `Ciao ${escapeHtml(p.full_name.split(" ")[0])}, ` : ""}${escapeHtml(message || pkg.tagline || "")}</p>`,
        { label: "Scopri di più", href },
      ),
    }),
  );
  await admin.from("app_settings").upsert({ key, value: { at: new Date().toISOString(), sent: (people ?? []).length }, updated_at: new Date().toISOString() });
  return { ok: true, message: `Avviso inviato a ${(people ?? []).length} ex corsisti.` };
}

/** Dati di fatturazione di un'iscrizione (per bonifici o correzioni). */
export async function saveBilling(enrollmentId: string, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const billing = billingFrom(formData);
  const { error } = await supabase.from("enrollments").update({ billing }).eq("id", enrollmentId);
  if (error) return { ok: false, error: "Salvataggio non riuscito." };
  revalidatePath("/docente/pagamenti");
  return { ok: true, message: "Dati salvati." };
}

/** Emette o riprova la fattura elettronica di un'iscrizione pagata. */
export async function retryInvoice(enrollmentId: string): Promise<ActionResult> {
  await requireAdmin();
  const { issueInvoice, invoicingConfigured } = await import("@/lib/invoices");
  if (!invoicingConfigured()) return { ok: false, error: "Fatture in Cloud non è collegato: imposta FIC_ACCESS_TOKEN e FIC_COMPANY_ID su Vercel." };
  const res = await issueInvoice(enrollmentId, { retry: true });
  revalidatePath("/docente/pagamenti");
  if (res.ok) return { ok: true, message: "Fattura emessa." };
  if (res.reason === "already") return { ok: false, error: "La fattura è già stata emessa o è in corso." };
  if (res.reason === "nothing") return { ok: false, error: "Iscrizione non pagata o gratuita: nessuna fattura da emettere." };
  return { ok: false, error: "Fattura non emessa: vedi il dettaglio dell'errore." };
}

async function sendEnrollmentActive(userId: string, title: string) {
  const { data: p } = await createAdminClient().from("profiles").select("email, full_name").eq("id", userId).maybeSingle();
  if (!p?.email) return;
  await notify({
    to: p.email,
    subject: `Iscrizione attiva: ${title}`,
    html: emailLayout(
      "La tua iscrizione è attiva",
      `<p>${p.full_name ? `Ciao ${escapeHtml(p.full_name.split(" ")[0])}, a` : "A"}bbiamo registrato il pagamento: da ora hai accesso a <strong>${escapeHtml(title)}</strong>.</p><p>Nella tua area trovi lezioni, tracce e calendario degli incontri.</p>`,
      { label: "Entra nella tua area", href: `${siteUrl()}/area` },
    ),
  });
}

export async function setEnrollmentStatus(enrollmentId: string, status: "active" | "expired" | "refunded" | "pending"): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("enrollments").update({ status }).eq("id", enrollmentId).select("user_id").single();
  if (error || !data) return { ok: false, error: "Modifica non riuscita." };
  revalidatePath(`/docente/discenti/${data.user_id}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Canale YouTube                                                      */
/* ------------------------------------------------------------------ */

export async function disconnectYoutube(): Promise<ActionResult> {
  await requireStaff();
  const { revoke } = await import("@/lib/youtube");
  await revoke();
  revalidatePath("/docente/impostazioni");
  return { ok: true, message: "Canale scollegato." };
}

/* ------------------------------------------------------------------ */
/*  Inviti docenti                                                     */
/* ------------------------------------------------------------------ */

/**
 * Invita un docente per email. Se la persona è già registrata cambia subito il ruolo;
 * altrimenti l'invito resta in attesa e diventa docente appena si registra (Google o email).
 */
export async function inviteTeacher(formData: FormData): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role: Role = formData.get("role") === "admin" ? "admin" : "teacher";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Scrivi un indirizzo email valido." };

  const packageId = String(formData.get("package_id") ?? "") || null;
  const label = role === "admin" ? "amministratore" : "docente";
  const { data: existing } = await supabase.from("profiles").select("id, role, full_name").ilike("email", email).maybeSingle();

  if (existing) {
    if (existing.id === user.id && !packageId) return { ok: false, error: "Questo è il tuo account." };
    // chi è già docente o amministratore mantiene il suo ruolo; un discente diventa docente
    if (existing.role === "student") {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", existing.id);
      if (error) return { ok: false, error: "Modifica non riuscita." };
    } else if (!packageId && existing.role === role) {
      return { ok: true, message: `${existing.full_name || email} è già ${label}.` };
    } else if (!packageId && existing.role !== role) {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", existing.id);
      if (error) return { ok: false, error: "Modifica non riuscita." };
    }
    if (packageId) {
      await supabase.from("package_teachers").upsert({ package_id: packageId, teacher_id: existing.id }, { onConflict: "package_id,teacher_id" });
      revalidatePath(`/docente/corsi/${packageId}`);
    }
  } else {
    const { data: prev } = await supabase.from("teacher_invites").select("package_ids").eq("email", email).maybeSingle();
    const pkgs = [...new Set([...((prev?.package_ids as string[] | undefined) ?? []), ...(packageId ? [packageId] : [])])];
    const { error } = await supabase
      .from("teacher_invites")
      .upsert({ email, role, invited_by: user.id, package_ids: pkgs }, { onConflict: "email" });
    if (error) return { ok: false, error: "Invito non salvato. Riprova." };
    if (packageId) revalidatePath(`/docente/corsi/${packageId}`);
  }

  const site = siteUrl();
  const href = existing ? `${site}/accedi` : `${site}/registrati`;
  await notify({
    to: email,
    subject: `Sei stato invitato come ${label}`,
    html: emailLayout(
      `Benvenuto nella scuola`,
      `<p>${escapeHtml(profile.full_name || "La direzione")} ti ha aggiunto come <strong>${label}</strong> sulla piattaforma.</p>
       <p>${existing ? "Accedi con il tuo account: troverai l'area docenti." : `Registrati con <strong>questo indirizzo email</strong> (${escapeHtml(email)}), anche con il pulsante &laquo;Continua con Google&raquo;: l'area docenti si attiva da sola.`}</p>`,
      { label: existing ? "Accedi" : "Registrati", href },
    ),
  });

  revalidatePath("/docente/utenti");
  return {
    ok: true,
    message: existing
      ? packageId
        ? `${existing.full_name || email} è stato aggiunto ai docenti del corso.`
        : `${existing.full_name || email} ora è ${label}.`
      : `Invito registrato. Appena ${email} si registra diventa ${label}${packageId ? " di questo corso" : ""}.${emailConfigured() ? " Gli abbiamo inviato un'email." : " Mandagli tu il link: " + href}`,
  };
}

export async function revokeInvite(email: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("teacher_invites").delete().eq("email", email.toLowerCase());
  if (error) return { ok: false, error: "Non riuscito." };
  revalidatePath("/docente/utenti");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Gestione account (solo amministratori)                             */
/* ------------------------------------------------------------------ */

/** Cambia l'email di accesso di un utente (vale anche per l'accesso con password). */
export async function changeUserEmail(userId: string, formData: FormData): Promise<ActionResult> {
  const { profile: me } = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Scrivi un indirizzo email valido." };
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("is_super").eq("id", userId).maybeSingle();
  if (target?.is_super && !me.is_super) return { ok: false, error: "L'email del super amministratore non si può modificare." };
  const { error } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true });
  if (error) {
    return {
      ok: false,
      error: error.message.toLowerCase().includes("already") ? "Questa email è già usata da un altro account." : "Modifica non riuscita.",
    };
  }
  await admin.from("profiles").update({ email }).eq("id", userId);
  revalidatePath("/docente/utenti");
  revalidatePath(`/docente/discenti/${userId}`);
  return { ok: true, message: "Email aggiornata. Da ora accede con il nuovo indirizzo." };
}

/**
 * Elimina definitivamente un account. Per un discente spariscono iscrizioni, elaborati, correzioni,
 * messaggi e file. Per un docente, esercitazioni e conversazioni passano a chi lo elimina.
 */
export async function deleteUserAccount(userId: string): Promise<ActionResult> {
  const { user } = await requireAdmin();
  if (userId === user.id) return { ok: false, error: "Non puoi eliminare il tuo account da qui." };
  const admin = createAdminClient();

  const { data: target } = await admin.from("profiles").select("id, role, is_super").eq("id", userId).maybeSingle();
  if (!target) return { ok: false, error: "Utente non trovato." };
  if (target.is_super) return { ok: false, error: "Il super amministratore non si può eliminare." };

  if (target.role !== "student") {
    const { error } = await admin.rpc("reassign_staff", { old_id: userId, new_id: user.id });
    if (error) return { ok: false, error: "Non è stato possibile trasferire le esercitazioni del docente." };
  }

  // file degli elaborati del discente (verranno eliminati insieme alle esercitazioni)
  const { data: files } = await admin
    .from("assignment_files")
    .select("storage_path, assignments!inner(student_id)")
    .eq("assignments.student_id", userId);
  const paths = (files ?? []).map((f: { storage_path: string }) => f.storage_path);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: "Eliminazione non riuscita. Riprova." };

  for (let i = 0; i < paths.length; i += 100) {
    await admin.storage.from("materiali").remove(paths.slice(i, i + 100));
  }

  revalidatePath("/docente/utenti");
  revalidatePath("/docente/discenti");
  return { ok: true, message: "Account eliminato." };
}


/* ------------------------------------------------------------------ */
/*  Corsi: docenti ed esercizi di corso                                */
/* ------------------------------------------------------------------ */

export async function addCourseTeacher(packageId: string, teacherId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!teacherId) return { ok: false, error: "Scegli un docente." };
  const { error } = await supabase.from("package_teachers").upsert({ package_id: packageId, teacher_id: teacherId }, { onConflict: "package_id,teacher_id" });
  if (error) return { ok: false, error: "Non riuscito." };
  revalidatePath(`/docente/corsi/${packageId}`);
  revalidatePath("/docente/corsi");
  return { ok: true };
}

export async function removeCourseTeacher(packageId: string, teacherId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("package_teachers").delete().eq("package_id", packageId).eq("teacher_id", teacherId);
  if (error) return { ok: false, error: "Non riuscito." };
  revalidatePath(`/docente/corsi/${packageId}`);
  revalidatePath("/docente/corsi");
  return { ok: true };
}

/** Ritira un esercizio di corso: non arriva più ai nuovi iscritti e sparisce a chi non l'ha ancora consegnato. */
export async function deleteCourseExercise(exerciseId: string): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { data: ce } = await supabase.from("course_exercises").select("package_id").eq("id", exerciseId).maybeSingle();
  if (!ce) return { ok: false, error: "Esercizio non trovato." };
  const { error } = await supabase.from("course_exercises").delete().eq("id", exerciseId);
  if (error) return { ok: false, error: "Non hai i permessi per questo corso." };
  await supabase.from("assignments").delete().eq("batch_id", exerciseId).eq("status", "assegnato");
  revalidatePath(`/docente/corsi/${ce.package_id}`);
  revalidatePath("/docente/esercitazioni");
  return { ok: true, message: "Esercizio ritirato." };
}

/* ------------------------------------------------------------------ */
/*  Correzione sul documento                                           */
/* ------------------------------------------------------------------ */

export async function saveAnnotations(fileId: string, data: unknown): Promise<ActionResult> {
  const { supabase, user } = await requireStaff();
  const json = JSON.stringify(data ?? {});
  if (json.length > 1_500_000) return { ok: false, error: "Troppe annotazioni su questo documento." };
  const { data: file } = await supabase.from("assignment_files").select("assignment_id").eq("id", fileId).maybeSingle();
  if (!file) return { ok: false, error: "File non trovato." };
  const { error } = await supabase.from("assignment_annotations").upsert(
    { file_id: fileId, assignment_id: file.assignment_id, data: JSON.parse(json), updated_by: user.id, updated_at: new Date().toISOString() },
    { onConflict: "file_id" },
  );
  if (error) return { ok: false, error: "Salvataggio non riuscito." };
  // aprire la correzione appena si inizia ad annotare
  await supabase.from("assignments").update({ status: "in_correzione" }).eq("id", file.assignment_id).eq("status", "consegnato");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Correzione collettiva                                              */
/* ------------------------------------------------------------------ */

export async function saveCollectiveReview(
  exerciseId: string,
  input: { solution: string; commonErrors: string; reviewUrl: string; files: UploadedMeta[]; publish: boolean },
): Promise<ActionResult> {
  const { supabase, profile } = await requireStaff();
  const { data: ce } = await supabase
    .from("course_exercises")
    .select("package_id, title, due_at, collective_published, solution_files")
    .eq("id", exerciseId)
    .maybeSingle();
  if (!ce) return { ok: false, error: "Esercizio non trovato." };
  if (input.files.some((f) => !f.path.startsWith(`soluzioni/${exerciseId}/`))) return { ok: false, error: "Percorso dei file non valido." };
  const url = input.reviewUrl.trim();
  if (url && !/^https?:\/\//i.test(url)) return { ok: false, error: "Il link deve iniziare con https://" };

  const { error } = await supabase
    .from("course_exercises")
    .update({
      solution: input.solution.slice(0, 40000),
      common_errors: input.commonErrors.slice(0, 20000),
      review_url: url || null,
      solution_files: input.files,
      collective_published: input.publish,
    })
    .eq("id", exerciseId);
  if (error) return { ok: false, error: "Salvataggio non riuscito." };

  // avviso ai discenti alla prima pubblicazione, se la scadenza è già passata
  const visibleNow = !ce.due_at || new Date(ce.due_at) < new Date();
  if (input.publish && !ce.collective_published && visibleNow) {
    const { data: rows } = await supabase.from("assignments").select("id, student_id").eq("batch_id", exerciseId);
    const ids = (rows ?? []).map((r) => r.student_id);
    if (ids.length) {
      const { data: people } = await createAdminClient().from("profiles").select("id, email").in("id", ids);
      await inBatches(people ?? [], 5, (p) => {
        const a = rows!.find((r) => r.student_id === p.id)!;
        return notify({
          to: p.email,
          subject: `Correzione collettiva: ${ce.title}`,
          html: emailLayout(
            "È disponibile la correzione collettiva",
            `<p>${escapeHtml(profile.full_name || "Il docente")} ha pubblicato la traccia svolta e gli errori più frequenti di <strong>${escapeHtml(ce.title)}</strong>.</p>`,
            { label: "Apri la correzione", href: `${siteUrl()}/area/esercitazioni/${a.id}` },
          ),
        });
      });
    }
  }

  revalidatePath(`/docente/corsi/${ce.package_id}`);
  return { ok: true, message: input.publish ? (visibleNow ? "Pubblicata: i discenti la vedono." : "Pubblicata: i discenti la vedranno dopo la scadenza.") : "Bozza salvata." };
}

/* ------------------------------------------------------------------ */
/*  Orale: domande del quiz e orari delle simulazioni                  */
/* ------------------------------------------------------------------ */

export async function saveQuizQuestion(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireStaff();
  const id = String(formData.get("id") ?? "") || null;
  const topic = String(formData.get("topic") ?? "");
  const question = String(formData.get("question") ?? "").trim().slice(0, 1000);
  // le risposte vuote si scartano, mantenendo l'indicazione di quella corretta
  const raw = formData.getAll("option").map((o) => String(o).trim().slice(0, 300));
  const chosen = Number(formData.get("correct"));
  const options = raw.filter(Boolean);
  const correct = raw[chosen] ? raw.slice(0, chosen).filter(Boolean).length : -1;
  const explanation = String(formData.get("explanation") ?? "").trim().slice(0, 2000);
  if (!["deontologia", "ordinamento", "previdenza"].includes(topic)) return { ok: false, error: "Scegli l'argomento." };
  if (!question) return { ok: false, error: "Scrivi la domanda." };
  if (options.length < 2) return { ok: false, error: "Servono almeno due risposte." };
  if (!(correct >= 0 && correct < options.length)) return { ok: false, error: "Indica la risposta corretta." };
  const row = { topic, question, options, correct, explanation };
  const { error } = id
    ? await supabase.from("quiz_questions").update(row).eq("id", id)
    : await supabase.from("quiz_questions").insert({ ...row, created_by: user.id });
  if (error) return { ok: false, error: "Salvataggio non riuscito." };
  revalidatePath("/docente/orale");
  return { ok: true, message: id ? "Domanda aggiornata." : "Domanda aggiunta." };
}

export async function deleteQuizQuestion(id: string): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
  if (error) return { ok: false, error: "Non riuscito." };
  revalidatePath("/docente/orale");
  return { ok: true };
}

export async function createOralSlots(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireStaff();
  const start = fromLocalInput(String(formData.get("starts_at") ?? ""));
  const duration = Number(formData.get("duration_min")) || 30;
  const count = Math.min(12, Math.max(1, Number(formData.get("count")) || 1));
  const url = String(formData.get("meeting_url") ?? "").trim() || null;
  if (!start) return { ok: false, error: "Indica data e ora." };
  if (new Date(start).getTime() < Date.now()) return { ok: false, error: "L'orario è già passato." };
  if (url && !/^https?:\/\//i.test(url)) return { ok: false, error: "Il link deve iniziare con https://" };
  // più orari consecutivi della stessa durata
  const rows = Array.from({ length: count }, (_, i) => ({
    teacher_id: user.id,
    starts_at: new Date(new Date(start).getTime() + i * duration * 60_000).toISOString(),
    duration_min: duration,
    meeting_url: url,
  }));
  const { error } = await supabase.from("oral_slots").insert(rows);
  if (error) return { ok: false, error: "Creazione non riuscita." };
  revalidatePath("/docente/orale");
  return { ok: true, message: count > 1 ? `${count} orari aggiunti.` : "Orario aggiunto." };
}

export async function deleteOralSlot(id: string): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { data: slot } = await supabase.from("oral_slots").select("booked_by, starts_at").eq("id", id).maybeSingle();
  const { error } = await supabase.from("oral_slots").delete().eq("id", id);
  if (error) return { ok: false, error: "Non riuscito." };
  if (slot?.booked_by) {
    const { data: s } = await createAdminClient().from("profiles").select("email").eq("id", slot.booked_by).maybeSingle();
    const when = new Date(slot.starts_at).toLocaleString("it-IT", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Rome" });
    if (s?.email) {
      await notify({
        to: s.email,
        subject: `Simulazione d'orale annullata: ${when}`,
        html: emailLayout("Simulazione d'orale annullata", `<p>Il docente ha annullato la simulazione di <strong>${when}</strong>. Puoi prenotare un altro orario.</p>`, {
          label: "Scegli un altro orario",
          href: `${siteUrl()}/area/orale`,
        }),
      });
    }
  }
  revalidatePath("/docente/orale");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Archivio tracce                                                    */
/* ------------------------------------------------------------------ */

export async function savePastTrack(input: {
  year: number;
  session: string;
  subject: string;
  kind: string;
  title: string;
  body: string;
  free?: boolean;
  file: UploadedMeta | null;
}): Promise<ActionResult> {
  const { supabase, user } = await requireStaff();
  const title = input.title.trim().slice(0, 300);
  if (!title) return { ok: false, error: "Inserisci un titolo." };
  if (!(input.year >= 1990 && input.year <= 2100)) return { ok: false, error: "Anno non valido." };
  if (!["civile", "penale", "amministrativo"].includes(input.subject)) return { ok: false, error: "Scegli la materia." };
  if (!["parere", "atto"].includes(input.kind)) return { ok: false, error: "Scegli il tipo di prova." };
  if (input.file && !input.file.path.startsWith("archivio/")) return { ok: false, error: "Percorso del file non valido." };
  if (!input.body.trim() && !input.file) return { ok: false, error: "Incolla il testo della traccia o allega il file." };
  const { error } = await supabase.from("past_tracks").insert({
    year: input.year,
    session: input.session.trim().slice(0, 80),
    subject: input.subject,
    kind: input.kind,
    title,
    body: input.body.slice(0, 40000),
    file: input.file,
    free: !!input.free,
    created_by: user.id,
  });
  if (error) return { ok: false, error: "Salvataggio non riuscito." };
  revalidatePath("/docente/archivio");
  revalidatePath("/area/archivio");
  return { ok: true, message: "Traccia aggiunta all'archivio." };
}

export async function setPastTrackFree(id: string, free: boolean): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("past_tracks").update({ free }).eq("id", id);
  if (error) return { ok: false, error: "Non riuscito." };
  revalidatePath("/docente/archivio");
  revalidatePath("/area/archivio");
  return { ok: true };
}

export async function deletePastTrack(id: string): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("past_tracks").delete().eq("id", id);
  if (error) return { ok: false, error: "Non riuscito." };
  revalidatePath("/docente/archivio");
  return { ok: true };
}

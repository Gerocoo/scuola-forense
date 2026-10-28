import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/AppShell";
import { FileList } from "@/components/app/FileList";
import { StatusBadge } from "@/components/app/StatusBadge";
import { AssignmentTimeline } from "@/components/app/AssignmentTimeline";
import { SubmissionPanel } from "./SubmissionPanel";
import { AnnotateButton, type Annotations } from "@/components/app/PdfAnnotator";
import { requireUser } from "@/lib/auth";
import { dateTime, KIND_LABEL } from "@/lib/format";
import type { Assignment, AssignmentFile, Profile, Review } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function EsercitazionePage({ params }: Props) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const { data: a } = await supabase.from("assignments").select("*").eq("id", id).eq("student_id", user.id).maybeSingle<Assignment>();
  if (!a) notFound();

  const [{ data: files }, { data: review }, { data: teacher }, { data: annotations }] = await Promise.all([
    supabase.from("assignment_files").select("*").eq("assignment_id", id).order("created_at").returns<AssignmentFile[]>(),
    supabase.from("assignment_reviews").select("*").eq("assignment_id", id).maybeSingle<Review>(),
    supabase.from("profiles").select("id, full_name, email").eq("id", a.teacher_id).maybeSingle<Pick<Profile, "id" | "full_name" | "email">>(),
    // visibili solo a correzione pubblicata (regola del database)
    supabase.from("assignment_annotations").select("file_id, data").eq("assignment_id", id).returns<{ file_id: string; data: Annotations }[]>(),
  ]);
  const annotated = (annotations ?? []).filter((x) =>
    Object.values(x.data?.pages ?? {}).some((p) => (p.strokes?.length ?? 0) + (p.notes?.length ?? 0) > 0),
  );

  const byRole = (r: AssignmentFile["role"]) => (files ?? []).filter((f) => f.role === r);
  const editable = a.status === "assegnato" || a.status === "consegnato";
  const late = a.status === "assegnato" && a.due_at && new Date(a.due_at) < new Date();
  const teacherName = teacher?.full_name || "il docente";

  return (
    <>
      <PageHeader
        back={{ href: "/area/esercitazioni", label: "Esercitazioni" }}
        title={a.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{KIND_LABEL[a.kind]} assegnato da {teacherName}</span>
            <StatusBadge status={a.status} />
          </span>
        }
        actions={
          teacher ? (
            <Link href={`/area/messaggi/${teacher.id}?esercitazione=${a.id}`} className="btn-secondary">
              Scrivi al docente
            </Link>
          ) : null
        }
      />

      <AssignmentTimeline assignment={a} />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-10">
          {/* La correzione, quando c'è, è la cosa più importante: va in cima */}
          {a.status === "corretto" && (
            <section aria-labelledby="correzione" className="rounded-[var(--radius-panel)] border border-ceralacca/30 bg-surface p-4 sm:p-6">
              <h2 id="correzione" className="text-lg font-semibold text-ceralacca">Correzione del docente</h2>
              {review?.grade && (
                <p className="mt-3 text-[15px]">
                  Giudizio: <strong className="text-[18px]">{review.grade}</strong>
                </p>
              )}
              {review?.feedback && (
                <div className="prose-legal mt-4 whitespace-pre-wrap break-words border-l-2 border-ceralacca/40 pl-4">{review.feedback}</div>
              )}
              {annotated.length > 0 && (
                <ul className="mt-6 space-y-2">
                  {annotated.map((x) => {
                    const f = (files ?? []).find((ff) => ff.id === x.file_id);
                    if (!f) return null;
                    return (
                      <li key={x.file_id} className="flex flex-col gap-3 rounded-[14px] bg-ceralacca-soft/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold">Il tuo elaborato corretto</span>
                          <span className="block break-words text-[13px] text-slate">{f.file_name}, con segni e note del docente</span>
                        </span>
                        <AnnotateButton fileId={f.id} fileName={f.file_name} initial={x.data} readOnly label="Vedi la correzione" className="btn-primary btn-sm w-full sm:w-auto" />
                      </li>
                    );
                  })}
                </ul>
              )}
              {byRole("correzione").length > 0 && (
                <div className="mt-6">
                  <FileList files={byRole("correzione")} kind="esercitazione" />
                </div>
              )}
              {!annotated.length && !byRole("correzione").length && !review?.feedback && (
                <p className="mt-4 text-[15px] text-slate">Il docente non ha allegato annotazioni.</p>
              )}
            </section>
          )}

          <section aria-labelledby="traccia">
            <h2 id="traccia" className="text-lg font-semibold">Traccia</h2>
            {a.instructions && <div className="prose-legal mt-3 whitespace-pre-wrap">{a.instructions}</div>}
            <div className="mt-4">
              <FileList files={byRole("traccia")} kind="esercitazione" empty="Nessun file allegato alla traccia." />
            </div>
          </section>

          <section aria-labelledby="svolgimento">
            <h2 id="svolgimento" className="text-lg font-semibold">Il tuo elaborato</h2>
            {editable ? (
              <SubmissionPanel assignmentId={a.id} status={a.status} files={byRole("svolgimento")} />
            ) : (
              <div className="mt-3">
                <FileList files={byRole("svolgimento")} kind="esercitazione" empty="Nessun file consegnato." />
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <dl className="panel divide-y divide-line-soft">
            <div className="p-4">
              <dt className="text-sm text-mute">Scadenza</dt>
              <dd className={`mt-0.5 font-medium ${late ? "text-ceralacca" : ""}`}>
                {a.due_at ? dateTime(a.due_at) : "Nessuna scadenza"}
              </dd>
            </div>
            {a.submitted_at && (
              <div className="p-4">
                <dt className="text-sm text-mute">Consegnato</dt>
                <dd className="mt-0.5 font-medium">{dateTime(a.submitted_at)}</dd>
              </div>
            )}
            {a.corrected_at && (
              <div className="p-4">
                <dt className="text-sm text-mute">Corretto</dt>
                <dd className="mt-0.5 font-medium">{dateTime(a.corrected_at)}</dd>
              </div>
            )}
          </dl>
          {late && (
            <p className="rounded-[10px] bg-ceralacca-soft px-4 py-3 text-[15px] text-ceralacca">
              La scadenza è passata: puoi ancora consegnare, il docente vedrà la data di consegna.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}

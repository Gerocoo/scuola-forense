import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/AppShell";
import { FileList } from "@/components/app/FileList";
import { StatusBadge } from "@/components/app/StatusBadge";
import { AssignmentTimeline } from "@/components/app/AssignmentTimeline";
import { SubmissionPanel } from "./SubmissionPanel";
import { requireUser } from "@/lib/auth";
import { dateTime, KIND_LABEL } from "@/lib/format";
import type { Assignment, AssignmentFile, Profile, Review } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function EsercitazionePage({ params }: Props) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const { data: a } = await supabase.from("assignments").select("*").eq("id", id).eq("student_id", user.id).maybeSingle<Assignment>();
  if (!a) notFound();

  const [{ data: files }, { data: review }, { data: teacher }] = await Promise.all([
    supabase.from("assignment_files").select("*").eq("assignment_id", id).order("created_at").returns<AssignmentFile[]>(),
    supabase.from("assignment_reviews").select("*").eq("assignment_id", id).maybeSingle<Review>(),
    supabase.from("profiles").select("id, full_name, email").eq("id", a.teacher_id).maybeSingle<Pick<Profile, "id" | "full_name" | "email">>(),
  ]);

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

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-10">
          {/* La correzione, quando c'è, è la cosa più importante: va in cima */}
          {a.status === "corretto" && (
            <section aria-labelledby="correzione" className="rounded-[var(--radius-panel)] border border-ceralacca/30 bg-surface p-6">
              <h2 id="correzione" className="text-lg font-semibold text-ceralacca">Correzione del docente</h2>
              {review?.grade && (
                <p className="mt-3 text-[15px]">
                  Giudizio: <strong className="text-[18px]">{review.grade}</strong>
                </p>
              )}
              {review?.feedback && (
                <div className="prose-legal mt-4 whitespace-pre-wrap border-l-2 border-ceralacca/40 pl-4">{review.feedback}</div>
              )}
              <div className="mt-6">
                <FileList files={byRole("correzione")} kind="esercitazione" empty="Il docente non ha allegato file annotati." />
              </div>
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

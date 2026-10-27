import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/AppShell";
import { FileList } from "@/components/app/FileList";
import { StatusBadge } from "@/components/app/StatusBadge";
import { AssignmentTimeline } from "@/components/app/AssignmentTimeline";
import { CorrectionPanel } from "./CorrectionPanel";
import { AssignmentAdmin } from "./AssignmentAdmin";
import { AnnotateButton, type Annotations } from "@/components/app/PdfAnnotator";
import { requireStaff } from "@/lib/auth";
import { dateTime, KIND_LABEL, toLocalInput } from "@/lib/format";
import type { Assignment, AssignmentFile, Profile, Review } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function EsercitazioneDocente({ params }: Props) {
  const { id } = await params;
  const { supabase } = await requireStaff();

  const { data: a } = await supabase.from("assignments").select("*").eq("id", id).maybeSingle<Assignment>();
  if (!a) notFound();

  const [{ data: files }, { data: review }, { data: people }, { data: annotations }] = await Promise.all([
    supabase.from("assignment_files").select("*").eq("assignment_id", id).order("created_at").returns<AssignmentFile[]>(),
    supabase.from("assignment_reviews").select("*").eq("assignment_id", id).maybeSingle<Review>(),
    supabase.from("profiles").select("id, full_name, email").in("id", [a.student_id, a.teacher_id]).returns<Profile[]>(),
    supabase.from("assignment_annotations").select("file_id, data").eq("assignment_id", id).returns<{ file_id: string; data: Annotations }[]>(),
  ]);
  const annOf = (fid: string) => annotations?.find((x) => x.file_id === fid)?.data ?? null;
  const marks = (d: Annotations | null) =>
    d ? Object.values(d.pages ?? {}).reduce((n, p) => n + (p.strokes?.length ?? 0) + (p.notes?.length ?? 0), 0) : 0;
  const annotatable = (name: string) => /\.(pdf|docx?|odt|rtf|txt)$/i.test(name);

  const student = people?.find((p) => p.id === a.student_id);
  const teacher = people?.find((p) => p.id === a.teacher_id);
  const byRole = (r: AssignmentFile["role"]) => (files ?? []).filter((f) => f.role === r);
  const lateSubmission = a.due_at && a.submitted_at && a.submitted_at > a.due_at;

  return (
    <>
      <PageHeader
        back={{ href: "/docente/esercitazioni", label: "Esercitazioni" }}
        title={a.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {KIND_LABEL[a.kind]} per{" "}
              <Link href={`/docente/discenti/${a.student_id}`} className="link">{student?.full_name || student?.email}</Link>
            </span>
            <StatusBadge status={a.status} view="teacher" />
          </span>
        }
        actions={
          <Link href={`/docente/messaggi/${a.student_id}?esercitazione=${a.id}`} className="btn-secondary">
            Scrivi al discente
          </Link>
        }
      />

      <AssignmentTimeline assignment={a} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <section aria-labelledby="elaborato">
            <h2 id="elaborato" className="text-lg font-semibold">Elaborato del discente</h2>
            {a.submitted_at && (
              <p className={`mt-1 text-[15px] ${lateSubmission ? "text-ceralacca" : "text-slate"}`}>
                Consegnato {dateTime(a.submitted_at)}{lateSubmission ? ", dopo la scadenza" : ""}
              </p>
            )}
            <div className="mt-3">
              <FileList
                files={byRole("svolgimento")}
                kind="esercitazione"
                empty={a.status === "assegnato" ? "Il discente non ha ancora consegnato." : "Nessun file."}
              />
            </div>
            {byRole("svolgimento").some((f) => annotatable(f.file_name)) && (
              <div className="mt-4 rounded-[var(--radius-panel)] bg-codice-soft/60 p-4">
                <p className="text-[15px] font-semibold text-codice">Correggi sul documento</p>
                <p className="mt-0.5 text-[14px] text-slate">
                  Apri l&apos;elaborato e annotalo direttamente: penna, evidenziatore e note a margine. I file Word vengono convertiti in PDF.
                  Il discente vede le annotazioni quando pubblichi la correzione.
                </p>
                <ul className="mt-3 space-y-2">
                  {byRole("svolgimento")
                    .filter((f) => annotatable(f.file_name))
                    .map((f) => {
                      const n = marks(annOf(f.id));
                      return (
                        <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-surface px-3.5 py-2.5">
                          <span className="min-w-0">
                            <span className="block truncate text-[14px] font-medium">{f.file_name}</span>
                            <span className="text-[12px] text-mute">{n ? `${n} annotazioni` : "Nessuna annotazione"}</span>
                          </span>
                          <AnnotateButton fileId={f.id} fileName={f.file_name} initial={annOf(f.id)} label={n ? "Continua la correzione" : "Apri e correggi"} />
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
          </section>

          {a.status !== "assegnato" && (
            <CorrectionPanel
              assignmentId={a.id}
              status={a.status}
              files={byRole("correzione")}
              initialFeedback={review?.feedback ?? ""}
              initialGrade={review?.grade ?? ""}
            />
          )}

          <section aria-labelledby="traccia">
            <h2 id="traccia" className="text-lg font-semibold">Traccia</h2>
            {a.instructions && <div className="prose-legal mt-3 whitespace-pre-wrap">{a.instructions}</div>}
            <div className="mt-4">
              <FileList files={byRole("traccia")} kind="esercitazione" empty="Nessun file allegato." />
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <dl className="panel divide-y divide-line-soft">
            <div className="p-4">
              <dt className="text-sm text-mute">Assegnata da</dt>
              <dd className="mt-0.5 font-medium">{teacher?.full_name || teacher?.email}</dd>
            </div>
            <div className="p-4">
              <dt className="text-sm text-mute">Assegnata il</dt>
              <dd className="mt-0.5 font-medium">{dateTime(a.created_at)}</dd>
            </div>
            <div className="p-4">
              <dt className="text-sm text-mute">Scadenza</dt>
              <dd className="mt-0.5 font-medium">{a.due_at ? dateTime(a.due_at) : "Nessuna"}</dd>
            </div>
          </dl>
          <AssignmentAdmin
            id={a.id}
            status={a.status}
            title={a.title}
            instructions={a.instructions}
            dueLocal={toLocalInput(a.due_at)}
          />
        </aside>
      </div>
    </>
  );
}

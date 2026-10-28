import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/app/Avatar";
import { StatusBadge } from "@/components/app/StatusBadge";
import { AddTeacher, InviteToCourse, RemoveTeacher, RetireExercise } from "./CourseControls";
import { CollectiveReview } from "./CollectiveReview";
import { requireStaff } from "@/lib/auth";
import { activeByPackage, canTeach, type CourseTeacher } from "@/lib/courses";
import { dateLong, dateShort, dateTime, KIND_LABEL } from "@/lib/format";
import type { Assignment, CourseExercise, Lesson, Package, Profile } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function CorsoPage({ params }: Props) {
  const { id } = await params;
  const { supabase, profile: me } = await requireStaff();
  const isAdmin = me.role === "admin" || !!me.is_super;

  const { data: course } = await supabase.from("packages").select("*").eq("id", id).maybeSingle<Package>();
  if (!course) notFound();
  if (!(await canTeach(supabase, me, id))) redirect("/docente/corsi");

  const [{ data: enr }, { data: exercises }, { data: assignments }, { data: lessons }, { data: team }, { data: staff }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("package_id, user_id, status, ends_at, student:profiles(id, full_name, email, avatar_url)")
      .eq("package_id", id)
      .returns<{ package_id: string; user_id: string; status: string; ends_at: string | null; student: CourseTeacher | null }[]>(),
    supabase.from("course_exercises").select("*").eq("package_id", id).order("created_at", { ascending: false }).returns<CourseExercise[]>(),
    supabase
      .from("assignments")
      .select("id, batch_id, student_id, status, submitted_at")
      .eq("package_id", id)
      .returns<Pick<Assignment, "id" | "batch_id" | "student_id" | "status" | "submitted_at">[]>(),
    supabase
      .from("lessons")
      .select("id, title, kind, published, scheduled_at, created_at, sort")
      .contains("package_ids", [id])
      .order("sort")
      .order("created_at")
      .returns<Pick<Lesson, "id" | "title" | "kind" | "published" | "scheduled_at" | "created_at">[]>(),
    supabase
      .from("package_teachers")
      .select("teacher:profiles(id, full_name, email, avatar_url)")
      .eq("package_id", id)
      .returns<{ teacher: CourseTeacher | null }[]>(),
    isAdmin
      ? supabase.from("profiles").select("id, full_name, email").in("role", ["teacher", "admin"]).order("full_name").returns<Pick<Profile, "id" | "full_name" | "email">[]>()
      : Promise.resolve({ data: [] as Pick<Profile, "id" | "full_name" | "email">[] }),
  ]);

  const { data: invites } = isAdmin
    ? await supabase.from("teacher_invites").select("email").contains("package_ids", [id])
    : { data: [] as { email: string }[] };
  const pendingInvites = (invites ?? []).map((i: { email: string }) => i.email);

  const activeIds = activeByPackage(enr ?? []).get(id) ?? new Set<string>();
  const students = (enr ?? [])
    .filter((e) => activeIds.has(e.user_id) && e.student)
    .map((e) => e.student!)
    .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)
    .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));
  const nameOf = new Map<string, string>(students.map((s) => [s.id, s.full_name || s.email]));
  const list = assignments ?? [];
  const pending = list.filter((a) => a.status === "consegnato").length;
  const teachers = (team ?? []).map((t) => t.teacher).filter(Boolean) as CourseTeacher[];
  const addable = (staff ?? []).filter((p) => !teachers.some((t) => t.id === p.id)).map((p) => ({ id: p.id, name: p.full_name || p.email }));
  const recorded = (lessons ?? []).filter((l) => l.kind === "registrata");
  const live = (lessons ?? []).filter((l) => l.kind === "in_presenza");

  return (
    <>
      <Link href="/docente/corsi" className="mb-5 inline-flex items-center gap-1 text-[15px] font-medium text-codice hover:underline">
        <svg aria-hidden viewBox="0 0 16 16" className="size-3.5"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Corsi
      </Link>

      {/* intestazione */}
      <section className="panel p-4 sm:p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-codice">{course.period_label || "Corso"}</p>
            <h1 className="mt-1 break-words text-[24px] font-semibold leading-tight tracking-[-0.03em] sm:text-[30px] md:text-[36px]">{course.title}</h1>
            {(course.starts_on || course.access_until) && (
              <p className="mt-1 text-[15px] text-slate">
                {course.starts_on ? `Dal ${dateLong(course.starts_on)}` : ""}
                {course.access_until ? ` · accesso fino al ${dateLong(course.access_until)}` : ""}
              </p>
            )}
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            {isAdmin && <Link href={`/docente/pacchetti/${id}`} className="btn-ghost col-span-2 sm:col-span-1">Modifica corso</Link>}
            <Link href={`/docente/lezioni/nuova?corso=${id}`} className="btn-secondary">Nuova lezione</Link>
            <Link href={`/docente/corsi/${id}/esercizio`} className="btn-primary">Nuovo esercizio</Link>
          </div>
        </div>
        <dl className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Iscritti", students.length],
            ["Esercizi", exercises?.length ?? 0],
            ["Da correggere", pending],
            ["Lezioni", lessons?.length ?? 0],
          ].map(([label, n]) => (
            <div key={label} className="rounded-[16px] bg-paper px-4 py-3">
              <dd className={`text-[24px] font-semibold tabular-nums ${label === "Da correggere" && Number(n) > 0 ? "text-ambra" : ""}`}>{n}</dd>
              <dt className="text-[14px] text-mute">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* esercizi */}
        <section className="min-w-0">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[19px] font-semibold">Esercizi del corso</h2>
            <span className="text-[14px] text-mute">Arrivano a tutti gli iscritti, anche a chi si iscrive dopo</span>
          </div>
          {exercises?.length ? (
            <ul className="space-y-3">
              {exercises.map((ex) => {
                const copies = list.filter((a) => a.batch_id === ex.id);
                const delivered = copies.filter((a) => a.status !== "assegnato").length;
                const corrected = copies.filter((a) => a.status === "corretto").length;
                const toFix = copies.filter((a) => a.status === "consegnato").length;
                const pct = copies.length ? Math.round((delivered / copies.length) * 100) : 0;
                return (
                  <li key={ex.id} className="panel overflow-hidden">
                    <details className="group">
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 p-5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{ex.title}</p>
                          <p className="mt-0.5 text-[14px] text-mute">
                            {KIND_LABEL[ex.kind]}
                            {ex.timed && ex.opens_at
                              ? ` · simulazione a tempo: ${dateTime(ex.opens_at)} → ${ex.due_at ? dateTime(ex.due_at) : ""}`
                              : ` · assegnato il ${dateShort(ex.created_at)}${ex.due_at ? ` · scadenza ${dateTime(ex.due_at)}` : ""}`}
                          </p>
                          <div className="mt-3 flex items-center gap-3">
                            <span className="h-1.5 max-w-[240px] flex-1 overflow-hidden rounded-full bg-line-soft">
                              <span className="block h-full rounded-full bg-codice" style={{ width: `${pct}%` }} />
                            </span>
                            <span className="text-[14px] text-slate tabular-nums">
                              {delivered} di {copies.length} consegnati · {corrected} corretti
                            </span>
                          </div>
                        </div>
                        {toFix > 0 && (
                          <span className="rounded-full bg-ambra-soft px-2.5 py-0.5 text-[14px] font-medium text-ambra">{toFix} da correggere</span>
                        )}
                        <svg aria-hidden viewBox="0 0 16 16" className="size-4 text-mute transition-transform group-open:rotate-180"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </summary>
                      <div className="border-t border-line-soft">
                        {copies.length ? (
                          <ul className="divide-y divide-line-soft">
                            {copies
                              .slice()
                              .sort((a, b) => (nameOf.get(a.student_id) ?? "").localeCompare(nameOf.get(b.student_id) ?? ""))
                              .map((a) => (
                                <li key={a.id}>
                                  <Link href={`/docente/esercitazioni/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[15px] hover:bg-paper">
                                    <span className="truncate">{nameOf.get(a.student_id) ?? "Ex iscritto"}</span>
                                    <StatusBadge status={a.status} view="teacher" />
                                  </Link>
                                </li>
                              ))}
                          </ul>
                        ) : (
                          <p className="px-5 py-3 text-[14px] text-slate">Ancora nessun iscritto: lo riceveranno appena si iscrivono.</p>
                        )}
                        <CollectiveReview
                          exerciseId={ex.id}
                          dueAt={ex.due_at}
                          initial={{
                            solution: ex.solution ?? "",
                            commonErrors: ex.common_errors ?? "",
                            reviewUrl: ex.review_url ?? "",
                            files: ex.solution_files ?? [],
                            published: !!ex.collective_published,
                          }}
                        />
                        <div className="flex justify-end border-t border-line-soft px-5 py-2.5">
                          <RetireExercise id={ex.id} title={ex.title} />
                        </div>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="panel flex flex-col items-center gap-3 p-10 text-center">
              <p className="text-[15px] text-slate">Nessun esercizio ancora. Il primo che crei arriva a tutti gli iscritti del corso.</p>
              <Link href={`/docente/corsi/${id}/esercizio`} className="btn-primary btn-sm">Nuovo esercizio</Link>
            </div>
          )}

          {/* lezioni */}
          <div className="mb-3 mt-10 flex items-baseline justify-between">
            <h2 className="text-[19px] font-semibold">Lezioni del corso</h2>
            <Link href="/docente/lezioni" className="text-[14px] text-codice hover:underline">Tutte le lezioni</Link>
          </div>
          {lessons?.length ? (
            <ul className="panel divide-y divide-line-soft overflow-hidden">
              {[...recorded, ...live].map((l, i) => (
                <li key={l.id}>
                  <Link href={`/docente/lezioni/${l.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-paper">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {l.kind === "registrata" ? `${i + 1}. ` : ""}
                        {l.title}
                      </span>
                      <span className="text-[14px] text-mute">
                        {l.kind === "in_presenza" ? `In presenza · ${dateTime(l.scheduled_at)}` : "Video lezione"}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[14px] font-medium ${l.published ? "bg-codice-soft text-codice" : "bg-line-soft text-slate"}`}>
                      {l.published ? "Visibile" : "Bozza"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel p-6 text-[15px] text-slate">Nessuna lezione collegata a questo corso.</p>
          )}
        </section>

        {/* colonna laterale */}
        <aside className="space-y-4">
          <section className="panel p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Iscritti</h2>
              <span className="text-[14px] text-mute tabular-nums">{students.length}</span>
            </div>
            {students.length ? (
              <ul className="mt-3 max-h-[420px] space-y-1 overflow-y-auto pr-1">
                {students.map((s) => {
                  const mine = list.filter((a) => a.student_id === s.id);
                  const done = mine.filter((a) => a.status !== "assegnato").length;
                  return (
                    <li key={s.id}>
                      <Link href={`/docente/discenti/${s.id}`} className="flex items-center gap-3 rounded-[12px] px-2 py-2 hover:bg-paper">
                        <Avatar name={s.full_name} email={s.email} url={s.avatar_url} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium">{s.full_name || s.email}</span>
                          <span className="block text-[13px] text-mute tabular-nums">{mine.length ? `${done}/${mine.length} esercizi consegnati` : "Nessun esercizio"}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-[14px] text-slate">Ancora nessun iscritto.</p>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="font-semibold">Docenti del corso</h2>
            {teachers.length ? (
              <ul className="mt-3 space-y-2">
                {teachers.map((t) => (
                  <li key={t.id} className="flex items-center gap-3">
                    <Avatar name={t.full_name} email={t.email} url={t.avatar_url} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{t.full_name || t.email}</span>
                    {isAdmin && <RemoveTeacher packageId={id} teacherId={t.id} />}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[14px] text-slate">Nessun docente assegnato.</p>
            )}
            {isAdmin && <AddTeacher packageId={id} options={addable} />}
            {isAdmin && <InviteToCourse packageId={id} />}
            {isAdmin && pendingInvites.length > 0 && (
              <div className="mt-4 border-t border-line-soft pt-3">
                <p className="text-[13px] font-medium text-mute">In attesa di registrazione</p>
                <ul className="mt-1 space-y-1 text-[14px] text-slate">
                  {pendingInvites.map((e) => (
                    <li key={e} className="truncate">{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

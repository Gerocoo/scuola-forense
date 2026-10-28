import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Avatar";
import { requireStaff } from "@/lib/auth";
import { activeByPackage, myCourseIds, type CourseSummary, type CourseTeacher } from "@/lib/courses";

export const metadata = { title: "Corsi" };

export default async function CorsiDocente() {
  const { supabase, profile } = await requireStaff();
  const ids = await myCourseIds(supabase, profile);

  const isAdmin = profile.role === "admin" || !!profile.is_super;
  const adminActions = isAdmin ? (
    <>
      <Link href="/docente/utenti" className="btn-secondary">Aggiungi un docente</Link>
      <Link href="/docente/pacchetti/nuovo" className="btn-primary">Nuovo corso</Link>
    </>
  ) : undefined;

  if (!ids.length) {
    return (
      <>
        <PageHeader title="Corsi" description="I corsi in cui insegni, con iscritti, lezioni ed esercizi." actions={adminActions} />
        <div className="panel mx-auto max-w-lg p-8 text-center">
          <h2 className="text-[19px] font-semibold">{isAdmin ? "Nessun corso ancora" : "Nessun corso assegnato"}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate">
            {isAdmin
              ? "Crea il primo corso: scegli nome, periodo, prezzo e docenti."
              : "L'amministratore della scuola ti aggiungerà ai corsi in cui insegni. Da quel momento li troverai qui."}
          </p>
          {isAdmin && <Link href="/docente/pacchetti/nuovo" className="btn-primary mt-5">Nuovo corso</Link>}
        </div>
      </>
    );
  }

  const [{ data: courses }, { data: enr }, { data: exercises }, { data: toCorrect }, { data: lessons }, { data: teachers }] = await Promise.all([
    supabase
      .from("packages")
      .select("id, title, period_label, active, starts_on, ends_on")
      .in("id", ids)
      .order("sort")
      .returns<CourseSummary[]>(),
    supabase.from("enrollments").select("package_id, user_id, status, ends_at").in("package_id", ids),
    supabase.from("course_exercises").select("id, package_id").in("package_id", ids),
    supabase.from("assignments").select("package_id").in("package_id", ids).eq("status", "consegnato"),
    supabase.from("lessons").select("id, package_ids").overlaps("package_ids", ids),
    supabase
      .from("package_teachers")
      .select("package_id, teacher:profiles(id, full_name, email, avatar_url)")
      .in("package_id", ids)
      .returns<{ package_id: string; teacher: CourseTeacher | null }[]>(),
  ]);

  const active = activeByPackage(enr ?? []);
  const count = <T extends { package_id: string }>(rows: T[] | null, id: string) => (rows ?? []).filter((r) => r.package_id === id).length;

  return (
    <>
      <PageHeader title="Corsi" description="Apri un corso per vedere gli iscritti e assegnare un esercizio a tutta la classe." actions={adminActions} />
      <div className="grid gap-4 md:grid-cols-2">
        {(courses ?? []).map((c) => {
          const pending = count(toCorrect, c.id);
          const team = (teachers ?? []).filter((t) => t.package_id === c.id && t.teacher).map((t) => t.teacher!);
          const nLessons = (lessons ?? []).filter((l: { package_ids: string[] }) => l.package_ids.includes(c.id)).length;
          return (
            <Link key={c.id} href={`/docente/corsi/${c.id}`} className="panel lift group flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-codice">{c.period_label || "Corso"}</p>
                  <h2 className="mt-0.5 text-[21px] font-semibold leading-snug">{c.title}</h2>
                </div>
                {pending > 0 && (
                  <span className="shrink-0 rounded-full bg-ambra-soft px-2.5 py-0.5 text-[14px] font-medium text-ambra">
                    {pending} da correggere
                  </span>
                )}
              </div>

              <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Iscritti", active.get(c.id)?.size ?? 0],
                  ["Esercizi", count(exercises, c.id)],
                  ["Lezioni", nLessons],
                ].map(([label, n]) => (
                  <div key={label} className="rounded-[14px] bg-paper py-3">
                    <dd className="text-[22px] font-semibold tabular-nums">{n}</dd>
                    <dt className="text-[13px] text-mute">{label}</dt>
                  </div>
                ))}
              </dl>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="flex -space-x-2">
                  {team.slice(0, 5).map((t) => (
                    <span key={t.id} className="rounded-full ring-2 ring-surface">
                      <Avatar name={t.full_name} email={t.email} url={t.avatar_url} size="sm" />
                    </span>
                  ))}
                  {!team.length && <span className="text-[14px] text-mute">Nessun docente assegnato</span>}
                </div>
                <span className="text-[14px] font-medium text-codice transition-transform group-hover:translate-x-0.5">Apri →</span>
              </div>
              {!c.active && <p className="mt-3 text-[13px] text-mute">Non più in vendita</p>}
            </Link>
          );
        })}
      </div>
    </>
  );
}

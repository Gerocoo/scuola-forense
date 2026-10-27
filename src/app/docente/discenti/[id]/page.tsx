import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Avatar";
import { StatusBadge } from "@/components/app/StatusBadge";
import { EnrollmentAdd, EnrollmentStatus } from "./EnrollmentAdmin";
import { requireStaff } from "@/lib/auth";
import { loadPath } from "@/lib/progress";
import { dateLong, dateShort, euro, KIND_LABEL } from "@/lib/format";
import type { Assignment, Enrollment, Package, Profile } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function DiscentePage({ params }: Props) {
  const { id } = await params;
  const { supabase, profile: me } = await requireStaff();

  const { data: s } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!s) notFound();

  const [{ data: enrollments }, { data: assignments }, { data: packages }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("*, package:packages(title, period_label, slug)")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .returns<Enrollment[]>(),
    supabase.from("assignments").select("*").eq("student_id", id).order("created_at", { ascending: false }).returns<Assignment[]>(),
    me.role === "admin"
      ? supabase.from("packages").select("id, title, period_label").order("sort").returns<Pick<Package, "id" | "title" | "period_label">[]>()
      : Promise.resolve({ data: [] as Pick<Package, "id" | "title" | "period_label">[] }),
  ]);

  const now = new Date().toISOString();
  const path = await loadPath(supabase, id);

  return (
    <>
      <PageHeader
        back={{ href: "/docente/discenti", label: "Discenti" }}
        title={s.full_name || s.email}
        description={
          <span className="flex items-center gap-3">
            <Avatar name={s.full_name} email={s.email} url={s.avatar_url} size="sm" />
            <a href={`mailto:${s.email}`} className="hover:text-ink">{s.email}</a>
            {s.phone && <span>{s.phone}</span>}
          </span>
        }
        actions={
          <>
            <Link href={`/docente/messaggi/${s.id}`} className="btn-secondary">Messaggi</Link>
            <Link href={`/docente/esercitazioni/nuova?discente=${s.id}`} className="btn-primary">Assegna una traccia</Link>
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
        {path.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">Percorso</h2>
              <span className="text-sm text-mute">{path.filter((p) => p.completed).length} di {path.length} lezioni completate</span>
            </div>
            <ul className="mt-3 divide-y divide-line-soft rounded-[var(--radius-panel)] bg-surface shadow-[var(--shadow-card)]">
              {path.map((p) => (
                <li key={p.lesson.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5">
                  <span className="w-6 text-sm font-semibold text-mute tabular-nums">{p.index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{p.lesson.title}</span>
                  {p.hasVideo && (
                    <span className="flex w-40 items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                        <span className="block h-full rounded-full bg-codice" style={{ width: `${p.percent}%` }} />
                      </span>
                      <span className="w-9 text-right text-sm tabular-nums">{p.percent}%</span>
                    </span>
                  )}
                  {p.exercises.length > 0 && (
                    <span className="text-sm text-slate tabular-nums">Esercitazioni {p.exercisesDone}/{p.exercises.length}</span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${
                      p.completed ? "bg-codice-soft text-codice" : p.unlocked ? "bg-ambra-soft text-ambra" : "bg-line-soft text-mute"
                    }`}
                  >
                    {p.completed ? "Completata" : p.unlocked ? "In corso" : "Bloccata"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h2 className="text-lg font-semibold">Esercitazioni</h2>
          {assignments?.length ? (
            <ul className="mt-3 divide-y divide-line-soft rounded-[var(--radius-panel)] bg-surface shadow-[var(--shadow-card)]">
              {assignments.map((a) => (
                <li key={a.id}>
                  <Link href={`/docente/esercitazioni/${a.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-paper">
                    <span className="min-w-0">
                      <span className="block font-medium">{a.title}</span>
                      <span className="text-sm text-mute">
                        {KIND_LABEL[a.kind]}, assegnata il {dateShort(a.created_at)}
                      </span>
                    </span>
                    <StatusBadge status={a.status} view="teacher" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[15px] text-slate">Nessuna esercitazione assegnata.</p>
          )}
        </section>
        </div>

        <aside className="space-y-4">
          <section className="panel p-5">
            <h2 className="font-semibold">Corsi</h2>
            {enrollments?.length ? (
              <ul className="mt-3 space-y-3">
                {enrollments.map((e) => {
                  const active = e.status === "active" && (!e.ends_at || e.ends_at > now);
                  return (
                    <li key={e.id} className="text-[15px]">
                      <p className="font-medium">{e.package?.title}</p>
                      <p className="text-sm text-mute">
                        {active ? "Attivo" : e.status === "refunded" ? "Rimborsato" : "Scaduto"}
                        {e.ends_at ? ` fino al ${dateLong(e.ends_at)}` : ""}, {euro(e.amount_cents)}
                      </p>
                      {me.role === "admin" && <EnrollmentStatus enrollmentId={e.id} status={e.status} />}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-[15px] text-slate">Nessun corso acquistato.</p>
            )}
          </section>
          {me.role === "admin" && <EnrollmentAdd userId={s.id} packages={packages ?? []} />}
        </aside>
      </div>
    </>
  );
}

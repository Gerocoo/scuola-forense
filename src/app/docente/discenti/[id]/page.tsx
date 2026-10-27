import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Avatar";
import { StatusBadge } from "@/components/app/StatusBadge";
import { EnrollmentAdd, EnrollmentStatus } from "./EnrollmentAdmin";
import { requireStaff } from "@/lib/auth";
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

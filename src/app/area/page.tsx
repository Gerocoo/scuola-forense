import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";
import { StatusBadge } from "@/components/app/StatusBadge";
import { requireUser } from "@/lib/auth";
import { dateLong, dateShort, dateTime, KIND_LABEL } from "@/lib/format";
import type { Assignment, Enrollment, Lesson } from "@/lib/types";

export const metadata = { title: "La tua area" };

type Props = { searchParams: Promise<{ gia_iscritto?: string }> };

export default async function AreaHome({ searchParams }: Props) {
  const { supabase, user, profile } = await requireUser();
  const { gia_iscritto } = await searchParams;
  const nowIso = new Date().toISOString();

  const [{ data: enrollments }, { data: todo }, { data: corrected }, { data: nextLive }, { data: recent }] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select("*, package:packages(title, period_label, slug)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .returns<Enrollment[]>(),
      supabase
        .from("assignments")
        .select("*")
        .eq("student_id", user.id)
        .eq("status", "assegnato")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(5)
        .returns<Assignment[]>(),
      supabase
        .from("assignments")
        .select("*")
        .eq("student_id", user.id)
        .eq("status", "corretto")
        .order("corrected_at", { ascending: false })
        .limit(3)
        .returns<Assignment[]>(),
      supabase
        .from("lessons")
        .select("*")
        .eq("kind", "in_presenza")
        .gte("scheduled_at", nowIso)
        .order("scheduled_at")
        .limit(1)
        .returns<Lesson[]>(),
      supabase
        .from("lessons")
        .select("*")
        .eq("kind", "registrata")
        .order("created_at", { ascending: false })
        .limit(3)
        .returns<Lesson[]>(),
    ]);

  const active = (enrollments ?? []).filter((e) => !e.ends_at || e.ends_at > nowIso);
  const firstName = profile.full_name.split(" ")[0];

  if (!active.length) {
    return (
      <>
        <PageHeader title={firstName ? `Ciao ${firstName}` : "Benvenuto"} />
        <EmptyState
          title="Non hai ancora un corso attivo"
          body="Scegli un corso per accedere alle lezioni, ricevere le tracce e inviare i tuoi elaborati ai docenti."
          action={<Link href="/#corsi" className="btn-primary">Scegli il corso</Link>}
        />
      </>
    );
  }

  const live = nextLive?.[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Ciao ${firstName}` : "Benvenuto"}
        description={active.map((e) => `${e.package?.title} (${e.package?.period_label})`).join(", ")}
      />

      {gia_iscritto && (
        <p role="status" className="mb-6 rounded-[10px] bg-codice-soft px-4 py-3 text-[15px] text-codice">
          Sei già iscritto a questo corso: trovi tutto qui.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Da svolgere</h2>
            <Link href="/area/esercitazioni" className="text-sm text-slate hover:text-ink">Tutte le esercitazioni</Link>
          </div>
          {todo?.length ? (
            <ul className="mt-4 divide-y divide-line-soft">
              {todo.map((a) => {
                const late = a.due_at && a.due_at < nowIso;
                return (
                  <li key={a.id}>
                    <Link href={`/area/esercitazioni/${a.id}`} className="flex items-center justify-between gap-4 py-3 hover:text-codice">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{a.title}</p>
                        <p className="text-sm text-mute">{KIND_LABEL[a.kind]}</p>
                      </div>
                      {a.due_at && (
                        <span className={`shrink-0 text-sm tabular-nums ${late ? "font-medium text-ceralacca" : "text-slate"}`}>
                          {late ? "Scaduta il " : "Entro il "}
                          {dateShort(a.due_at)}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-[15px] text-slate">Nessuna traccia in sospeso. Le nuove tracce arrivano qui e via email.</p>
          )}
        </section>

        <section className="panel p-6">
          <h2 className="text-lg font-semibold">Prossima lezione in presenza</h2>
          {live ? (
            <div className="mt-4">
              <p className="text-[22px] font-semibold leading-snug text-codice">{dateTime(live.scheduled_at)}</p>
              <p className="mt-2 font-medium">{live.title}</p>
              {live.location && <p className="mt-1 text-[15px] text-slate">{live.location}</p>}
              <Link href={`/area/lezioni/${live.id}`} className="btn-secondary btn-sm mt-4">Dettagli</Link>
            </div>
          ) : (
            <p className="mt-4 text-[15px] text-slate">La data del prossimo incontro sarà pubblicata qui.</p>
          )}
        </section>

        <section className="panel p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Correzioni ricevute</h2>
          </div>
          {corrected?.length ? (
            <ul className="mt-4 space-y-3">
              {corrected.map((a) => (
                <li key={a.id}>
                  <Link href={`/area/esercitazioni/${a.id}`} className="flex items-center justify-between gap-3 hover:text-codice">
                    <span className="truncate font-medium">{a.title}</span>
                    <StatusBadge status={a.status} />
                  </Link>
                  <p className="text-sm text-mute">Corretta il {dateLong(a.corrected_at)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[15px] text-slate">Quando un docente pubblica una correzione la trovi qui.</p>
          )}
        </section>

        <section className="panel p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Ultime lezioni registrate</h2>
            <Link href="/area/lezioni" className="text-sm text-slate hover:text-ink">Tutte</Link>
          </div>
          {recent?.length ? (
            <ul className="mt-4 space-y-3">
              {recent.map((l) => (
                <li key={l.id}>
                  <Link href={`/area/lezioni/${l.id}`} className="font-medium hover:text-codice">{l.title}</Link>
                  {l.duration_min && <p className="text-sm text-mute">{l.duration_min} minuti</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[15px] text-slate">Le mini lezioni del mese appariranno qui.</p>
          )}
        </section>
      </div>
    </>
  );
}

import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";
import { requireUser } from "@/lib/auth";
import { dateLong, dateTime } from "@/lib/format";
import type { Lesson } from "@/lib/types";

export const metadata = { title: "Lezioni" };

export default async function LezioniPage() {
  const { supabase } = await requireUser();
  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .order("sort")
    .order("created_at", { ascending: false })
    .returns<Lesson[]>();

  const now = new Date().toISOString();
  const recorded = (lessons ?? []).filter((l) => l.kind === "registrata");
  const live = (lessons ?? []).filter((l) => l.kind === "in_presenza").sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));
  const upcoming = live.filter((l) => l.scheduled_at && l.scheduled_at >= now);
  const past = live.filter((l) => !l.scheduled_at || l.scheduled_at < now).reverse();

  return (
    <>
      <PageHeader
        title="Lezioni"
        description="Tre mini lezioni registrate al mese e un incontro in presenza."
        actions={<Link href="/area/calendario" className="btn-secondary">Calendario</Link>}
      />

      <section aria-labelledby="presenza">
        <h2 id="presenza" className="text-lg font-semibold">In presenza</h2>
        {upcoming.length ? (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {upcoming.map((l) => (
              <li key={l.id}>
                <Link href={`/area/lezioni/${l.id}`} className="panel block p-5 transition-shadow hover:shadow-[0_0_0_2px_var(--color-codice)]">
                  <p className="font-semibold text-codice">{dateTime(l.scheduled_at)}</p>
                  <p className="mt-1 text-[17px] font-medium">{l.title}</p>
                  {l.location && <p className="mt-1 text-[15px] text-slate">{l.location}</p>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[15px] text-slate">Nessun incontro in calendario al momento.</p>
        )}
      </section>

      <section aria-labelledby="registrate" className="mt-12">
        <h2 id="registrate" className="text-lg font-semibold">Registrate</h2>
        {recorded.length ? (
          <ul className="mt-4 divide-y divide-line-soft rounded-[var(--radius-panel)] bg-surface shadow-[var(--shadow-card)]">
            {recorded.map((l) => (
              <li key={l.id}>
                <Link href={`/area/lezioni/${l.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-paper">
                  <div className="min-w-0">
                    <p className="font-medium">{l.title}</p>
                    {l.summary && <p className="mt-0.5 line-clamp-1 text-[15px] text-slate">{l.summary}</p>}
                  </div>
                  <span className="shrink-0 text-sm text-mute tabular-nums">
                    {l.duration_min ? `${l.duration_min} min` : dateLong(l.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4">
            <EmptyState title="Le lezioni del tuo corso non sono ancora pubblicate" body="Riceverai un'email quando saranno disponibili." />
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="passate" className="mt-12">
          <h2 id="passate" className="text-lg font-semibold">Incontri passati</h2>
          <ul className="mt-4 space-y-2">
            {past.map((l) => (
              <li key={l.id}>
                <Link href={`/area/lezioni/${l.id}`} className="text-[15px] hover:text-codice">
                  {dateLong(l.scheduled_at)}: {l.title}
                </Link>
                {(l.video_status === "ready" || l.video_url) && (
                  <span className="ml-2 rounded-full bg-codice-soft px-2 py-0.5 text-xs font-medium text-codice">Registrazione disponibile</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

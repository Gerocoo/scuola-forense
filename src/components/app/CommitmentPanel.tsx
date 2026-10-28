import Link from "next/link";
import { urgency, type CourseCommitment } from "@/lib/commitments";

const LINKS: Record<string, (id: string) => string> = {
  recorded: (id) => `/docente/lezioni/nuova?tipo=registrata&corso=${id}`,
  live: (id) => `/docente/lezioni/nuova?tipo=in_presenza&corso=${id}`,
  exercises: (id) => `/docente/corsi/${id}/esercizio`,
};

function Meter({ done, promised }: { done: number; promised: number }) {
  const pct = Math.min(100, Math.round((done / promised) * 100));
  const ok = done >= promised;
  return (
    <span className="block h-2 overflow-hidden rounded-full bg-line-soft" aria-hidden>
      <span className={`block h-full rounded-full transition-[width] duration-700 ${ok ? "bg-codice" : "bg-ambra"}`} style={{ width: `${Math.max(pct, 3)}%` }} />
    </span>
  );
}

/** Avanzamento degli impegni del mese per un corso: video lezioni, incontri, tracce. */
export function CommitmentPanel({ c, showTitle, actions = true }: { c: CourseCommitment; showTitle?: boolean; actions?: boolean }) {
  const u = urgency(c);
  return (
    <section
      className={`panel p-5 sm:p-6 ${u.tone === "late" ? "border-ambra/40 bg-ambra-soft/40" : ""}`}
      aria-label={`Impegni di ${c.monthLabel}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-medium uppercase tracking-wide text-mute">Impegni di {c.monthLabel}</p>
          <h2 className="text-[18px] font-semibold leading-snug">
            {showTitle ? (
              <Link href={`/docente/corsi/${c.packageId}`} className="hover:underline">{c.title}</Link>
            ) : (
              "Materiale promesso agli iscritti"
            )}
          </h2>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ${
            u.tone === "ok" ? "bg-codice-soft text-codice" : u.tone === "late" ? "bg-ceralacca-soft text-ceralacca" : "bg-ambra-soft text-ambra"
          }`}
        >
          <span aria-hidden className={`size-1.5 rounded-full ${u.tone === "ok" ? "bg-codice" : u.tone === "late" ? "bg-ceralacca animate-pulse" : "bg-ambra"}`} />
          {u.tone === "ok" ? "In regola" : c.daysLeft === 1 ? "Ultimo giorno" : `${c.daysLeft} giorni`}
        </span>
      </div>

      <ul className="mt-4 space-y-3.5">
        {c.items.map((i) => {
          const left = Math.max(0, i.promised - i.done);
          return (
            <li key={i.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[15px]">
                <span className="font-medium">{i.label}</span>
                <span className="tabular-nums text-slate">
                  {i.done} di {i.promised}
                  {left > 0 && actions && (
                    <Link href={LINKS[i.key](c.packageId)} className="ml-3 font-medium text-codice hover:underline">
                      Aggiungi
                    </Link>
                  )}
                </span>
              </div>
              <Meter done={i.done} promised={i.promised} />
            </li>
          );
        })}
      </ul>
      <p className={`mt-4 text-[14px] ${u.tone === "late" ? "font-medium text-ceralacca" : "text-slate"}`}>{u.text}.</p>
    </section>
  );
}

import Link from "next/link";
import { CheckoutForm } from "@/components/site/CheckoutForm";
import { ARCHIVE_SLUG, type ArchiveFilters, type ArchiveTrack } from "@/lib/archive";
import { euro } from "@/lib/format";

export type PastTrack = ArchiveTrack;

const SUBJ = { civile: "Civile", penale: "Penale", amministrativo: "Amministrativo" } as const;
const KIND = { parere: "Parere", atto: "Atto" } as const;

function LockIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** Pulsante d'acquisto dell'archivio completo. */
export function UnlockButton({ price, className = "btn-primary", tone = "light" }: { price: number | null; className?: string; tone?: "light" | "dark" }) {
  if (price == null) return null;
  return (
    <div className="max-w-sm">
      <CheckoutForm slug={ARCHIVE_SLUG} label={<>Sblocca tutto l&apos;archivio · {euro(price)}</>} className={className} tone={tone} />
    </div>
  );
}

/** Filtri e elenco dell'archivio tracce (usato da discenti e docenti). */
export function TrackArchive({
  tracks,
  base,
  filters,
  years,
  price = null,
  renderAction,
}: {
  tracks: ArchiveTrack[];
  base: string;
  filters: ArchiveFilters;
  years: number[];
  price?: number | null;
  renderAction?: (t: ArchiveTrack) => React.ReactNode;
}) {
  const href = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const m = { ...filters, ...o };
    for (const [k, v] of Object.entries(m)) if (v) p.set(k, v);
    const q = p.toString();
    return q ? `${base}?${q}` : base;
  };
  const Chip = ({ on, to, children }: { on: boolean; to: string; children: React.ReactNode }) => (
    <Link
      href={to}
      className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[14px] ${on ? "bg-ink text-white" : "border border-line bg-surface text-slate hover:text-ink"}`}
    >
      {children}
    </Link>
  );

  return (
    <>
      <div className="mb-6 space-y-2">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip on={!filters.materia} to={href({ materia: undefined })}>Tutte le materie</Chip>
          {(Object.keys(SUBJ) as (keyof typeof SUBJ)[]).map((k) => (
            <Chip key={k} on={filters.materia === k} to={href({ materia: k })}>{SUBJ[k]}</Chip>
          ))}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip on={!filters.tipo} to={href({ tipo: undefined })}>Pareri e atti</Chip>
          <Chip on={filters.tipo === "parere"} to={href({ tipo: "parere" })}>Pareri</Chip>
          <Chip on={filters.tipo === "atto"} to={href({ tipo: "atto" })}>Atti</Chip>
          {years.length > 1 && <span className="mx-1 w-px shrink-0 bg-line" />}
          {years.length > 1 && <Chip on={!filters.anno} to={href({ anno: undefined })}>Tutti gli anni</Chip>}
          {years.length > 1 && years.map((y) => <Chip key={y} on={filters.anno === String(y)} to={href({ anno: String(y) })}>{y}</Chip>)}
        </div>
      </div>

      {tracks.length ? (
        <ul className="space-y-3">
          {tracks.map((t) => (
            <li key={t.id} className={`panel overflow-hidden ${t.locked ? "bg-paper/60" : ""}`}>
              <details className="faq group">
                <summary className="flex cursor-pointer list-none items-start gap-4 p-4 sm:p-5">
                  <span
                    className={`grid size-12 shrink-0 place-items-center rounded-[12px] text-center font-semibold leading-tight ${
                      t.locked ? "bg-line-soft text-mute" : "bg-codice-soft text-codice"
                    }`}
                  >
                    <span className="text-[15px] tabular-nums">{t.year}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-paper px-2 py-0.5 text-[12px] font-medium text-slate">{SUBJ[t.subject]}</span>
                      <span className="rounded-full bg-paper px-2 py-0.5 text-[12px] font-medium text-slate">{KIND[t.kind]}</span>
                      {t.session && <span className="rounded-full bg-paper px-2 py-0.5 text-[12px] text-mute">{t.session}</span>}
                      {t.free && <span className="rounded-full bg-codice px-2 py-0.5 text-[12px] font-medium text-white">Gratis</span>}
                    </span>
                    <span className={`mt-1 block font-semibold leading-snug ${t.locked ? "text-slate" : ""}`}>{t.title}</span>
                  </span>
                  {t.locked ? (
                    <span className="mt-1 text-mute" title="Traccia riservata">
                      <LockIcon className="size-[18px]" />
                    </span>
                  ) : (
                    <span aria-hidden className="mt-1 text-[18px] text-mute transition-transform group-open:rotate-45">+</span>
                  )}
                </summary>
                <div className="border-t border-line-soft p-4 sm:p-5">
                  {t.locked ? (
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="flex items-start gap-2 text-[15px] text-slate">
                        <LockIcon className="mt-0.5 size-4 shrink-0" />
                        Il testo di questa traccia è riservato. Sbloccalo con l&apos;archivio completo o con uno dei nostri corsi.
                      </p>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <UnlockButton price={price} className="btn-primary btn-sm" />
                        <Link href="/#corsi" className="btn-ghost btn-sm">Vedi i corsi</Link>
                      </div>
                    </div>
                  ) : (
                    <>
                      {t.body && <div className="prose-legal whitespace-pre-wrap break-words">{t.body}</div>}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {t.file && (
                          <>
                            <a href={`/api/archivio/${t.id}?apri=1`} target="_blank" rel="noopener" className="btn-secondary btn-sm">Apri il file</a>
                            <a href={`/api/archivio/${t.id}`} className="btn-ghost btn-sm">Scarica</a>
                          </>
                        )}
                        {renderAction?.(t)}
                      </div>
                    </>
                  )}
                  {t.locked && renderAction && <div className="mt-3">{renderAction(t)}</div>}
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="panel p-6 text-[15px] text-slate">Nessuna traccia con questi filtri.</p>
      )}
      <p className="mt-6 text-[13px] text-mute">
        Le tracce riportano i fatti e la richiesta delle prove ministeriali; per il testo ufficiale fa fede la pubblicazione del Ministero della Giustizia.
      </p>
    </>
  );
}

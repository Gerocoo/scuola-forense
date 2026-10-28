import Link from "next/link";

export type PastTrack = {
  id: string;
  year: number;
  session: string;
  subject: "civile" | "penale" | "amministrativo";
  kind: "parere" | "atto";
  title: string;
  body: string;
  file: { name: string } | null;
};

const SUBJ = { civile: "Civile", penale: "Penale", amministrativo: "Amministrativo" } as const;
const KIND = { parere: "Parere", atto: "Atto" } as const;

/** Filtri e elenco dell'archivio tracce (usato da discenti e docenti). */
export function TrackArchive({
  tracks,
  base,
  filters,
  years,
  renderAction,
}: {
  tracks: PastTrack[];
  base: string;
  filters: { materia?: string; tipo?: string; anno?: string };
  years: number[];
  renderAction?: (t: PastTrack) => React.ReactNode;
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
            <li key={t.id} className="panel overflow-hidden">
              <details className="faq group">
                <summary className="flex cursor-pointer list-none items-start gap-4 p-4 sm:p-5">
                  <span className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-codice-soft text-center font-semibold leading-tight text-codice">
                    <span className="text-[15px] tabular-nums">{t.year}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-paper px-2 py-0.5 text-[12px] font-medium text-slate">{SUBJ[t.subject]}</span>
                      <span className="rounded-full bg-paper px-2 py-0.5 text-[12px] font-medium text-slate">{KIND[t.kind]}</span>
                      {t.session && <span className="rounded-full bg-paper px-2 py-0.5 text-[12px] text-mute">{t.session}</span>}
                    </span>
                    <span className="mt-1 block font-semibold leading-snug">{t.title}</span>
                  </span>
                  <span aria-hidden className="mt-1 text-[18px] text-mute transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="border-t border-line-soft p-4 sm:p-5">
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
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="panel p-6 text-[15px] text-slate">Nessuna traccia con questi filtri.</p>
      )}
    </>
  );
}

export async function loadTracks(
  supabase: { from: (t: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  f: { materia?: string; tipo?: string; anno?: string },
) {
  let q = supabase.from("past_tracks").select("id, year, session, subject, kind, title, body, file").order("year", { ascending: false }).order("created_at", { ascending: false });
  if (f.materia) q = q.eq("subject", f.materia);
  if (f.tipo) q = q.eq("kind", f.tipo);
  if (f.anno && /^\d{4}$/.test(f.anno)) q = q.eq("year", Number(f.anno));
  const [{ data }, { data: ys }] = await Promise.all([q.limit(300), supabase.from("past_tracks").select("year")]);
  const years = [...new Set(((ys ?? []) as { year: number }[]).map((y) => y.year))].sort((a, b) => b - a);
  return { tracks: (data ?? []) as PastTrack[], years };
}

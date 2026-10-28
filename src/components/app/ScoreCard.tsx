import { CRITERIA, MAX_PER_CRITERION, PASS_MARK } from "@/lib/grading";

/** Punteggi per criterio e totale in trentesimi, visti dal discente. */
export function ScoreCard({ scores, total }: { scores: Record<string, number> | null | undefined; total: number | null | undefined }) {
  if (!scores || total == null) return null;
  const pass = total >= PASS_MARK;
  return (
    <div className="mt-4 rounded-[16px] bg-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[15px] font-semibold">Valutazione</p>
        <p>
          <strong className={`text-[28px] tabular-nums ${pass ? "text-codice" : "text-ceralacca"}`}>{total}</strong>
          <span className="text-mute">/30</span>
          <span className={`ml-2 rounded-full px-2 py-0.5 text-[13px] font-medium ${pass ? "bg-codice-soft text-codice" : "bg-ceralacca-soft text-ceralacca"}`}>
            {pass ? "Sufficiente" : `Sotto la soglia di ${PASS_MARK}`}
          </span>
        </p>
      </div>
      <ul className="mt-3 space-y-2.5">
        {CRITERIA.map((c) => {
          const v = scores[c.key] ?? 0;
          return (
            <li key={c.key}>
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span>{c.label}</span>
                <span className="font-semibold tabular-nums">{v}/{MAX_PER_CRITERION}</span>
              </div>
              <span className="mt-1 block h-2 overflow-hidden rounded-full bg-line-soft">
                <span
                  className={`block h-full rounded-full ${v >= 4 ? "bg-codice" : v === 3 ? "bg-ambra" : "bg-ceralacca"}`}
                  style={{ width: `${(v / MAX_PER_CRITERION) * 100}%` }}
                />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

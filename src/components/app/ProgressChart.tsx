import { PASS_MARK } from "@/lib/grading";

type Point = { at: string; total: number; title: string };

/** Andamento dei punteggi delle prove corrette, con la soglia di sufficienza. */
export function ProgressChart({ points, title = "I tuoi progressi" }: { points: Point[]; title?: string }) {
  if (points.length < 1) return null;
  const W = 640;
  const H = 200;
  const pad = { l: 30, r: 12, t: 14, b: 26 };
  const x = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (points.length - 1));
  const y = (v: number) => pad.t + ((30 - v) / 30) * (H - pad.t - pad.b);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.total).toFixed(1)}`).join(" ");
  const last = points[points.length - 1].total;
  const first = points[0].total;
  const avg = Math.round((points.reduce((s, p) => s + p.total, 0) / points.length) * 10) / 10;

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-semibold">{title}</h2>
        <p className="text-[14px] text-slate">
          Media <strong className="tabular-nums text-ink">{avg}</strong>/30
          {points.length > 1 && (
            <span className={`ml-2 font-medium ${last >= first ? "text-codice" : "text-ceralacca"}`}>
              {last >= first ? "+" : ""}
              {last - first} dalla prima prova
            </span>
          )}
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label={`Punteggi: ${points.map((p) => p.total).join(", ")} su 30`}>
        {[0, 10, 18, 30].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={v === PASS_MARK ? "#a3301d" : "#ebe8e1"} strokeDasharray={v === PASS_MARK ? "4 4" : undefined} />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill={v === PASS_MARK ? "#a3301d" : "#5e5e63"}>{v}</text>
          </g>
        ))}
        <path d={line} fill="none" stroke="#1d5747" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.total)} r="5" fill={p.total >= PASS_MARK ? "#1d5747" : "#a3301d"} stroke="#fff" strokeWidth="2">
              <title>{`${p.title}: ${p.total}/30`}</title>
            </circle>
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#5e5e63">
              {new Date(p.at).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-2 text-[13px] text-mute">La linea tratteggiata rossa è la sufficienza ({PASS_MARK}/30).</p>
    </section>
  );
}

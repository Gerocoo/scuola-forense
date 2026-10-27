import Link from "next/link";

export type CalendarEvent = {
  id: string;
  date: string; // ISO
  title: string;
  href: string;
  tone: "lezione" | "scadenza" | "bozza";
  note?: string;
};

const TZ = "Europe/Rome";
const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

/** "2027-03" → { y: 2027, m: 3 }. Valore non valido → mese corrente a Roma. */
export function parseMonth(v: string | undefined) {
  const now = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit" }).format(new Date());
  const src = v && /^\d{4}-\d{2}$/.test(v) ? v : now;
  const [y, m] = src.split("-").map(Number);
  return { y, m: Math.min(12, Math.max(1, m)) };
}

/** Intervallo da interrogare: con un margine di una settimana per i giorni dei mesi adiacenti. */
export function monthRange(y: number, m: number) {
  const from = new Date(Date.UTC(y, m - 1, 1) - 7 * 86400000).toISOString();
  const to = new Date(Date.UTC(y, m, 1) + 8 * 86400000).toISOString();
  return { from, to };
}

const key = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d); // 2027-03-14
const time = (d: Date) => new Intl.DateTimeFormat("it-IT", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
const pad = (n: number) => String(n).padStart(2, "0");

const TONE: Record<CalendarEvent["tone"], string> = {
  lezione: "bg-codice text-white",
  scadenza: "bg-ceralacca-soft text-ceralacca",
  bozza: "border border-dashed border-slate text-slate",
};

export function MonthCalendar({ y, m, events, basePath }: { y: number; m: number; events: CalendarEvent[]; basePath: string }) {
  const first = new Date(Date.UTC(y, m - 1, 1, 12));
  const offset = (first.getUTCDay() + 6) % 7; // lunedì = 0
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const today = key(new Date());

  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const k = key(new Date(e.date));
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }

  const prev = m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
  const title = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);

  // per lo schermo stretto: elenco dei giorni con eventi
  const monthEvents = events
    .filter((e) => key(new Date(e.date)).startsWith(`${y}-${pad(m)}`))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold capitalize">{title}</h2>
        <div className="flex gap-1">
          <Link href={`${basePath}?mese=${prev}`} className="btn-secondary btn-sm" aria-label="Mese precedente">‹</Link>
          <Link href={basePath} className="btn-ghost btn-sm">Oggi</Link>
          <Link href={`${basePath}?mese=${next}`} className="btn-secondary btn-sm" aria-label="Mese successivo">›</Link>
        </div>
      </div>

      {/* griglia: da tablet in su */}
      <div className="hidden overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line md:block">
        <div className="grid grid-cols-7 gap-px">
          {WEEKDAYS.map((d) => (
            <div key={d} className="bg-paper px-2 py-2 text-center text-sm font-medium text-mute">{d}</div>
          ))}
          {Array.from({ length: cells }, (_, i) => {
            const day = i - offset + 1;
            const inMonth = day >= 1 && day <= daysInMonth;
            const date = new Date(Date.UTC(y, m - 1, day, 12));
            const k = key(date);
            const list = byDay.get(k) ?? [];
            return (
              <div key={i} className={`min-h-28 p-1.5 ${inMonth ? "bg-surface" : "bg-paper"}`}>
                <span
                  className={`mb-1 inline-grid size-7 place-items-center rounded-full text-sm tabular-nums ${
                    k === today ? "bg-ink font-semibold text-white" : inMonth ? "text-ink" : "text-mute"
                  }`}
                >
                  {date.getUTCDate()}
                </span>
                <ul className="space-y-1">
                  {list.map((e) => (
                    <li key={e.id}>
                      <Link href={e.href} className={`block truncate rounded-[6px] px-1.5 py-1 text-xs font-medium ${TONE[e.tone]}`} title={e.title}>
                        {e.tone !== "scadenza" && <span className="tabular-nums">{time(new Date(e.date))} </span>}
                        {e.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* elenco: telefono */}
      <div className="md:hidden">
        {monthEvents.length ? (
          <ul className="divide-y divide-line-soft rounded-[var(--radius-panel)] bg-surface shadow-[var(--shadow-card)]">
            {monthEvents.map((e) => {
              const d = new Date(e.date);
              return (
                <li key={e.id}>
                  <Link href={e.href} className="flex items-center gap-4 px-4 py-3">
                    <span className="w-12 shrink-0 text-center">
                      <span className="block text-xl font-semibold tabular-nums">{new Intl.DateTimeFormat("it-IT", { day: "numeric", timeZone: TZ }).format(d)}</span>
                      <span className="block text-xs text-mute">{new Intl.DateTimeFormat("it-IT", { weekday: "short", timeZone: TZ }).format(d)}</span>
                    </span>
                    <span className="min-w-0">
                      <span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONE[e.tone]}`}>
                        {e.tone === "scadenza" ? "Scadenza" : time(d)}
                      </span>
                      <span className="block truncate font-medium">{e.title}</span>
                      {e.note && <span className="block truncate text-sm text-mute">{e.note}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[15px] text-slate">Nessun appuntamento in questo mese.</p>
        )}
      </div>
    </div>
  );
}

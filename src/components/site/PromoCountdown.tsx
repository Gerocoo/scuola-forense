"use client";

import { useEffect, useState } from "react";

/** "Prezzo lancio ancora per 3 giorni e 4 ore": si aggiorna ogni minuto. */
export function PromoCountdown({ until, dark = false }: { until: string; dark?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return null;
  const ms = new Date(until).getTime() - now;
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const text = d > 0 ? `${d} ${d === 1 ? "giorno" : "giorni"} e ${h} ${h === 1 ? "ora" : "ore"}` : h > 0 ? `${h} ${h === 1 ? "ora" : "ore"} e ${m} min` : `${m} minuti`;
  return (
    <p className={`mt-2 flex items-center gap-1.5 text-[14px] font-medium ${dark ? "text-ivory" : "text-ceralacca"}`}>
      <svg aria-hidden viewBox="0 0 24 24" className="size-4"><path d="M12 7v5l3 2 M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      Questo prezzo vale ancora per {text}
    </p>
  );
}

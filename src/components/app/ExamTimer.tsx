"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Conto alla rovescia della simulazione.
 * mode "start": manca all'apertura (a zero ricarica la pagina per mostrare la traccia);
 * mode "end": tempo rimasto per consegnare.
 */
export function ExamTimer({ target, mode, totalMin }: { target: string; mode: "start" | "end"; totalMin?: number }) {
  const router = useRouter();
  const end = new Date(target).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = now === null ? null : end - now;
  useEffect(() => {
    if (left !== null && left <= 0 && mode === "start") {
      const t = setTimeout(() => router.refresh(), 1200);
      return () => clearTimeout(t);
    }
  }, [left, mode, router]);

  if (left === null) return <div className="h-[88px]" aria-hidden />;
  const p = parts(left);
  const over = left <= 0;
  const warn = mode === "end" && left < 30 * 60 * 1000;
  const pct = mode === "end" && totalMin ? Math.min(100, Math.max(0, 100 - (left / (totalMin * 60_000)) * 100)) : null;

  return (
    <div
      role="timer"
      aria-live="off"
      className={`rounded-[18px] p-4 sm:p-5 ${over ? "bg-line-soft text-slate" : warn ? "bg-ceralacca text-white" : "bg-codice text-white"}`}
    >
      <p className={`text-[14px] font-medium ${over ? "" : "text-white/80"}`}>
        {mode === "start" ? (over ? "La simulazione sta iniziando…" : "La traccia si apre tra") : over ? "Tempo scaduto" : "Tempo rimasto per consegnare"}
      </p>
      {!over && (
        <p className="mt-1 font-semibold tabular-nums tracking-tight">
          {p.d > 0 && <span className="text-[32px] sm:text-[40px]">{p.d}g </span>}
          <span className="text-[32px] sm:text-[40px]">{pad(p.h)}:{pad(p.m)}</span>
          <span className="text-[20px] opacity-80 sm:text-[24px]">:{pad(p.s)}</span>
        </p>
      )}
      {pct !== null && !over && (
        <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/25">
          <span className="block h-full rounded-full bg-white transition-[width] duration-1000" style={{ width: `${pct}%` }} />
        </span>
      )}
      {mode === "end" && over && <p className="mt-1 text-[14px]">La consegna è chiusa.</p>}
    </div>
  );
}

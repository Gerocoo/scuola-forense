"use client";

import { useState, useTransition } from "react";
import { savePassRate } from "@/app/actions/community";

export function PassRateForm({ initial }: { initial: { percent: number; label: string } | null }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      action={(fd) =>
        start(async () => {
          const res = await savePassRate(fd);
          setMsg(res.ok ? { ok: true, text: res.message ?? "Salvato." } : { ok: false, text: res.error });
        })
      }
    >
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <div>
          <label className="label" htmlFor="percent">Percentuale</label>
          <input id="percent" name="percent" inputMode="numeric" defaultValue={initial?.percent ?? ""} className="field" placeholder="es. 82" />
        </div>
        <div>
          <label className="label" htmlFor="label">Descrizione</label>
          <input id="label" name="label" defaultValue={initial?.label ?? ""} className="field" placeholder="degli allievi ha superato lo scritto 2025" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary btn-sm" disabled={pending}>Salva</button>
        {msg && <p role="status" className={`text-[14px] ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
      </div>
      <p className="text-[13px] text-mute">Inserisci solo dati reali e verificabili. Lascia vuota la percentuale per toglierla dalla vetrina.</p>
    </form>
  );
}

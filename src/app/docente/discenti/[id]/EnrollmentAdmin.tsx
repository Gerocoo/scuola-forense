"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { manualEnroll, setEnrollmentStatus } from "@/app/docente/actions";
import type { Package } from "@/lib/types";

export function EnrollmentAdd({ userId, packages }: { userId: string; packages: Pick<Package, "id" | "title" | "period_label">[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-3"
      action={(fd) =>
        start(async () => {
          const res = await manualEnroll(userId, fd);
          setMsg(res.ok ? { ok: true, text: res.message ?? "Fatto." } : { ok: false, text: res.error });
          router.refresh();
        })
      }
    >
      <p className="text-[14px] text-slate">Per pagamenti con bonifico, rate o borse di studio.</p>
      <div>
        <label htmlFor="package_id" className="label">Corso</label>
        <select id="package_id" name="package_id" className="field" required defaultValue="">
          <option value="" disabled>Scegli</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>{p.title}{p.period_label ? ` (${p.period_label})` : ""}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="amount" className="label">Importo incassato (€)</label>
        <input id="amount" name="amount" inputMode="decimal" placeholder="0" className="field" />
      </div>
      <button className="btn-primary btn-sm" disabled={pending}>Attiva iscrizione</button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
    </form>
  );
}

export function EnrollmentStatus({ enrollmentId, status }: { enrollmentId: string; status: "active" | "expired" | "refunded" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="mt-2 flex items-center gap-2 text-[14px] text-slate">
      Stato
      <select
        className="field w-auto py-1 text-sm"
        defaultValue={status}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value as typeof status;
          start(async () => {
            await setEnrollmentStatus(enrollmentId, v);
            router.refresh();
          });
        }}
      >
        <option value="active">Attivo</option>
        <option value="expired">Sospeso o scaduto</option>
        <option value="refunded">Rimborsato</option>
      </select>
    </label>
  );
}


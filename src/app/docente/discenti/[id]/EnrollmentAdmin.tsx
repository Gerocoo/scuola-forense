"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { manualEnroll, markEnrollmentPaid, setEnrollmentStatus } from "@/app/docente/actions";
import type { Package } from "@/lib/types";

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });

export const METHOD_LABEL: Record<string, string> = {
  stripe: "Carta (online)",
  bonifico: "Bonifico",
  contanti: "Contanti",
  pos: "POS in sede",
  gratuito: "Gratuito / borsa di studio",
  altro: "Altro",
};

export function EnrollmentAdd({ userId, packages }: { userId: string; packages: Pick<Package, "id" | "title" | "period_label" | "price_cents">[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [method, setMethod] = useState("bonifico");
  const [paid, setPaid] = useState(false);
  const [amount, setAmount] = useState("");

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
      <p className="text-[14px] text-slate">Iscrizioni gestite dalla segreteria: bonifico, contanti, POS o borsa di studio.</p>
      <div>
        <label htmlFor="package_id" className="label">Corso</label>
        <select
          id="package_id"
          name="package_id"
          className="field"
          required
          defaultValue=""
          onChange={(e) => {
            const p = packages.find((x) => x.id === e.target.value);
            if (p && !amount) setAmount(String((p.price_cents ?? 0) / 100).replace(".", ","));
          }}
        >
          <option value="" disabled>Scegli</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>{p.title}{p.period_label ? ` (${p.period_label})` : ""}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="payment_method" className="label">Pagamento</label>
          <select id="payment_method" name="payment_method" className="field" value={method} onChange={(e) => setMethod(e.target.value)}>
            {["bonifico", "contanti", "pos", "gratuito", "altro"].map((m) => (
              <option key={m} value={m}>{METHOD_LABEL[m]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="amount" className="label">Importo (€)</label>
          <input id="amount" name="amount" inputMode="decimal" placeholder="0" className="field" value={method === "gratuito" ? "0" : amount} onChange={(e) => setAmount(e.target.value)} disabled={method === "gratuito"} />
        </div>
      </div>
      {method !== "gratuito" && (
        <label className="flex items-center gap-2 text-[15px]">
          <input type="checkbox" name="paid" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="size-4 accent-codice" />
          Pagamento già ricevuto
        </label>
      )}
      {method !== "gratuito" && paid && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="paid_at" className="label">Data incasso</label>
            <input id="paid_at" name="paid_at" type="date" defaultValue={today()} max={today()} className="field" />
          </div>
          <div>
            <label htmlFor="payment_reference" className="label">{method === "bonifico" ? "CRO / TRN" : "Riferimento"}</label>
            <input id="payment_reference" name="payment_reference" className="field" placeholder="facoltativo" />
          </div>
        </div>
      )}
      <div>
        <label htmlFor="payment_note" className="label">Nota interna</label>
        <input id="payment_note" name="payment_note" className="field" placeholder="es. prima rata di due, fattura n. 12" />
      </div>
      {method !== "gratuito" && !paid && (
        <p className="rounded-[12px] bg-ambra-soft px-3 py-2 text-[14px] text-ink">
          L&apos;iscrizione resta <strong>in attesa di pagamento</strong>: il discente non vede il corso finché non la segni come pagata.
        </p>
      )}
      <button className="btn-primary btn-sm" disabled={pending}>
        {pending ? "Salvataggio…" : method === "gratuito" || paid ? "Attiva iscrizione" : "Registra in attesa di bonifico"}
      </button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
    </form>
  );
}

export function MarkPaid({ enrollmentId, amountCents, compact }: { enrollmentId: string; amountCents: number; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!open)
    return (
      <button type="button" className={`btn-primary ${compact ? "btn-sm" : "btn-sm mt-2 w-full"}`} onClick={() => setOpen(true)}>
        Segna come pagato
      </button>
    );
  return (
    <form
      className="mt-2 space-y-2 rounded-[12px] border border-line bg-white p-3"
      action={(fd) =>
        start(async () => {
          const res = await markEnrollmentPaid(enrollmentId, fd);
          setMsg(res.ok ? null : res.error);
          if (res.ok) setOpen(false);
          router.refresh();
        })
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor={`pa-${enrollmentId}`}>Data incasso</label>
          <input id={`pa-${enrollmentId}`} name="paid_at" type="date" defaultValue={today()} max={today()} className="field py-1.5" />
        </div>
        <div>
          <label className="label" htmlFor={`am-${enrollmentId}`}>Importo (€)</label>
          <input id={`am-${enrollmentId}`} name="amount" inputMode="decimal" defaultValue={String(amountCents / 100).replace(".", ",")} className="field py-1.5" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`rf-${enrollmentId}`}>CRO / TRN del bonifico</label>
        <input id={`rf-${enrollmentId}`} name="payment_reference" className="field py-1.5" placeholder="facoltativo" />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary btn-sm" disabled={pending}>{pending ? "…" : "Conferma pagamento"}</button>
        <button type="button" className="text-[14px] text-mute" onClick={() => setOpen(false)}>Annulla</button>
      </div>
      <p className="text-[13px] text-mute">Il discente riceve subito l&apos;email di attivazione e l&apos;accesso al corso.</p>
      {msg && <p role="alert" className="text-sm text-ceralacca">{msg}</p>}
    </form>
  );
}

export function EnrollmentStatus({ enrollmentId, status }: { enrollmentId: string; status: "active" | "expired" | "refunded" | "pending" }) {
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
        <option value="pending">In attesa di pagamento</option>
        <option value="active">Attivo</option>
        <option value="expired">Sospeso o scaduto</option>
        <option value="refunded">Rimborsato</option>
      </select>
    </label>
  );
}

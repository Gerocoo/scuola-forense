"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { retryInvoice, saveBilling } from "@/app/docente/actions";
import { BillingFields, type BillingData } from "@/components/app/BillingFields";

const LABEL: Record<string, { text: string; cls: string }> = {
  sent: { text: "Inviata allo SDI", cls: "bg-codice-soft text-codice" },
  issued: { text: "Creata", cls: "bg-codice-soft text-codice" },
  pending: { text: "In corso", cls: "bg-ambra-soft text-ambra" },
  error: { text: "Da sistemare", cls: "bg-ceralacca-soft text-ceralacca" },
  skipped: { text: "Non emessa", cls: "bg-line-soft text-mute" },
};

export function InvoiceControls({
  enrollmentId,
  status,
  number,
  error,
  billing,
  paid,
}: {
  enrollmentId: string;
  status: string | null;
  number: string | null;
  error: string | null;
  billing: BillingData | null;
  paid: boolean;
}) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const l = status ? LABEL[status] : null;
  const canRetry = paid && (!status || status === "error" || status === "skipped");

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        {l ? (
          <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${l.cls}`}>
            {l.text}
            {number ? ` · n. ${number}` : ""}
          </span>
        ) : (
          <span className="text-[13px] text-mute">—</span>
        )}
        {canRetry && (
          <button
            type="button"
            className="text-[13px] font-medium text-codice hover:underline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await retryInvoice(enrollmentId);
                setMsg(res.ok ? { ok: true, text: res.message ?? "Fatto." } : { ok: false, text: res.error });
                router.refresh();
              })
            }
          >
            {pending ? "…" : status ? "Riprova" : "Emetti"}
          </button>
        )}
        {(status !== "sent" && status !== "issued") && (
          <button type="button" className="text-[13px] text-slate hover:underline" onClick={() => setEdit((v) => !v)}>
            {billing?.name ? "Dati fattura" : "Inserisci dati fattura"}
          </button>
        )}
      </div>
      {error && <p className="mt-1 max-w-xs text-[12px] leading-snug text-ceralacca">{error}</p>}
      {msg && <p className={`mt-1 text-[12px] ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
      {edit && (
        <form
          className="mt-3 w-[min(36rem,80vw)] space-y-3 rounded-[12px] border border-line bg-white p-3"
          action={(fd) =>
            start(async () => {
              const res = await saveBilling(enrollmentId, fd);
              setMsg(res.ok ? { ok: true, text: res.message ?? "Salvato." } : { ok: false, text: res.error });
              if (res.ok) setEdit(false);
              router.refresh();
            })
          }
        >
          <BillingFields initial={billing} idPrefix={`bf-${enrollmentId}`} />
          <button className="btn-primary btn-sm" disabled={pending}>Salva</button>
        </form>
      )}
    </div>
  );
}

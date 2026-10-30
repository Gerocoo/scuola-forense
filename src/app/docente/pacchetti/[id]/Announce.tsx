"use client";

import { useState, useTransition } from "react";
import { announceToAlumni } from "@/app/docente/actions";

/** Avviso agli ex corsisti: email e notifica con il link al prodotto. */
export function Announce({ packageId, defaultText }: { packageId: string; defaultText: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      action={(fd) =>
        start(async () => {
          if (!confirm("Inviare l'avviso a tutti gli ex corsisti?")) return;
          const res = await announceToAlumni(packageId, fd);
          setMsg(res.ok ? { ok: true, text: res.message ?? "Inviato." } : { ok: false, text: res.error });
        })
      }
    >
      <textarea name="message" rows={3} defaultValue={defaultText} className="field" />
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-secondary btn-sm" disabled={pending}>{pending ? "Invio…" : "Avvisa gli ex corsisti"}</button>
        {msg && <p role="status" className={`text-[14px] ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
      </div>
      <p className="text-[13px] text-mute">Arriva per email e come notifica a chi ha frequentato un corso e non ha ancora questo prodotto. Per uno sconto, imposta prima il prezzo promozionale con la scadenza.</p>
    </form>
  );
}

"use client";

import { useState } from "react";
import { startCheckout } from "@/app/checkout/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

/**
 * Avvio del pagamento con la richiesta esplicita di accesso immediato ai contenuti digitali
 * e la presa d'atto della perdita del diritto di recesso (Codice del consumo, art. 59, lett. o).
 */
export function CheckoutForm({
  slug,
  label,
  className = "btn-primary w-full",
  tone = "light",
}: {
  slug: string;
  label: React.ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  const [ok, setOk] = useState(false);
  return (
    <form action={startCheckout} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <label className={`flex items-start gap-2.5 text-left text-[13px] leading-snug ${tone === "dark" ? "text-white/80" : "text-slate"}`}>
        <input
          type="checkbox"
          name="rinuncia_recesso"
          required
          checked={ok}
          onChange={(e) => setOk(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-codice"
        />
        <span>
          Chiedo di accedere subito ai contenuti digitali del corso e prendo atto che, con l&apos;avvio dell&apos;erogazione, perdo il diritto di
          recesso (art. 59, lett. o, Codice del consumo). Ho letto i{" "}
          <a href="/termini" target="_blank" className="underline">termini di vendita</a>.
        </span>
      </label>
      <SubmitButton className={className} pendingLabel="Apertura del pagamento…" disabled={!ok}>
        {label}
      </SubmitButton>
    </form>
  );
}

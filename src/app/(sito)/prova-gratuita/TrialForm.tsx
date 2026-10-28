"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestTrial } from "./actions";
import { GoogleButton } from "@/components/auth/GoogleButton";

export function TrialForm({ loggedIn }: { loggedIn: boolean }) {
  const [state, action, pending] = useActionState(requestTrial, null);

  if (loggedIn) {
    return (
      <div className="space-y-3">
        <p className="text-[16px] text-slate">Hai già un account: attiva la prova e trovi la traccia nella tua area.</p>
        <Link href="/prova-gratuita/attiva" className="btn-primary btn-lg w-full">Attiva la prova gratuita</Link>
      </div>
    );
  }

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <p className="text-[18px] font-semibold">Ultimo passo: crea il tuo accesso</p>
        <p className="text-[15px] text-slate">Serve per consegnare l&apos;elaborato e ricevere la correzione. Bastano pochi secondi.</p>
        <GoogleButton next="/prova-gratuita/attiva" />
        <Link href="/registrati?next=/prova-gratuita/attiva" className="btn-secondary w-full">Registrati con la tua email</Link>
        <p className="text-center text-[14px] text-slate">
          Hai già un account? <Link href="/accedi?next=/prova-gratuita/attiva" className="link">Accedi</Link>
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="name" className="label">Nome e cognome</label>
        <input id="name" name="name" required autoComplete="name" className="field" />
      </div>
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="field" />
      </div>
      <label className="flex items-start gap-3 text-[14px] text-slate">
        <input type="checkbox" name="privacy" required className="mt-0.5 size-4 accent-codice" />
        <span>
          Ho letto l&apos;<Link href="/privacy" target="_blank" className="link">informativa privacy</Link>. Usiamo l&apos;email solo per la prova e per
          informarti sui corsi; puoi cancellarti quando vuoi.
        </span>
      </label>
      {state && !state.ok && <p role="alert" className="text-[14px] text-ceralacca">{state.error}</p>}
      <button className="btn-primary btn-lg btn-shine w-full" disabled={pending}>{pending ? "Un attimo…" : "Voglio la traccia gratuita"}</button>
    </form>
  );
}

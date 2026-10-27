"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/area/actions";
import type { ActionResult, Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateProfile, null);

  return (
    <form action={action} className="panel max-w-xl space-y-5 p-6">
      <div>
        <label htmlFor="full_name" className="label">Nome e cognome</label>
        <input id="full_name" name="full_name" defaultValue={profile.full_name} required className="field" autoComplete="name" />
      </div>
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" value={profile.email} readOnly disabled className="field bg-paper text-slate" />
        <p className="hint">È l&apos;email con cui accedi. Per cambiarla o per cancellare l&apos;account scrivi alla segreteria.</p>
      </div>
      <div>
        <label htmlFor="phone" className="label">Telefono (facoltativo)</label>
        <input id="phone" name="phone" defaultValue={profile.phone ?? ""} className="field" autoComplete="tel" inputMode="tel" />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Salvataggio…" : "Salva modifiche"}</button>
        {state && (state.ok ? (
          <p role="status" className="text-sm text-codice">{state.message}</p>
        ) : (
          <p role="alert" className="text-sm text-ceralacca">{state.error}</p>
        ))}
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/area/actions";
import type { ActionResult, Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateProfile, null);

  return (
    <form action={action} className="panel space-y-5 p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold">I tuoi dati</h2>
      <div>
        <label htmlFor="full_name" className="label">Nome e cognome</label>
        <input id="full_name" name="full_name" defaultValue={profile.full_name} required className="field" autoComplete="name" />
      </div>
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" value={profile.email} readOnly disabled className="field bg-paper text-slate" />
        <p className="hint">È l&apos;email con cui accedi. Per cambiarla o per cancellare l&apos;account scrivi alla segreteria.</p>
      </div>
      {profile.role === "student" && (
        <div>
          <label htmlFor="exam_subject" className="label">Materia scelta per l&apos;esame</label>
          <select id="exam_subject" name="exam_subject" defaultValue={profile.exam_subject ?? ""} className="field">
            <option value="">Non ho ancora deciso</option>
            <option value="civile">Diritto civile</option>
            <option value="penale">Diritto penale</option>
            <option value="amministrativo">Diritto amministrativo</option>
          </select>
          <p className="hint">Il parere e l&apos;atto si svolgono nella materia che scegli. I docenti la vedono per proporti le tracce giuste.</p>
        </div>
      )}
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

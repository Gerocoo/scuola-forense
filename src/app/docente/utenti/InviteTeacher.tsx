"use client";

import { useRef, useState, useTransition } from "react";
import { inviteTeacher, revokeInvite } from "@/app/docente/actions";

export function InviteTeacher() {
  const form = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      ref={form}
      action={(fd) =>
        start(async () => {
          const res = await inviteTeacher(fd);
          setMsg(res.ok ? { ok: true, text: res.message ?? "Fatto." } : { ok: false, text: res.error });
          if (res.ok) form.current?.reset();
        })
      }
      className="space-y-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label htmlFor="invite-email" className="label">Email del docente</label>
          <input id="invite-email" name="email" type="email" required placeholder="nome.cognome@gmail.com" className="field" />
        </div>
        <div>
          <label htmlFor="invite-role" className="label">Ruolo</label>
          <select id="invite-role" name="role" className="field w-auto" defaultValue="teacher">
            <option value="teacher">Docente</option>
            <option value="admin">Amministratore</option>
          </select>
        </div>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Invio…" : "Invita"}
        </button>
      </div>
      {msg && (
        <p role="status" className={`rounded-[12px] px-3 py-2 text-[14px] ${msg.ok ? "bg-codice-soft text-codice" : "bg-ceralacca-soft text-ceralacca"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}

export function RevokeInvite({ email }: { email: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => void (await revokeInvite(email)))}
      className="btn-ghost btn-sm text-ceralacca"
    >
      {pending ? "…" : "Annulla invito"}
    </button>
  );
}

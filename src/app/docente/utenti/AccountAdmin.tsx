"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeUserEmail, deleteUserAccount } from "@/app/docente/actions";

/** Pulsante "Elimina" con conferma: bisogna riscrivere ELIMINA per evitare errori. */
export function DeleteUserButton({
  userId,
  name,
  isStaff,
  redirectTo,
  size = "sm",
}: {
  userId: string;
  name: string;
  isStaff: boolean;
  redirectTo?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`btn-ghost ${size === "sm" ? "btn-sm" : ""} text-ceralacca`}>
        Elimina
      </button>
    );
  }

  return (
    <div className="w-full max-w-md rounded-[14px] bg-ceralacca-soft p-4 text-left text-[14px] leading-relaxed text-ink">
      <p className="font-semibold text-ceralacca">Eliminare {name}?</p>
      <p className="mt-1 text-slate">
        {isStaff
          ? "L'account viene cancellato. Le sue esercitazioni, correzioni e conversazioni passano a te, così i discenti non perdono nulla."
          : "Vengono cancellati per sempre account, iscrizioni, elaborati, correzioni, messaggi e appunti. I pagamenti restano su Stripe. Non si può annullare."}
      </p>
      <label className="mt-3 block text-[14px] text-slate" htmlFor={`del-${userId}`}>
        Scrivi <strong className="text-ink">ELIMINA</strong> per confermare
      </label>
      <input id={`del-${userId}`} className="field mt-1 py-1.5" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      {error && <p role="alert" className="mt-2 text-ceralacca">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn-danger btn-sm"
          disabled={typed.trim().toUpperCase() !== "ELIMINA" || pending}
          onClick={() =>
            start(async () => {
              const res = await deleteUserAccount(userId);
              if (!res.ok) return setError(res.error);
              if (redirectTo) router.replace(redirectTo);
              else router.refresh();
            })
          }
        >
          {pending ? "Eliminazione…" : "Elimina definitivamente"}
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => { setOpen(false); setTyped(""); setError(null); }}>
          Annulla
        </button>
      </div>
    </div>
  );
}

/** Modulo per cambiare l'email di accesso di un utente. */
export function ChangeEmailForm({ userId, email }: { userId: string; email: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await changeUserEmail(userId, fd);
          setMsg(res.ok ? { ok: true, text: res.message ?? "Fatto." } : { ok: false, text: res.error });
        })
      }
      className="space-y-2"
    >
      <label htmlFor={`email-${userId}`} className="label">Email di accesso</label>
      <div className="flex flex-wrap gap-2">
        <input id={`email-${userId}`} name="email" type="email" defaultValue={email} required className="field min-w-[220px] flex-1" />
        <button className="btn-secondary" disabled={pending}>{pending ? "Salvataggio…" : "Cambia email"}</button>
      </div>
      <p className="hint">Se accede con Google, deve usare un account Google con il nuovo indirizzo.</p>
      {msg && <p role="status" className={`text-[14px] ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
    </form>
  );
}

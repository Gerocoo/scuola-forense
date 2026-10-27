"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendMessage, type MessageState } from "@/app/actions/messages";

export function MessageComposer({
  otherId,
  otherName,
  assignments = [],
  defaultAssignment,
}: {
  otherId: string;
  otherName: string;
  assignments?: { id: string; title: string }[];
  defaultAssignment?: string;
}) {
  const [state, action, pending] = useActionState<MessageState, FormData>(sendMessage, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && state.sentAt) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="panel p-4">
      <input type="hidden" name="other" value={otherId} />
      <label htmlFor="body" className="sr-only">Messaggio per {otherName}</label>
      <textarea
        id="body"
        name="body"
        rows={4}
        required
        maxLength={8000}
        placeholder={`Scrivi a ${otherName}…`}
        className="field resize-y font-serif text-[17px] leading-relaxed"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") formRef.current?.requestSubmit();
        }}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {assignments.length > 0 ? (
          <label className="flex items-center gap-2 text-sm text-slate">
            Riguarda
            <select name="assignment_id" defaultValue={defaultAssignment ?? ""} className="field w-auto py-1.5 text-sm">
              <option value="">Nessuna esercitazione</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </label>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {state.error && <p role="alert" className="text-sm text-ceralacca">{state.error}</p>}
          {state.ok && !pending && <p role="status" className="text-sm text-codice">Inviato</p>}
          <button className="btn-primary" disabled={pending}>{pending ? "Invio…" : "Invia messaggio"}</button>
        </div>
      </div>
    </form>
  );
}

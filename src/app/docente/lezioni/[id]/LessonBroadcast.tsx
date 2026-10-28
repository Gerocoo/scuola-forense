"use client";

import { useState, useTransition } from "react";
import { messageLessonParticipants } from "@/app/actions/meetings";

/** Scrive a tutti i partecipanti dell'incontro attraverso i Messaggi della piattaforma. */
export function LessonBroadcast({ lessonId, count, label }: { lessonId: string; count: number; label: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (!open)
    return (
      <div className="mt-3">
        <button type="button" className="btn-secondary btn-sm" onClick={() => setOpen(true)}>
          {label}
        </button>
        {msg?.ok && <p role="status" className="mt-2 text-[14px] text-codice">{msg.text}</p>}
      </div>
    );

  return (
    <form
      className="mt-3 space-y-2"
      action={() =>
        start(async () => {
          const res = await messageLessonParticipants(lessonId, text);
          setMsg(res.ok ? { ok: true, text: res.message ?? "Inviato." } : { ok: false, text: res.error });
          if (res.ok) {
            setText("");
            setOpen(false);
          }
        })
      }
    >
      <label className="label" htmlFor={`bc-${lessonId}`}>
        Messaggio a {count} {count === 1 ? "discente" : "discenti"}
      </label>
      <textarea
        id={`bc-${lessonId}`}
        rows={4}
        required
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="field"
        placeholder="Es. l'incontro si sposta in aula 3, portate il codice civile."
      />
      <p className="text-[13px] text-mute">Arriva nei Messaggi della piattaforma di ciascuno, con una notifica.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary btn-sm" disabled={pending || !text.trim()}>{pending ? "Invio…" : "Invia"}</button>
        <button type="button" className="text-[14px] text-mute" onClick={() => setOpen(false)}>Annulla</button>
        {msg && !msg.ok && <p role="alert" className="text-[14px] text-ceralacca">{msg.text}</p>}
      </div>
    </form>
  );
}

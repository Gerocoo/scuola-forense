"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAssignment, setAssignmentStatus, updateAssignment } from "@/app/docente/actions";
import type { AssignmentStatus } from "@/lib/types";

export function AssignmentAdmin({
  id,
  status,
  title,
  instructions,
  dueLocal,
}: {
  id: string;
  status: AssignmentStatus;
  title: string;
  instructions: string;
  dueLocal: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="panel space-y-3 p-4">
      {editing ? (
        <form
          action={(fd) =>
            start(async () => {
              const res = await updateAssignment(id, fd);
              setMsg(res.ok ? { ok: true, text: res.message ?? "Salvato." } : { ok: false, text: res.error });
              if (res.ok) setEditing(false);
              router.refresh();
            })
          }
          className="space-y-3"
        >
          <div>
            <label className="label" htmlFor="e-title">Titolo</label>
            <input id="e-title" name="title" defaultValue={title} className="field" required />
          </div>
          <div>
            <label className="label" htmlFor="e-instr">Istruzioni</label>
            <textarea id="e-instr" name="instructions" defaultValue={instructions} rows={5} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="e-due">Scadenza</label>
            <input id="e-due" name="due" type="datetime-local" defaultValue={dueLocal} className="field" />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary btn-sm" disabled={pending}>Salva</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(false)}>Annulla</button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-secondary btn-sm w-full" onClick={() => setEditing(true)}>
          Modifica traccia e scadenza
        </button>
      )}

      {status !== "assegnato" && (
        <button
          type="button"
          className="btn-secondary btn-sm w-full"
          disabled={pending}
          onClick={() => {
            if (!confirm("Il discente potrà modificare i file e consegnare di nuovo. Continuare?")) return;
            start(async () => {
              const res = await setAssignmentStatus(id, "assegnato");
              setMsg(res.ok ? { ok: true, text: "Il discente è stato avvisato via email." } : { ok: false, text: res.error });
              router.refresh();
            });
          }}
        >
          Chiedi di riconsegnare
        </button>
      )}

      <button
        type="button"
        className="btn-danger btn-sm w-full"
        disabled={pending}
        onClick={() => {
          if (!confirm("Eliminare questa esercitazione per questo discente? File consegnati e correzione andranno persi.")) return;
          start(() => deleteAssignment(id));
        }}
      >
        Elimina esercitazione
      </button>

      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
    </div>
  );
}

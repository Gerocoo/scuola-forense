"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Dropzone } from "@/components/app/Dropzone";
import { FileList } from "@/components/app/FileList";
import { uploadFile } from "@/lib/upload";
import { registerSubmissionFile, removeSubmissionFile, submitAssignment } from "@/app/area/actions";
import type { AssignmentFile, AssignmentStatus } from "@/lib/types";

export function SubmissionPanel({
  assignmentId,
  status,
  files,
}: {
  assignmentId: string;
  status: AssignmentStatus;
  files: AssignmentFile[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function handleFiles(list: File[]) {
    setError(null);
    setNotice(null);
    for (const f of list) {
      setUploading(f.name);
      try {
        const meta = await uploadFile(f, `svolgimenti/${assignmentId}`);
        const res = await registerSubmissionFile(assignmentId, meta);
        if (!res.ok) throw new Error(res.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Caricamento non riuscito.");
        break;
      }
    }
    setUploading(null);
    router.refresh();
  }

  function remove(id: string) {
    setError(null);
    start(async () => {
      const res = await removeSubmissionFile(id);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await submitAssignment(assignmentId);
      if (!res.ok) setError(res.error);
      else setNotice(status === "consegnato" ? "Consegna aggiornata. Il docente vedrà i file attuali." : "Elaborato consegnato al docente.");
      router.refresh();
    });
  }

  const busy = !!uploading || pending;

  return (
    <div className="mt-3 space-y-4">
      {status === "consegnato" && (
        <p className="rounded-[10px] bg-codice-soft px-4 py-3 text-[15px] text-codice">
          Hai già consegnato. Finché il docente non inizia la correzione puoi ancora sostituire o aggiungere file.
        </p>
      )}

      <FileList
        files={files}
        kind="esercitazione"
        renderAction={(f) => (
          <button type="button" onClick={() => remove(f.id)} disabled={busy} className="btn-ghost btn-sm text-ceralacca">
            Rimuovi
          </button>
        )}
      />

      <Dropzone onFiles={handleFiles} disabled={busy} label={files.length ? "Aggiungi altri file" : "Trascina qui il tuo elaborato o scegli dal computer"} />

      {uploading && <p role="status" className="text-sm text-slate">Caricamento di {uploading}…</p>}
      {error && <p role="alert" className="text-sm text-ceralacca">{error}</p>}
      {notice && <p role="status" className="text-sm text-codice">{notice}</p>}

      <div className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-4">
        <button type="button" onClick={submit} disabled={busy || !files.length} className="btn-primary">
          {pending ? "Invio…" : status === "consegnato" ? "Aggiorna la consegna" : "Consegna al docente"}
        </button>
        {!files.length && <span className="text-sm text-mute">Carica almeno un file per consegnare.</span>}
      </div>
    </div>
  );
}

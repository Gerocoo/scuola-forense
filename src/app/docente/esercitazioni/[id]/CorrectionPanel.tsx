"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Dropzone } from "@/components/app/Dropzone";
import { FileList } from "@/components/app/FileList";
import { uploadFile } from "@/lib/upload";
import {
  publishCorrection,
  registerTeacherFile,
  removeTeacherFile,
  saveReview,
  setAssignmentStatus,
} from "@/app/docente/actions";
import type { AssignmentFile, AssignmentStatus } from "@/lib/types";

const GRADES = ["Insufficiente", "Sufficiente", "Discreto", "Buono", "Ottimo"];

export function CorrectionPanel({
  assignmentId,
  status,
  files,
  initialFeedback,
  initialGrade,
}: {
  assignmentId: string;
  status: AssignmentStatus;
  files: AssignmentFile[];
  initialFeedback: string;
  initialGrade: string;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(initialFeedback);
  const [grade, setGrade] = useState(initialGrade);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const published = status === "corretto";
  const busy = pending || !!uploading;

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setError(null);
    setNotice(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Operazione non riuscita.");
      else if (res.message) setNotice(res.message);
      router.refresh();
    });
  }

  async function handleFiles(list: File[]) {
    setError(null);
    // aprire la correzione appena si carica il primo file
    if (status === "consegnato") await setAssignmentStatus(assignmentId, "in_correzione");
    for (const f of list) {
      setUploading(f.name);
      try {
        const meta = await uploadFile(f, `correzioni/${assignmentId}`);
        const res = await registerTeacherFile(assignmentId, "correzione", meta);
        if (!res.ok) throw new Error(res.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Caricamento non riuscito.");
        break;
      }
    }
    setUploading(null);
    router.refresh();
  }

  return (
    <section aria-labelledby="correzione" className="rounded-[var(--radius-panel)] border border-ceralacca/30 bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="correzione" className="text-lg font-semibold text-ceralacca">La tua correzione</h2>
          <p className="mt-1 text-[15px] text-slate">
            {published
              ? "Pubblicata: il discente la vede nella sua area."
              : "Correggi sul documento qui sopra oppure carica un file corretto. Il discente vede la correzione solo quando la pubblichi."}
          </p>
        </div>
        {status === "consegnato" && (
          <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => run(() => setAssignmentStatus(assignmentId, "in_correzione"))}>
            Prendi in carico
          </button>
        )}
      </div>

      <div className="mt-5 space-y-3">
        <p className="text-sm font-medium">File corretto (facoltativo)</p>
        <FileList
          files={files}
          kind="esercitazione"
          renderAction={(f) =>
            !published && (
              <button type="button" className="btn-ghost btn-sm text-ceralacca" disabled={busy} onClick={() => run(() => removeTeacherFile(f.id))}>
                Rimuovi
              </button>
            )
          }
        />
        {!published && <Dropzone onFiles={handleFiles} disabled={busy} label="Carica l'elaborato corretto" />}
        {uploading && <p role="status" className="text-sm text-slate">Caricamento di {uploading}…</p>}
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_200px]">
        <div className="sm:col-span-2">
          <label htmlFor="feedback" className="label">Commento per il discente</label>
          <textarea
            id="feedback"
            rows={8}
            className="field font-serif text-[17px] leading-relaxed"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={published}
            placeholder="Punti di forza, errori ricorrenti, cosa rivedere prima della prossima traccia."
          />
        </div>
        <div>
          <label htmlFor="grade" className="label">Giudizio</label>
          <input
            id="grade"
            list="grades"
            className="field"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            disabled={published}
            placeholder="Es. Discreto"
          />
          <datalist id="grades">
            {GRADES.map((g) => <option key={g} value={g} />)}
          </datalist>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-ceralacca">{error}</p>}
      {notice && <p role="status" className="mt-4 text-sm text-codice">{notice}</p>}

      <div className="mt-6 flex flex-wrap gap-3 border-t border-line-soft pt-5">
        {published ? (
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => run(() => setAssignmentStatus(assignmentId, "in_correzione"))}>
            Modifica la correzione
          </button>
        ) : (
          <>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => run(() => publishCorrection(assignmentId, feedback, grade))}>
              Pubblica la correzione
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => run(() => saveReview(assignmentId, feedback, grade))}>
              Salva bozza
            </button>
          </>
        )}
      </div>
    </section>
  );
}

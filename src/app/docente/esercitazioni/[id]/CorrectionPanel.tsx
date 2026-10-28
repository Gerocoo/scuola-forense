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
import { CRITERIA, MAX_PER_CRITERION, PASS_MARK, totalOf, type Scores } from "@/lib/grading";

const GRADES = ["Insufficiente", "Sufficiente", "Discreto", "Buono", "Ottimo"];

export function CorrectionPanel({
  assignmentId,
  status,
  files,
  initialFeedback,
  initialGrade,
  initialScores,
}: {
  assignmentId: string;
  status: AssignmentStatus;
  files: AssignmentFile[];
  initialFeedback: string;
  initialGrade: string;
  initialScores?: Scores | null;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(initialFeedback);
  const [grade, setGrade] = useState(initialGrade);
  const [scores, setScores] = useState<Scores>(initialScores ?? {});
  const total = totalOf(scores);
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
    <section aria-labelledby="correzione" className="rounded-[var(--radius-panel)] border border-ceralacca/30 bg-surface p-4 sm:p-6">
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

      <div className="mt-6 rounded-[16px] border border-line p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[15px] font-semibold">Griglia di valutazione</p>
          <p className="text-[14px] text-slate">
            Totale{" "}
            <strong className={`text-[20px] tabular-nums ${total === null ? "text-mute" : total >= PASS_MARK ? "text-codice" : "text-ceralacca"}`}>
              {total ?? "—"}
            </strong>
            <span className="text-mute">/30</span>
            {total !== null && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[13px] font-medium ${total >= PASS_MARK ? "bg-codice-soft text-codice" : "bg-ceralacca-soft text-ceralacca"}`}>
                {total >= PASS_MARK ? "Sufficiente" : "Insufficiente"}
              </span>
            )}
          </p>
        </div>
        <p className="mt-1 text-[14px] text-mute">I criteri della prova scritta. Ogni voce da 1 a {MAX_PER_CRITERION}; sufficienza a {PASS_MARK}/30.</p>
        <div className="mt-4 space-y-3">
          {CRITERIA.map((c) => (
            <div key={c.key} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="text-[15px] font-medium">{c.label}</p>
                <p className="text-[13px] text-mute">{c.hint}</p>
              </div>
              <div className="flex gap-1" role="radiogroup" aria-label={c.label}>
                {Array.from({ length: MAX_PER_CRITERION }, (_, i) => i + 1).map((v) => {
                  const on = scores[c.key] === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={published}
                      onClick={() => setScores((s) => ({ ...s, [c.key]: s[c.key] === v ? undefined : v }))}
                      className={`size-9 rounded-[10px] text-[15px] font-semibold tabular-nums transition-colors ${
                        on ? (v >= 4 ? "bg-codice text-white" : v === 3 ? "bg-ambra text-white" : "bg-ceralacca text-white") : "bg-paper text-slate hover:bg-line-soft"
                      } disabled:cursor-default`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
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

      <div className="mt-6 flex flex-col gap-3 border-t border-line-soft pt-5 sm:flex-row sm:flex-wrap">
        {published ? (
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => run(() => setAssignmentStatus(assignmentId, "in_correzione"))}>
            Modifica la correzione
          </button>
        ) : (
          <>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => run(() => publishCorrection(assignmentId, feedback, grade, scores))}>
              Pubblica la correzione
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => run(() => saveReview(assignmentId, feedback, grade, scores))}>
              Salva bozza
            </button>
          </>
        )}
      </div>
    </section>
  );
}

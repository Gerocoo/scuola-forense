"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Dropzone } from "@/components/app/Dropzone";
import { FileIcon } from "@/components/app/FileList";
import { uploadFile } from "@/lib/upload";
import { saveCollectiveReview } from "@/app/docente/actions";
import type { UploadedMeta } from "@/lib/types";

export function CollectiveReview({
  exerciseId,
  initial,
  dueAt,
}: {
  exerciseId: string;
  initial: { solution: string; commonErrors: string; reviewUrl: string; files: UploadedMeta[]; published: boolean };
  dueAt: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [solution, setSolution] = useState(initial.solution);
  const [errors, setErrors] = useState(initial.commonErrors);
  const [url, setUrl] = useState(initial.reviewUrl);
  const [files, setFiles] = useState<UploadedMeta[]>(initial.files);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  async function add(list: File[]) {
    for (const f of list) {
      setBusy(`Caricamento di ${f.name}…`);
      try {
        const meta = await uploadFile(f, `soluzioni/${exerciseId}`);
        setFiles((x) => [...x, meta]);
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : "Caricamento non riuscito." });
      }
    }
    setBusy(null);
  }

  function save(publish: boolean) {
    setMsg(null);
    start(async () => {
      const res = await saveCollectiveReview(exerciseId, { solution, commonErrors: errors, reviewUrl: url, files, publish });
      setMsg(res.ok ? { ok: true, text: res.message ?? "Salvato." } : { ok: false, text: res.error });
      router.refresh();
    });
  }

  const waiting = dueAt && new Date(dueAt) > new Date();

  return (
    <div className="border-t border-line-soft px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[15px] font-semibold">
          Correzione collettiva{" "}
          {initial.published ? (
            <span className="ml-1 rounded-full bg-codice-soft px-2 py-0.5 text-[12px] font-medium text-codice">{waiting ? "Pubblicata, visibile dopo la scadenza" : "Pubblicata"}</span>
          ) : (
            <span className="ml-1 rounded-full bg-line-soft px-2 py-0.5 text-[12px] font-medium text-slate">Da preparare</span>
          )}
        </p>
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-[14px] font-medium text-codice hover:underline">
          {open ? "Chiudi" : initial.published ? "Modifica" : "Prepara"}
        </button>
      </div>
      {open && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor={`sol-${exerciseId}`}>Traccia svolta</label>
            <textarea
              id={`sol-${exerciseId}`}
              rows={8}
              className="field font-serif text-[16px] leading-relaxed"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="Lo svolgimento modello: impostazione, norme, giurisprudenza, soluzione."
            />
          </div>
          <div>
            <label className="label" htmlFor={`err-${exerciseId}`}>Errori più frequenti</label>
            <textarea
              id={`err-${exerciseId}`}
              rows={5}
              className="field"
              value={errors}
              onChange={(e) => setErrors(e.target.value)}
              placeholder={"Uno per riga, ad esempio:\nMancata individuazione dell'atto corretto\nConclusioni non coerenti con la motivazione"}
            />
          </div>
          <div>
            <label className="label" htmlFor={`url-${exerciseId}`}>Link alla correzione in classe (facoltativo)</label>
            <input id={`url-${exerciseId}`} className="field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://zoom.us/… oppure il link della registrazione" />
          </div>
          <div className="space-y-2">
            <p className="label">File (facoltativi)</p>
            {files.length > 0 && (
              <ul className="divide-y divide-line-soft rounded-[12px] border border-line">
                {files.map((f, i) => (
                  <li key={f.path} className="flex items-center gap-3 px-3 py-2">
                    <FileIcon name={f.name} />
                    <span className="min-w-0 flex-1 truncate text-[14px]">{f.name}</span>
                    <button type="button" className="text-[14px] text-ceralacca" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}>
                      Rimuovi
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Dropzone onFiles={add} disabled={!!busy} label="Aggiungi la traccia svolta in PDF o Word" />
            {busy && <p className="text-[14px] text-slate">{busy}</p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn-primary" disabled={pending || !!busy} onClick={() => save(true)}>
              {initial.published ? "Aggiorna e pubblica" : "Pubblica"}
            </button>
            <button type="button" className="btn-secondary" disabled={pending || !!busy} onClick={() => save(false)}>
              {initial.published ? "Ritira la pubblicazione" : "Salva bozza"}
            </button>
          </div>
          {waiting && <p className="hint">I discenti la vedranno solo dopo la scadenza, per non anticipare la soluzione.</p>}
          {msg && <p role="status" className={`text-[14px] ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
        </div>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelCorrection, requestCorrection } from "@/app/actions/corrections";
import { SubmitButton } from "@/components/ui/SubmitButton";

type Track = { id: string; label: string };

export function CorrectionRequestForm({ tracks }: { tracks: Track[] }) {
  const [source, setSource] = useState<"archivio" | "mia">(tracks.length ? "archivio" : "mia");
  return (
    <form action={requestCorrection} className="space-y-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Traccia">
        {tracks.length > 0 && (
          <button type="button" role="radio" aria-checked={source === "archivio"} onClick={() => setSource("archivio")} className={`rounded-full px-3.5 py-1.5 text-[14px] ${source === "archivio" ? "bg-ink text-white" : "border border-line"}`}>
            Traccia dall&apos;archivio
          </button>
        )}
        <button type="button" role="radio" aria-checked={source === "mia"} onClick={() => setSource("mia")} className={`rounded-full px-3.5 py-1.5 text-[14px] ${source === "mia" ? "bg-ink text-white" : "border border-line"}`}>
          Un&apos;altra traccia
        </button>
      </div>
      {source === "archivio" ? (
        <div>
          <label className="label" htmlFor="track_id">Traccia</label>
          <select id="track_id" name="track_id" required defaultValue="" className="field">
            <option value="" disabled>Scegli la traccia che hai svolto</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div>
              <label className="label" htmlFor="title">Titolo</label>
              <input id="title" name="title" required maxLength={200} className="field" placeholder="Es. Atto di appello: truffa aggravata" />
            </div>
            <div>
              <label className="label" htmlFor="kind">Tipo</label>
              <select id="kind" name="kind" defaultValue="atto" className="field">
                <option value="atto">Atto</option>
                <option value="parere">Parere</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="instructions">Testo della traccia</label>
            <textarea id="instructions" name="instructions" rows={6} required className="field font-serif text-[16px] leading-relaxed" placeholder="Incolla il testo della traccia che hai svolto." />
          </div>
        </>
      )}
      <SubmitButton pendingLabel="Preparazione…">Usa una correzione e carica l&apos;elaborato</SubmitButton>
      <p className="text-[13px] text-mute">Nella pagina successiva carichi il file del tuo elaborato e lo consegni: il docente lo corregge entro 7 giorni.</p>
    </form>
  );
}

export function CancelCorrection({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-[13px] text-mute hover:text-ceralacca"
      onClick={() => {
        if (!confirm("Annullare la richiesta? La correzione torna disponibile.")) return;
        start(async () => {
          await cancelCorrection(id);
          router.refresh();
        });
      }}
    >
      Annulla richiesta
    </button>
  );
}

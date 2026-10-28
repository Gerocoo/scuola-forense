"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Dropzone } from "@/components/app/Dropzone";
import { uploadFile } from "@/lib/upload";
import { deletePastTrack, savePastTrack, setPastTrackFree } from "@/app/docente/actions";
import type { UploadedMeta } from "@/lib/types";

export function TrackForm() {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<UploadedMeta | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  async function pick(list: File[]) {
    const f = list[0];
    if (!f) return;
    setBusy(true);
    try {
      setFile(await uploadFile(f, "archivio"));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Caricamento non riuscito." });
    }
    setBusy(false);
  }

  return (
    <form
      ref={form}
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          const res = await savePastTrack({
            year: Number(fd.get("year")),
            session: String(fd.get("session") ?? ""),
            subject: String(fd.get("subject") ?? ""),
            kind: String(fd.get("kind") ?? ""),
            title: String(fd.get("title") ?? ""),
            body: String(fd.get("body") ?? ""),
            free: fd.get("free") === "on",
            file,
          });
          setMsg(res.ok ? { ok: true, text: res.message ?? "Fatto." } : { ok: false, text: res.error });
          if (res.ok) {
            form.current?.reset();
            setFile(null);
          }
          router.refresh();
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className="label" htmlFor="year">Anno</label>
          <input id="year" name="year" type="number" min={1990} max={2100} defaultValue={new Date().getFullYear() - 1} required className="field" />
        </div>
        <div>
          <label className="label" htmlFor="subject">Materia</label>
          <select id="subject" name="subject" className="field" defaultValue="civile">
            <option value="civile">Civile</option>
            <option value="penale">Penale</option>
            <option value="amministrativo">Amministrativo</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="kind">Prova</label>
          <select id="kind" name="kind" className="field" defaultValue="parere">
            <option value="parere">Parere</option>
            <option value="atto">Atto</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="session">Sessione</label>
          <input id="session" name="session" className="field" placeholder="Es. dicembre" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="title">Titolo</label>
        <input id="title" name="title" required className="field" placeholder="Es. Parere in materia di responsabilità contrattuale" />
      </div>
      <div>
        <label className="label" htmlFor="body">Testo della traccia</label>
        <textarea id="body" name="body" rows={6} className="field font-serif text-[16px] leading-relaxed" placeholder="Incolla qui la traccia, oppure allega il file." />
      </div>
      {file ? (
        <p className="flex items-center justify-between gap-3 rounded-[12px] bg-paper px-3 py-2 text-[14px]">
          <span className="truncate">{file.name}</span>
          <button type="button" className="text-ceralacca" onClick={() => setFile(null)}>Rimuovi</button>
        </p>
      ) : (
        <Dropzone onFiles={pick} disabled={busy} label={busy ? "Caricamento…" : "Allega il file della traccia (facoltativo)"} />
      )}
      <label className="flex items-center gap-2 text-[15px]">
        <input type="checkbox" name="free" className="size-4 accent-codice" />
        Gratuita: visibile a tutti gli utenti registrati, anche senza corso
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending || busy}>{pending ? "Salvataggio…" : "Aggiungi all'archivio"}</button>
        {msg && <p role="status" className={`text-[14px] ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}

export function DeleteTrack({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="btn-ghost btn-sm text-ceralacca"
      onClick={() => {
        if (!confirm("Eliminare questa traccia dall'archivio?")) return;
        start(async () => {
          await deletePastTrack(id);
          router.refresh();
        });
      }}
    >
      Elimina
    </button>
  );
}

export function ToggleFree({ id, free }: { id: string; free: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={`btn-sm ${free ? "btn-secondary" : "btn-ghost"}`}
      onClick={() =>
        start(async () => {
          await setPastTrackFree(id, !free);
          router.refresh();
        })
      }
    >
      {pending ? "…" : free ? "Rendi a pagamento" : "Rendi gratuita"}
    </button>
  );
}

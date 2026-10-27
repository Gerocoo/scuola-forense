"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { refreshVideoStatus, removeVideo, startVideoUpload } from "@/app/docente/actions";
import type { VideoStatus } from "@/lib/types";

const MAX_BYTES = 20 * 1024 * 1024 * 1024; // 20 GB

const STATUS_TEXT: Record<VideoStatus, string> = {
  none: "",
  uploading: "Caricamento non completato. Ricarica il file.",
  processing: "Bunny sta preparando il video per lo streaming. Di solito servono pochi minuti; puoi chiudere la pagina.",
  ready: "Video pronto: i discenti lo vedono quando la lezione è pubblicata.",
  error: "Elaborazione non riuscita. Prova a caricare di nuovo il file, preferibilmente in MP4.",
};

export function VideoUploader({
  lessonId,
  status,
  hasVideo,
  previewUrl,
  configured,
  isRecording,
}: {
  lessonId: string;
  status: VideoStatus;
  hasVideo: boolean;
  previewUrl: string | null;
  configured: boolean;
  isRecording: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Durante l'elaborazione controlla lo stato ogni 15 secondi.
  useEffect(() => {
    if (status !== "processing") return;
    const t = setInterval(async () => {
      await refreshVideoStatus(lessonId);
      router.refresh();
    }, 15000);
    return () => clearInterval(t);
  }, [status, lessonId, router]);

  // Avvisa se si chiude la pagina durante il caricamento.
  useEffect(() => {
    if (progress === null) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [progress]);

  async function upload(file: File) {
    setError(null);
    if (!file.type.startsWith("video/")) return setError("Scegli un file video (MP4, MOV, MKV…).");
    if (file.size > MAX_BYTES) return setError("Il file supera i 20 GB.");

    const res = await startVideoUpload(lessonId);
    if (!res.ok) return setError(res.error);

    const tus = await import("tus-js-client");
    setFileName(file.name);
    setProgress(0);

    const u = new tus.Upload(file, {
      endpoint: res.upload.endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
      chunkSize: 50 * 1024 * 1024,
      headers: {
        AuthorizationSignature: res.upload.signature,
        AuthorizationExpire: String(res.upload.expire),
        VideoId: res.upload.videoId,
        LibraryId: res.upload.libraryId,
      },
      metadata: { filetype: file.type, title: file.name },
      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
      onError: (err) => {
        console.error(err);
        setProgress(null);
        setError("Caricamento interrotto. Controlla la connessione e riprova.");
      },
      onSuccess: async () => {
        setProgress(null);
        await refreshVideoStatus(lessonId, true);
        router.refresh();
      },
    });
    u.start();
  }

  if (!configured) {
    return (
      <div className="panel p-5">
        <h2 className="font-semibold">{isRecording ? "Registrazione dell'incontro" : "Video"}</h2>
        <p className="mt-2 text-sm text-slate">
          Il caricamento diretto dei video si attiva inserendo le chiavi di Bunny Stream (vedi README). Nel frattempo carica il video su YouTube
          come &laquo;Non in elenco&raquo; e incolla il link nel modulo della lezione.
        </p>
      </div>
    );
  }

  const uploading = progress !== null;

  return (
    <div className="panel space-y-4 p-5">
      <div>
        <h2 className="font-semibold">{isRecording ? "Registrazione dell'incontro" : "Video della lezione"}</h2>
        {isRecording && !hasVideo && (
          <p className="mt-1 text-sm text-slate">Dopo l&apos;incontro carica qui la registrazione: i discenti potranno rivederla.</p>
        )}
      </div>

      {hasVideo && status === "ready" && previewUrl && (
        <div className="overflow-hidden rounded-[8px] bg-ink">
          <iframe src={previewUrl} title="Anteprima video" className="aspect-video w-full" allow="fullscreen; picture-in-picture; encrypted-media" allowFullScreen />
        </div>
      )}

      {hasVideo && !uploading && STATUS_TEXT[status] && (
        <p className={`text-sm ${status === "error" || status === "uploading" ? "text-ceralacca" : status === "ready" ? "text-codice" : "text-slate"}`}>
          {status === "processing" && (
            <span aria-hidden className="mr-2 inline-block size-2 animate-pulse rounded-full bg-ambra align-middle" />
          )}
          {STATUS_TEXT[status]}
        </p>
      )}

      {uploading && (
        <div role="status" aria-live="polite">
          <div className="flex justify-between text-sm">
            <span className="truncate pr-3">{fileName}</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line-soft">
            <div className="h-full rounded-full bg-codice transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-mute">Non chiudere questa pagina finché il caricamento non è finito.</p>
        </div>
      )}

      <input
        ref={input}
        type="file"
        accept="video/*"
        className="sr-only"
        aria-label="Scegli il file video"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />

      {!uploading && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={hasVideo ? "btn-secondary btn-sm" : "btn-primary btn-sm"} onClick={() => input.current?.click()} disabled={pending}>
            {hasVideo ? "Sostituisci video" : isRecording ? "Carica la registrazione" : "Carica il video"}
          </button>
          {hasVideo && (
            <button
              type="button"
              className="btn-ghost btn-sm text-ceralacca"
              disabled={pending}
              onClick={() => {
                if (!confirm("Eliminare il video? I discenti non potranno più vederlo.")) return;
                start(async () => {
                  await removeVideo(lessonId);
                  router.refresh();
                });
              }}
            >
              Elimina video
            </button>
          )}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-ceralacca">{error}</p>}
      <p className="text-xs text-mute">MP4 consigliato, fino a 20 GB. Se la connessione cade, il caricamento riprende da dove si era fermato.</p>
    </div>
  );
}

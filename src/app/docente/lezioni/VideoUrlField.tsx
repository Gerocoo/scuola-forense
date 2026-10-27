"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Video = {
  id: string;
  title: string;
  thumb: string | null;
  publishedAt: string;
  privacy: "public" | "unlisted" | "private";
  durationMin: number | null;
};

const PRIVACY: Record<Video["privacy"], { label: string; cls: string }> = {
  unlisted: { label: "Non in elenco", cls: "bg-codice-soft text-codice" },
  public: { label: "Pubblico", cls: "bg-ambra-soft text-ambra" },
  private: { label: "Privato", cls: "bg-ceralacca-soft text-ceralacca" },
};

const ytId = (url: string) => {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube")) return u.searchParams.get("v") ?? u.pathname.split("/").filter(Boolean).pop() ?? null;
  } catch {
    /* non è un link */
  }
  return null;
};

/**
 * Campo "video" del modulo lezione: si può scegliere dalla galleria del canale YouTube
 * collegato oppure incollare un link. Il valore inviato al server resta `video_url`.
 */
export function VideoUrlField({
  defaultValue,
  label,
  hint,
  durationInputId,
}: {
  defaultValue: string;
  label: string;
  hint: string;
  durationInputId?: string;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [picked, setPicked] = useState<Video | null>(null);
  const [showManual, setShowManual] = useState(!!defaultValue && !ytId(defaultValue));
  const dialog = useRef<HTMLDialogElement>(null);

  const [videos, setVideos] = useState<Video[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "non-collegato" | "errore">("idle");
  const [q, setQ] = useState("");

  const load = useCallback(async (page?: string) => {
    setState("loading");
    try {
      const res = await fetch(`/api/youtube/videos${page ? `?page=${encodeURIComponent(page)}` : ""}`);
      if (res.status === 409) return setState("non-collegato");
      if (!res.ok) return setState("errore");
      const data = (await res.json()) as { items: Video[]; nextPageToken: string | null };
      setVideos((v) => (page ? [...v, ...data.items] : data.items));
      setNext(data.nextPageToken);
      setState("ready");
    } catch {
      setState("errore");
    }
  }, []);

  const openPicker = () => {
    dialog.current?.showModal();
    if (state === "idle" || state === "errore") void load();
  };

  const choose = (v: Video) => {
    setUrl(`https://youtu.be/${v.id}`);
    setPicked(v);
    if (durationInputId && v.durationMin) {
      const d = document.getElementById(durationInputId) as HTMLInputElement | null;
      if (d && !d.value) d.value = String(v.durationMin);
    }
    dialog.current?.close();
  };

  // anteprima del video già scelto
  const currentId = url ? ytId(url) : null;
  useEffect(() => {
    if (picked && picked.id !== currentId) setPicked(null);
  }, [currentId, picked]);

  const filtered = q.trim() ? videos.filter((v) => v.title.toLowerCase().includes(q.trim().toLowerCase())) : videos;

  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name="video_url" value={url} />

      {currentId ? (
        <div className="flex items-center gap-4 rounded-[14px] bg-paper p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={picked?.thumb ?? `https://i.ytimg.com/vi/${currentId}/mqdefault.jpg`} alt="" className="aspect-video w-32 shrink-0 rounded-[8px] object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{picked?.title ?? "Video YouTube"}</p>
            {picked && (
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[12px] font-medium ${PRIVACY[picked.privacy].cls}`}>
                {PRIVACY[picked.privacy].label}
              </span>
            )}
            {picked?.privacy === "private" && (
              <p className="mt-1 text-[13px] text-ceralacca">I video privati non si vedono sulla piattaforma: su YouTube impostalo come «Non in elenco».</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <button type="button" className="btn-secondary btn-sm" onClick={openPicker}>Cambia</button>
            <button type="button" className="btn-ghost btn-sm text-ceralacca" onClick={() => setUrl("")}>Togli</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={openPicker} className="flex w-full items-center gap-4 rounded-[14px] border-2 border-dashed border-line bg-surface p-4 text-left transition-colors hover:border-codice">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#ff0033]">
            <svg viewBox="0 0 24 24" className="size-5 text-white"><path d="M9.5 8.2v7.6L16 12z" fill="currentColor" /></svg>
          </span>
          <span>
            <span className="block font-medium text-ink">Scegli dal canale YouTube</span>
            <span className="block text-[13px] text-mute">Si apre l&apos;elenco dei video della scuola</span>
          </span>
        </button>
      )}

      {showManual ? (
        <div className="mt-3">
          <label htmlFor="video_url_manual" className="text-[13px] text-mute">Oppure incolla un link (YouTube, Vimeo o file video)</label>
          <input id="video_url_manual" type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="field mt-1" placeholder="https://…" />
        </div>
      ) : (
        <button type="button" onClick={() => setShowManual(true)} className="mt-2 text-[13px] text-mute underline underline-offset-4 hover:text-ink">
          Preferisci incollare un link?
        </button>
      )}
      <p className="hint">{hint}</p>

      <dialog
        ref={dialog}
        className="m-auto w-[min(920px,calc(100vw-2rem))] rounded-[24px] bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-center gap-4 border-b border-line-soft px-6 py-4">
            <h2 className="flex-1 text-[19px] font-semibold">Video del canale</h2>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per titolo" className="field w-52 py-2" aria-label="Cerca video" />
            <button type="button" onClick={() => dialog.current?.close()} className="btn-ghost btn-sm" aria-label="Chiudi">Chiudi</button>
          </div>

          <div className="overflow-y-auto p-6">
            {state === "loading" && !videos.length && <p className="py-10 text-center text-slate">Carico i video del canale…</p>}
            {state === "non-collegato" && (
              <div className="py-10 text-center">
                <p className="font-medium">Il canale YouTube non è ancora collegato.</p>
                <p className="mt-1 text-slate">Si collega una volta sola da Impostazioni.</p>
                <a href="/docente/impostazioni" className="btn-primary mt-5">Vai a Impostazioni</a>
              </div>
            )}
            {state === "errore" && (
              <div className="py-10 text-center">
                <p className="font-medium">Non riesco a leggere i video del canale.</p>
                <p className="mt-1 text-slate">Il collegamento potrebbe essere scaduto: ricollegalo da Impostazioni.</p>
                <div className="mt-5 flex justify-center gap-2">
                  <button type="button" className="btn-secondary" onClick={() => void load()}>Riprova</button>
                  <a href="/docente/impostazioni" className="btn-primary">Impostazioni</a>
                </div>
              </div>
            )}
            {state !== "non-collegato" && state !== "errore" && videos.length > 0 && (
              <>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => choose(v)}
                        className={`group w-full rounded-[16px] p-2 text-left transition-colors hover:bg-codice-soft ${v.id === currentId ? "bg-codice-soft ring-2 ring-codice" : ""}`}
                      >
                        <span className="relative block overflow-hidden rounded-[12px] bg-paper">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {v.thumb && <img src={v.thumb} alt="" className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
                          {v.durationMin && (
                            <span className="absolute bottom-1.5 right-1.5 rounded-[6px] bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
                              {v.durationMin} min
                            </span>
                          )}
                        </span>
                        <span className="mt-2 line-clamp-2 block text-[14px] font-medium leading-snug">{v.title}</span>
                        <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIVACY[v.privacy].cls}`}>
                          {PRIVACY[v.privacy].label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {!filtered.length && <p className="py-6 text-center text-slate">Nessun video con questo titolo.</p>}
                {next && !q && (
                  <div className="mt-6 text-center">
                    <button type="button" className="btn-secondary" disabled={state === "loading"} onClick={() => void load(next)}>
                      {state === "loading" ? "Carico…" : "Mostra altri video"}
                    </button>
                  </div>
                )}
              </>
            )}
            {state === "ready" && !videos.length && (
              <p className="py-10 text-center text-slate">Il canale non ha ancora video. Caricane uno su YouTube come «Non in elenco».</p>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}

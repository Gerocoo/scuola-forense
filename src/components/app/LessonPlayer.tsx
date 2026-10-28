"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveLessonNote, saveVideoProgress } from "@/app/area/actions";

const N = 100; // tratti in cui è diviso il video

type Provider = "youtube" | "vimeo" | "bunny" | "file";

function providerOf(src: string): Provider {
  if (src.includes("youtube")) return "youtube";
  if (src.includes("vimeo")) return "vimeo";
  if (src.includes("mediadelivery.net")) return "bunny";
  return "file";
}

const fmt = (t: number) => {
  const s = Math.max(0, Math.floor(t));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};
const parseStamp = (x: string) => x.split(":").map(Number).reduce((acc, n) => acc * 60 + n, 0);
const STAMP_RE = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^\n]*)/g;

/**
 * Video della lezione con il quaderno degli appunti accanto.
 * Gli appunti si salvano da soli; "Segna il minuto" inserisce il tempo del video,
 * e cliccando un segnalibro il video torna a quel punto.
 */
export function LessonPlayer({
  lessonId,
  title,
  src,
  initialNotes,
  savedAt,
  progress,
}: {
  lessonId: string;
  title: string;
  src: string;
  initialNotes: string;
  savedAt: string | null;
  /** progresso salvato; se assente il player non traccia la visione (es. anteprima docente) */
  progress?: { buckets: string; percent: number; position: number; completed: boolean };
}) {
  const router = useRouter();
  const provider = providerOf(src);

  /* ---------- progresso di visione ---------- */
  const track = !!progress;
  const buckets = useRef<string[]>((progress?.buckets ?? "0".repeat(N)).split(""));
  const [seen, setSeen] = useState<string>(progress?.buckets ?? "0".repeat(N));
  const [percent, setPercent] = useState(progress?.percent ?? 0);
  const [completed, setCompleted] = useState(!!progress?.completed);
  const duration = useRef<number | null>(null);
  const lastT = useRef<number | null>(null);
  const dirty = useRef(false);
  const saving = useRef(false);

  const flushProgress = useCallback(async () => {
    if (!track || !dirty.current || saving.current) return;
    saving.current = true;
    dirty.current = false;
    const res = await saveVideoProgress(lessonId, buckets.current.join(""), time.current ?? 0, duration.current);
    saving.current = false;
    if (res.ok) {
      setPercent(res.percent);
      if (res.completed) setCompleted(true);
      if (res.justCompleted) router.refresh();
    } else dirty.current = true;
  }, [lessonId, router, track]);

  const onTime = useCallback(
    (t: number, d?: number | null) => {
      if (d && d > 0) duration.current = d;
      const dur = duration.current;
      if (!track || !dur) {
        lastT.current = t;
        return;
      }
      const idx = (x: number) => Math.min(N - 1, Math.max(0, Math.floor((x / dur) * N)));
      const prev = lastT.current;
      lastT.current = t;
      // solo riproduzione continua: un salto in avanti non conta come visto
      if (prev == null || t < prev || t - prev > 2.5) return;
      let changed = false;
      for (let i = idx(prev); i <= idx(t); i++) {
        if (buckets.current[i] !== "1") {
          buckets.current[i] = "1";
          changed = true;
        }
      }
      // ultimi istanti: il player si ferma prima della fine esatta
      if (dur - t < 1 && buckets.current[N - 1] !== "1" && buckets.current[N - 2] === "1") {
        buckets.current[N - 1] = "1";
        changed = true;
      }
      if (changed) {
        dirty.current = true;
        const joined = buckets.current.join("");
        setSeen(joined);
        const n = buckets.current.filter((c) => c === "1").length;
        setPercent(Math.round((n / N) * 100));
        if (n === N) void flushProgress();
      }
    },
    [flushProgress, track],
  );

  useEffect(() => {
    if (!track) return;
    const iv = setInterval(() => void flushProgress(), 15000);
    const onHide = () => {
      if (document.visibilityState === "hidden") void flushProgress();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onHide);
      void flushProgress();
    };
  }, [flushProgress, track]);

  const frame = useRef<HTMLIFrameElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const time = useRef<number | null>(provider === "file" ? 0 : null);
  const [hasTime, setHasTime] = useState(provider === "file");

  const [notes, setNotes] = useState(initialNotes);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(savedAt ? "saved" : "idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(initialNotes);

  /* ---------- comunicazione con il player ---------- */
  const post = useCallback((msg: unknown) => {
    frame.current?.contentWindow?.postMessage(typeof msg === "string" ? msg : JSON.stringify(msg), "*");
  }, []);

  const subscribe = useCallback(() => {
    if (provider === "youtube") post({ event: "listening", id: 1, channel: "widget" });
    if (provider === "vimeo") post({ method: "addEventListener", value: "timeupdate" });
    if (provider === "bunny") post({ context: "player.js", version: "0.0.11", method: "addEventListener", value: "timeupdate", listener: "pronao" });
  }, [post, provider]);

  useEffect(() => {
    if (provider === "file") return;
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      let d: any = e.data;
      if (typeof d === "string") {
        try {
          d = JSON.parse(d);
        } catch {
          return;
        }
      }
      let t: number | undefined;
      let dur: number | undefined;
      if (provider === "youtube" && d?.event === "infoDelivery") {
        t = d.info?.currentTime;
        dur = d.info?.duration;
        if (typeof dur === "number" && dur > 0) duration.current = dur;
      }
      if (provider === "youtube" && d?.event === "onReady") subscribe();
      if (provider === "vimeo" && d?.event === "timeupdate") {
        t = d.data?.seconds;
        dur = d.data?.duration;
      }
      if (provider === "vimeo" && d?.event === "ready") subscribe();
      if (provider === "bunny" && d?.context === "player.js") {
        if (d.event === "ready") subscribe();
        if (d.event === "timeupdate") {
          t = d.value?.seconds;
          dur = d.value?.duration;
        }
      }
      if (typeof t === "number") {
        time.current = t;
        setHasTime(true);
        onTime(t, dur);
      }
    };
    window.addEventListener("message", onMsg);
    // alcuni player non annunciano "ready": riprova qualche volta dopo il caricamento
    const retries = [500, 1500, 3500].map((ms) => setTimeout(subscribe, ms));
    return () => {
      window.removeEventListener("message", onMsg);
      retries.forEach(clearTimeout);
    };
  }, [provider, subscribe, onTime]);

  const seek = (t: number) => {
    if (provider === "file" && video.current) {
      video.current.currentTime = t;
      void video.current.play();
    }
    if (provider === "youtube") {
      post({ event: "command", func: "seekTo", args: [t, true] });
      post({ event: "command", func: "playVideo", args: [] });
    }
    if (provider === "vimeo") {
      post({ method: "setCurrentTime", value: t });
      post({ method: "play" });
    }
    if (provider === "bunny") {
      post({ context: "player.js", version: "0.0.11", method: "setCurrentTime", value: t });
      post({ context: "player.js", version: "0.0.11", method: "play" });
    }
  };

  /* ---------- salvataggio automatico ---------- */
  const save = useCallback(
    async (value: string) => {
      if (value === lastSaved.current) return;
      setStatus("saving");
      const res = await saveLessonNote(lessonId, value);
      if (res.ok) {
        lastSaved.current = value;
        setStatus("saved");
      } else setStatus("error");
    },
    [lessonId],
  );

  const change = (value: string) => {
    setNotes(value);
    setStatus("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(value), 900);
  };

  useEffect(() => {
    const flush = () => {
      if (area.current && area.current.value !== lastSaved.current) void save(area.current.value);
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [save]);

  const insertStamp = () => {
    const t = provider === "file" ? (video.current?.currentTime ?? 0) : time.current;
    if (t == null) return;
    const el = area.current;
    const stamp = `[${fmt(t)}] `;
    const pos = el?.selectionStart ?? notes.length;
    const before = notes.slice(0, pos);
    const prefix = before.length && !before.endsWith("\n") ? "\n" : "";
    const next = before + prefix + stamp + notes.slice(pos);
    change(next);
    requestAnimationFrame(() => {
      if (!el) return;
      const caret = (before + prefix + stamp).length;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const download = () => {
    const blob = new Blob([`${title}\n\n${notes}`], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Appunti - ${title}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const bookmarks = Array.from(notes.matchAll(STAMP_RE)).map((m) => ({ stamp: m[1], text: m[2].trim() }));

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      {/* Video */}
      <div className="min-w-0 xl:sticky xl:top-8 xl:self-start">
        <div className="overflow-hidden rounded-[var(--radius-panel)] bg-ink shadow-[var(--shadow-card)]">
          {provider === "file" ? (
            <video
              ref={video}
              src={src}
              controls
              controlsList="nodownload"
              className="aspect-video w-full"
              preload="metadata"
              onTimeUpdate={(e) => {
                time.current = e.currentTarget.currentTime;
                onTime(e.currentTarget.currentTime, e.currentTarget.duration);
              }}
              onPause={() => void flushProgress()}
            />
          ) : (
            <iframe
              ref={frame}
              src={src}
              title={title}
              onLoad={subscribe}
              className="aspect-video w-full"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          )}
        </div>
        {track && (
          <div className="mt-4 rounded-[14px] bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
              <span className={`font-semibold ${completed ? "text-codice" : "text-ink"}`}>
                {completed ? "Video completato" : `Visto al ${percent}%`}
              </span>
              <span className="flex items-center gap-3 text-mute">
                {!completed && progress && progress.position > 15 && (
                  <button type="button" onClick={() => seek(progress.position)} className="font-medium text-codice hover:underline">
                    Riprendi da {fmt(progress.position)}
                  </button>
                )}
                {!completed && <span>I tratti saltati vanno guardati per completare</span>}
              </span>
            </div>
            {/* mappa della visione: ogni tacca è un centesimo del video */}
            <div className="mt-2 flex h-2 gap-px overflow-hidden rounded-full bg-line-soft" role="img" aria-label={`Visto al ${percent}%`}>
              {seen.split("").map((c, i) => (
                <span key={i} className={`h-full flex-1 transition-colors duration-500 ${c === "1" ? "bg-codice" : "bg-transparent"}`} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quaderno */}
      <section aria-labelledby="appunti" className="panel flex min-h-[280px] xl:min-h-[420px] flex-col p-5 xl:h-[calc(100dvh-7rem)] xl:max-h-[720px]">
        <div className="flex items-center justify-between gap-3">
          <h2 id="appunti" className="text-[17px] font-semibold">I miei appunti</h2>
          <span role="status" aria-live="polite" className={`text-[13px] ${status === "error" ? "text-ceralacca" : "text-mute"}`}>
            {status === "saving" ? "Salvataggio…" : status === "saved" ? "Salvati" : status === "error" ? "Non salvati" : ""}
          </span>
        </div>
        <p className="mt-0.5 text-[14px] text-mute">Visibili solo a te. Si salvano da soli.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={insertStamp} disabled={!hasTime} className="btn-secondary btn-sm" title={hasTime ? "" : "Avvia il video per segnare il minuto"}>
            <svg aria-hidden viewBox="0 0 16 16" className="size-3.5"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M8 4.6V8l2.3 1.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            Segna il minuto
          </button>
          <button type="button" onClick={download} disabled={!notes.trim()} className="btn-ghost btn-sm">Scarica</button>
        </div>

        <label htmlFor="note-body" className="sr-only">Appunti sulla lezione</label>
        <textarea
          id="note-body"
          ref={area}
          value={notes}
          onChange={(e) => change(e.target.value)}
          onBlur={() => void save(notes)}
          placeholder={"Scrivi mentre guardi.\nCon «Segna il minuto» aggiungi il punto del video a cui ti riferisci."}
          className="mt-3 w-full flex-1 resize-none rounded-[12px] border border-line-soft bg-paper/60 px-3.5 py-3 font-serif text-[16px] leading-[1.65] text-ink placeholder:font-sans placeholder:text-[14px] placeholder:text-mute focus:border-codice focus:bg-surface focus:outline-none focus:ring-4 focus:ring-codice/12"
          spellCheck
        />

        {bookmarks.length > 0 && (
          <div className="mt-4 border-t border-line-soft pt-3">
            <p className="text-[13px] font-medium text-mute">Torna al punto</p>
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
              {bookmarks.map((b, i) => (
                <li key={`${b.stamp}-${i}`}>
                  <button
                    type="button"
                    onClick={() => seek(parseStamp(b.stamp))}
                    className="flex w-full items-baseline gap-2 rounded-[8px] px-2 py-1 text-left text-[14px] hover:bg-codice-soft"
                  >
                    <span className="shrink-0 font-semibold text-codice tabular-nums">{b.stamp}</span>
                    <span className="truncate text-slate">{b.text || "senza testo"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

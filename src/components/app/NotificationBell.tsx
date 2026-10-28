"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Notice, NoticeKind } from "@/lib/notifications";

const KEY = "pronao:notifiche-viste";
const COUNT_KEY = "pronao:notifiche-conteggio";
const SOUND_KEY = "pronao:notifiche-suono";
const REFRESH_MS = 45_000;

function store(key: string, value?: string) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {
    /* archiviazione non disponibile */
  }
  return null;
}

/* Suono discreto a due note, generato nel browser (nessun file da scaricare). */
let audio: AudioContext | null = null;
function unlockAudio() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audio && Ctx) audio = new Ctx();
    if (audio?.state === "suspended") void audio.resume();
  } catch {
    /* audio non disponibile */
  }
}
function chime() {
  if (!audio || audio.state !== "running") return;
  const t = audio.currentTime;
  [
    [880, 0],
    [1318.5, 0.12],
  ].forEach(([freq, delay]) => {
    const osc = audio!.createOscillator();
    const gain = audio!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t + delay);
    gain.gain.linearRampToValueAtTime(0.12, t + delay + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.5);
    osc.connect(gain).connect(audio!.destination);
    osc.start(t + delay);
    osc.stop(t + delay + 0.55);
  });
}

const ICONS: Record<NoticeKind, { bg: string; path: string }> = {
  messaggio: { bg: "bg-codice-soft text-codice", path: "M4 5h16v11H8l-4 4z" },
  consegna: { bg: "bg-ambra-soft text-ambra", path: "M7 3h7l5 5v13H7z M14 3v5h5" },
  correzione: { bg: "bg-codice-soft text-codice", path: "M5 12.5l4.5 4.5L19 7.5" },
  traccia: { bg: "bg-paper text-ink", path: "M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h4" },
  incontro: { bg: "bg-paper text-ink", path: "M4 6h16v14H4z M4 10h16 M9 3v5 M15 3v5" },
  impegno: { bg: "bg-ceralacca-soft text-ceralacca", path: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 7v5l3 2" },
};

function when(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("it", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return "adesso";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 8) return rtf.format(Math.round(diff / 86400), "day");
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

/** Campanella con le novità: messaggi, consegne, correzioni, incontri imminenti. */
export function NotificationBell({ items }: { items: Notice[] }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  // ultima apertura precedente: serve a evidenziare le novità mentre il pannello è aperto
  const [shownSince, setShownSince] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sound, setSound] = useState(true);
  const [ringing, setRinging] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // nella pagina ci sono due campanelle (telefono e computer): agisce solo quella visibile
  const visible = () => !!box.current && box.current.offsetParent !== null;

  useEffect(() => {
    setSeen(store(KEY));
    setSound(store(SOUND_KEY) !== "off");
    setReady(true);
    // i browser permettono l'audio solo dopo un primo clic o tasto sulla pagina
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // aggiorna le notifiche da solo, mentre la scheda è aperta
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && visible()) router.refresh();
    }, REFRESH_MS);
    const onFocus = () => visible() && router.refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  // nuove = messaggi non letti + novità successive all'ultima apertura (gli incontri imminenti non contano)
  const isNew = (n: Notice) => n.kind === "messaggio" || (n.kind !== "incontro" && (!seen || n.at > seen));
  const unread = ready ? items.filter(isNew).length : 0;

  // quando arrivano novità: la campanella oscilla e, se attivo, suona
  useEffect(() => {
    if (!ready || !visible()) return;
    const before = Number(store(COUNT_KEY) ?? "0");
    if (unread > before) {
      setRinging(true);
      if (sound) chime();
      const t = setTimeout(() => setRinging(false), 1200);
      store(COUNT_KEY, String(unread));
      return () => clearTimeout(t);
    }
    store(COUNT_KEY, String(unread));
  }, [unread, ready, sound]);

  function toggle() {
    setOpen((o) => !o);
    if (!open) {
      const now = new Date().toISOString();
      try {
        localStorage.setItem(KEY, now);
      } catch {
        /* archiviazione non disponibile */
      }
      setShownSince(seen);
      setSeen(now);
    }
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notifiche, ${unread} nuove` : "Notifiche"}
        className="relative grid size-9 place-items-center rounded-full bg-surface text-ink shadow-[0_0_0_1px_rgb(29_29_31/0.1)] transition-colors hover:bg-paper"
      >
        {unread > 0 && <span aria-hidden className="bell-halo absolute inset-0 rounded-full" />}
        <svg viewBox="0 0 24 24" className={`size-[18px] ${ringing ? "bell-ring" : ""}`} aria-hidden>
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z M10 20.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
        {unread > 0 && (
          <span
            key={unread}
            className="badge-pop absolute -right-1.5 -top-1.5 grid h-[19px] min-w-[19px] place-items-center rounded-full bg-ceralacca px-1 text-[11px] font-semibold tabular-nums leading-none text-white ring-2 ring-surface"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifiche"
          className="menu-in absolute right-0 top-[calc(100%+10px)] z-50 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-[18px] bg-surface shadow-[0_0_0_1px_rgb(29_29_31/0.06),0_24px_48px_-16px_rgb(29_29_31/0.35)]"
        >
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <p className="text-[15px] font-semibold">Notifiche</p>
            <button
              type="button"
              onClick={() => {
                const next = !sound;
                setSound(next);
                store(SOUND_KEY, next ? "on" : "off");
                if (next) {
                  unlockAudio();
                  setTimeout(chime, 50);
                }
              }}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium text-slate hover:bg-paper hover:text-ink"
              aria-pressed={sound}
            >
              <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
                <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
                {sound ? (
                  <path d="M15.5 9a4 4 0 0 1 0 6 M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                ) : (
                  <path d="M16 9.5l5 5 M21 9.5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                )}
              </svg>
              {sound ? "Suono attivo" : "Suono disattivato"}
            </button>
          </div>
          {items.length ? (
            <ul className="max-h-[420px] divide-y divide-line-soft overflow-y-auto">
              {items.map((n) => {
                const icon = ICONS[n.kind];
                const fresh = n.kind === "messaggio" || (n.kind !== "incontro" && (!shownSince || n.at > shownSince));
                return (
                  <li key={n.id}>
                    <Link href={n.href} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 transition-colors hover:bg-paper">
                      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${icon.bg}`}>
                        <svg viewBox="0 0 24 24" className="size-[17px]" aria-hidden>
                          <path d={icon.path} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-[14px] ${fresh ? "font-semibold text-ink" : "font-medium text-slate"}`}>{n.title}</span>
                          <span className="shrink-0 text-[13px] text-mute">{when(n.at)}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[14px] text-slate">{n.body}</span>
                      </span>
                      {fresh && <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-codice" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-[14px] text-slate">Nessuna novità.</p>
          )}
        </div>
      )}
    </div>
  );
}

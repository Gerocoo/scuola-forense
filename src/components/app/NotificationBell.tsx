"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Notice, NoticeKind } from "@/lib/notifications";

const KEY = "pronao:notifiche-viste";

const ICONS: Record<NoticeKind, { bg: string; path: string }> = {
  messaggio: { bg: "bg-codice-soft text-codice", path: "M4 5h16v11H8l-4 4z" },
  consegna: { bg: "bg-ambra-soft text-ambra", path: "M7 3h7l5 5v13H7z M14 3v5h5" },
  correzione: { bg: "bg-codice-soft text-codice", path: "M5 12.5l4.5 4.5L19 7.5" },
  traccia: { bg: "bg-paper text-ink", path: "M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h4" },
  incontro: { bg: "bg-paper text-ink", path: "M4 6h16v14H4z M4 10h16 M9 3v5 M15 3v5" },
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
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setSeen(localStorage.getItem(KEY));
    } catch {
      /* archiviazione non disponibile */
    }
    setReady(true);
  }, []);

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
        <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z M10 20.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-ceralacca px-1 text-[11px] font-semibold leading-[18px] text-white ring-2 ring-surface">
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
          <div className="border-b border-line-soft px-4 py-3">
            <p className="text-[15px] font-semibold">Notifiche</p>
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
                          <span className="shrink-0 text-[12px] text-mute">{when(n.at)}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] text-slate">{n.body}</span>
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

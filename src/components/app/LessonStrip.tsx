"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export type StripItem = {
  id: string;
  title: string;
  index: number;
  thumb: string | null;
  percent: number;
  completed: boolean;
  unlocked: boolean;
  current: boolean;
};

/**
 * Timeline orizzontale delle lezioni, sopra il video.
 * Riquadri da circa 3 cm collegati da un filo; quello della lezione aperta è più grande,
 * quelli bloccati sono grigi e non cliccabili. Il filo è verde fin dove il percorso è completato.
 */
export function LessonStrip({ items }: { items: StripItem[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLLIElement>(null);

  // porta la lezione aperta al centro della striscia
  useEffect(() => {
    const s = scroller.current;
    const c = currentRef.current;
    if (!s || !c) return;
    s.scrollLeft = c.offsetLeft - s.clientWidth / 2 + c.clientWidth / 2;
  }, []);

  const lastDone = items.reduce((acc, it, i) => (it.completed ? i : acc), -1);

  return (
    <nav aria-label="Lezioni del percorso" className="-mx-4 mb-6 sm:-mx-8 lg:-mx-12">
      <div ref={scroller} className="overflow-x-auto px-4 pb-3 pt-3 [scrollbar-width:none] sm:px-8 lg:px-12">
        <ol className="relative flex w-max items-center gap-5">
          {items.map((it, i) => {
            const size = it.current ? "size-[140px]" : "size-[92px]"; // lezione aperta circa 3,7 cm, le altre circa 2,5 cm
            const tile = (
              <span
                className={`relative block overflow-hidden rounded-[14px] transition-[transform,box-shadow,opacity] duration-300 ${size} ${
                  it.current
                    ? "shadow-[0_0_0_2px_var(--color-surface),0_0_0_3.5px_var(--color-codice),0_14px_28px_-14px_rgb(29_29_31/0.4)]"
                    : it.unlocked
                      ? "opacity-90 shadow-[0_0_0_1px_rgb(29_29_31/0.06),0_4px_12px_-6px_rgb(29_29_31/0.25)] group-hover:-translate-y-0.5 group-hover:opacity-100"
                      : ""
                } ${it.unlocked ? "bg-codice" : "bg-line-soft"}`}
              >
                {it.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.thumb}
                    alt=""
                    loading="lazy"
                    className={`absolute inset-0 size-full object-cover ${it.unlocked ? "" : "opacity-40 grayscale"}`}
                  />
                ) : (
                  <span aria-hidden className={`absolute inset-0 grid place-items-center font-serif ${it.current ? "text-[36px]" : "text-[26px]"} ${it.unlocked ? "text-ivory/90" : "text-mute"}`}>
                    {it.index + 1}
                  </span>
                )}
                {/* velatura per leggere il titolo sopra la miniatura */}
                <span aria-hidden className={`absolute inset-x-0 bottom-0 h-2/3 ${it.unlocked ? "bg-gradient-to-t from-black/75 to-transparent" : "bg-gradient-to-t from-black/25 to-transparent"}`} />
                <span className={`absolute inset-x-2 bottom-2 line-clamp-2 text-left font-medium leading-[1.2] tracking-[-0.01em] ${it.current ? "text-[12.5px]" : "text-[10.5px]"} ${it.unlocked ? "text-white" : "text-white/80"}`}>
                  {it.title}
                </span>
                <span className={`absolute left-1.5 top-1.5 rounded-full px-1.5 text-[10px] font-semibold leading-4 tabular-nums backdrop-blur-sm ${it.unlocked ? "bg-white/85 text-ink" : "bg-white/60 text-mute"}`}>
                  {it.index + 1}
                </span>
                {it.completed && (
                  <span aria-hidden className="absolute right-1.5 top-1.5 grid size-[18px] place-items-center rounded-full bg-codice text-white ring-[1.5px] ring-white">
                    <svg viewBox="0 0 16 16" className="size-2.5"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                )}
                {!it.unlocked && (
                  <span aria-hidden className="absolute right-1.5 top-1.5 grid size-[18px] place-items-center rounded-full bg-white/75 text-mute">
                    <svg viewBox="0 0 24 24" className="size-2.5"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" strokeWidth="2.2" /></svg>
                  </span>
                )}
                {/* avanzamento del video */}
                {it.unlocked && !it.completed && it.percent > 0 && (
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
                    <span className="block h-full bg-ivory" style={{ width: `${it.percent}%` }} />
                  </span>
                )}
              </span>
            );

            const label = `Lezione ${it.index + 1}: ${it.title}${it.completed ? ", completata" : it.unlocked ? (it.percent ? `, vista al ${it.percent}%` : "") : ", bloccata"}`;

            return (
              <li key={it.id} ref={it.current ? currentRef : undefined} className="relative flex items-center">
                {/* filo conduttore verso la lezione successiva */}
                {i < items.length - 1 && (
                  <span
                    aria-hidden
                    className={`absolute left-full top-1/2 h-[1.5px] w-5 -translate-y-1/2 ${i < lastDone + 1 ? "bg-codice" : "bg-line"}`}
                  />
                )}
                {it.unlocked && !it.current ? (
                  <Link href={`/area/lezioni/${it.id}`} className="group block rounded-[14px]" aria-label={label}>
                    {tile}
                  </Link>
                ) : (
                  <span className="block rounded-[14px]" aria-label={label} aria-current={it.current ? "page" : undefined} aria-disabled={!it.unlocked || undefined}>
                    {tile}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

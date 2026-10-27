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
    <nav aria-label="Lezioni del percorso" className="-mx-4 mb-8 sm:-mx-8 lg:-mx-12">
      <div ref={scroller} className="overflow-x-auto px-4 pb-3 pt-2 [scrollbar-width:thin] sm:px-8 lg:px-12">
        <ol className="relative flex w-max items-center gap-6">
          {items.map((it, i) => {
            const size = it.current ? "size-40" : "size-28"; // 160 px la lezione aperta, 112 px (circa 3 cm) le altre
            const tile = (
              <span
                className={`relative block overflow-hidden rounded-[18px] transition-[transform,box-shadow] duration-300 ${size} ${
                  it.current
                    ? "shadow-[0_0_0_3px_var(--color-codice),0_18px_36px_-16px_rgb(29_29_31/0.45)]"
                    : it.unlocked
                      ? "shadow-[var(--shadow-card)] group-hover:-translate-y-1 group-hover:shadow-[0_0_0_2px_var(--color-codice),var(--shadow-card)]"
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
                  <span aria-hidden className={`absolute inset-0 grid place-items-center font-serif text-[40px] ${it.unlocked ? "text-ivory/90" : "text-mute"}`}>
                    {it.index + 1}
                  </span>
                )}
                {/* velatura per leggere il titolo sopra la miniatura */}
                <span aria-hidden className={`absolute inset-x-0 bottom-0 h-2/3 ${it.unlocked ? "bg-gradient-to-t from-black/75 to-transparent" : "bg-gradient-to-t from-black/25 to-transparent"}`} />
                <span className={`absolute inset-x-2.5 bottom-3 line-clamp-2 text-left font-medium leading-tight ${it.current ? "text-[14px]" : "text-[12px]"} ${it.unlocked ? "text-white" : "text-white/80"}`}>
                  {it.title}
                </span>
                <span className={`absolute left-2 top-2 rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${it.unlocked ? "bg-white/90 text-ink" : "bg-white/60 text-mute"}`}>
                  {it.index + 1}
                </span>
                {it.completed && (
                  <span aria-hidden className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-codice text-white ring-2 ring-white">
                    <svg viewBox="0 0 16 16" className="size-3.5"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                )}
                {!it.unlocked && (
                  <span aria-hidden className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-white/80 text-mute">
                    <svg viewBox="0 0 24 24" className="size-3.5"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" strokeWidth="2.2" /></svg>
                  </span>
                )}
                {/* avanzamento del video */}
                {it.unlocked && !it.completed && it.percent > 0 && (
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
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
                    className={`absolute left-full top-1/2 h-[3px] w-6 -translate-y-1/2 rounded-full ${i < lastDone + 1 ? "bg-codice" : "bg-line"}`}
                  />
                )}
                {it.unlocked && !it.current ? (
                  <Link href={`/area/lezioni/${it.id}`} className="group block rounded-[18px]" aria-label={label}>
                    {tile}
                  </Link>
                ) : (
                  <span className="block rounded-[18px]" aria-label={label} aria-current={it.current ? "page" : undefined} aria-disabled={!it.unlocked || undefined}>
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

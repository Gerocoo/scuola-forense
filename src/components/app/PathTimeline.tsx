import Link from "next/link";
import type { PathStep } from "@/lib/progress";

/**
 * Percorso a tappe: una linea verticale con un nodo per lezione.
 * Il tratto della linea si colora man mano che le lezioni vengono completate.
 */
export function PathTimeline({ steps }: { steps: PathStep[] }) {
  const current = steps.find((s) => s.unlocked && !s.completed)?.lesson.id;

  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const state = s.completed ? "done" : s.unlocked ? (s.lesson.id === current ? "current" : "open") : "locked";
        const card = (
          <div
            className={`flex flex-1 flex-wrap items-center gap-x-5 gap-y-3 rounded-[18px] p-5 transition-shadow ${
              state === "locked" ? "bg-paper/70" : "bg-surface shadow-[var(--shadow-card)] group-hover:shadow-[0_0_0_2px_var(--color-codice)]"
            } ${state === "current" ? "ring-2 ring-codice" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-mute">
                Lezione {i + 1}
                {s.lesson.duration_min ? `, ${s.lesson.duration_min} min` : ""}
              </p>
              <p className={`mt-0.5 text-[17px] font-semibold leading-snug ${state === "locked" ? "text-mute" : "text-ink"}`}>{s.lesson.title}</p>
              {state === "locked" && <p className="mt-1 text-[13px] text-mute">Si sblocca completando la lezione precedente</p>}
              {state !== "locked" && s.exercises.length > 0 && (
                <p className="mt-1 text-[13px] text-slate">
                  Esercitazioni consegnate: {s.exercisesDone} di {s.exercises.length}
                </p>
              )}
            </div>

            {state !== "locked" && s.hasVideo && (
              <div className="w-full sm:w-48">
                <div className="flex justify-between text-[12px]">
                  <span className="text-mute">Video</span>
                  <span className={`font-semibold tabular-nums ${s.videoDone ? "text-codice" : "text-ink"}`}>{s.percent}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line-soft">
                  <div className="h-full rounded-full bg-codice transition-[width] duration-700" style={{ width: `${s.percent}%` }} />
                </div>
              </div>
            )}

            <span
              className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-medium ${
                state === "done"
                  ? "bg-codice-soft text-codice"
                  : state === "current"
                    ? "bg-codice text-white"
                    : state === "open"
                      ? "bg-ambra-soft text-ambra"
                      : "bg-line-soft text-mute"
              }`}
            >
              {state === "done" ? "Completata" : state === "current" ? (s.percent > 0 ? "Continua" : "Inizia") : state === "open" ? "Da completare" : "Bloccata"}
            </span>
          </div>
        );

        return (
          <li key={s.lesson.id} className="relative flex gap-4 pb-4 sm:gap-6">
            {/* linea e nodo */}
            <div className="relative flex w-9 shrink-0 justify-center">
              {!last && (
                <span
                  aria-hidden
                  className={`absolute left-1/2 top-9 -ml-px h-[calc(100%-1rem)] w-0.5 ${s.completed ? "bg-codice" : "bg-line"}`}
                />
              )}
              <span
                className={`relative mt-5 grid size-9 place-items-center rounded-full text-[14px] font-semibold tabular-nums ${
                  state === "done"
                    ? "bg-codice text-white"
                    : state === "current"
                      ? "anim-pulse-always bg-surface text-codice ring-2 ring-codice"
                      : state === "open"
                        ? "bg-surface text-ink ring-1 ring-line"
                        : "bg-line-soft text-mute"
                }`}
                aria-hidden
              >
                {state === "done" ? (
                  <svg viewBox="0 0 16 16" className="size-4"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : state === "locked" ? (
                  <svg viewBox="0 0 24 24" className="size-4"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
                ) : (
                  i + 1
                )}
              </span>
            </div>

            {state === "locked" ? (
              <div className="flex flex-1" aria-disabled>
                {card}
              </div>
            ) : (
              <Link href={`/area/lezioni/${s.lesson.id}`} className="group flex flex-1">
                {card}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}

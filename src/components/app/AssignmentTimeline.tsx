import type { Assignment, AssignmentStatus } from "@/lib/types";

const STEPS: { key: AssignmentStatus; label: string }[] = [
  { key: "assegnato", label: "Traccia ricevuta" },
  { key: "consegnato", label: "Elaborato consegnato" },
  { key: "in_correzione", label: "In correzione" },
  { key: "corretto", label: "Correzione pubblicata" },
];

/** Il percorso di un elaborato: è una sequenza reale, quindi è mostrata come tale. */
export function AssignmentTimeline({ assignment }: { assignment: Pick<Assignment, "status"> }) {
  const current = STEPS.findIndex((s) => s.key === assignment.status);
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Avanzamento">
      {STEPS.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s.key} aria-current={i === current ? "step" : undefined}>
            <span className={`block h-1.5 rounded-full ${done ? (s.key === "corretto" ? "bg-ceralacca" : "bg-codice") : "bg-line"}`} />
            <span className={`mt-2 block text-[12px] leading-tight sm:text-sm ${i === current ? "font-semibold text-ink" : done ? "text-slate" : "text-mute"}`}>
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

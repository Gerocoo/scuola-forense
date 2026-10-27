"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addCourseTeacher, deleteCourseExercise, removeCourseTeacher } from "@/app/docente/actions";

export function AddTeacher({ packageId, options }: { packageId: string; options: { id: string; name: string }[] }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  if (!options.length) return null;
  return (
    <div className="mt-3 flex gap-2">
      <select aria-label="Docente da aggiungere" className="field py-2 text-[14px]" value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">Aggiungi un docente…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      <button
        type="button"
        className="btn-secondary btn-sm shrink-0"
        disabled={!value || pending}
        onClick={() =>
          start(async () => {
            await addCourseTeacher(packageId, value);
            setValue("");
            router.refresh();
          })
        }
      >
        Aggiungi
      </button>
    </div>
  );
}

export function RemoveTeacher({ packageId, teacherId }: { packageId: string; teacherId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await removeCourseTeacher(packageId, teacherId); router.refresh(); })}
      className="text-[13px] text-mute hover:text-ceralacca"
    >
      Rimuovi
    </button>
  );
}

export function RetireExercise({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Ritirare "${title}"? Non arriverà ai nuovi iscritti e sparirà a chi non l'ha ancora consegnato. Gli elaborati già consegnati restano.`)) return;
        start(async () => { await deleteCourseExercise(id); router.refresh(); });
      }}
      className="text-[13px] text-mute hover:text-ceralacca"
    >
      {pending ? "Ritiro…" : "Ritira"}
    </button>
  );
}

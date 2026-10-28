"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addCourseTeacher, deleteCourseExercise, inviteTeacher, removeCourseTeacher } from "@/app/docente/actions";

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
      className="text-[14px] text-mute hover:text-ceralacca"
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
      className="text-[14px] text-mute hover:text-ceralacca"
    >
      {pending ? "Ritiro…" : "Ritira"}
    </button>
  );
}

/** Invita per email un nuovo docente già assegnato a questo corso. */
export function InviteToCourse({ packageId }: { packageId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 text-[14px] font-medium text-codice hover:underline">
        Invita un nuovo docente
      </button>
    );
  }
  return (
    <form
      className="mt-3 space-y-2"
      action={(fd) =>
        start(async () => {
          fd.set("package_id", packageId);
          fd.set("role", "teacher");
          const res = await inviteTeacher(fd);
          setMsg(res.ok ? { ok: true, text: res.message ?? "Fatto." } : { ok: false, text: res.error });
          router.refresh();
        })
      }
    >
      <label htmlFor="invite-course" className="label">Email del docente</label>
      <div className="flex gap-2">
        <input id="invite-course" name="email" type="email" required placeholder="nome@gmail.com" className="field py-2 text-[14px]" />
        <button className="btn-primary btn-sm shrink-0" disabled={pending}>{pending ? "…" : "Invita"}</button>
      </div>
      <p className="hint">Appena si registra con questa email entra come docente di questo corso.</p>
      {msg && <p role="status" className={`text-[14px] ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
    </form>
  );
}

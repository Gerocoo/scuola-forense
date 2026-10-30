"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Dropzone } from "@/components/app/Dropzone";
import { FileIcon } from "@/components/app/FileList";
import { uploadFile } from "@/lib/upload";
import { fileSize } from "@/lib/format";
import { createAssignments } from "@/app/docente/actions";
import type { AssignmentKind } from "@/lib/types";

export type CourseOption = { id: string; title: string; period: string | null; enrolled: number };

const KINDS: { value: AssignmentKind; label: string }[] = [
  { value: "parere", label: "Parere" },
  { value: "atto", label: "Atto giudiziario" },
  { value: "esercizio", label: "Esercizio" },
  { value: "documento", label: "Documento o materiale" },
];

export function NewAssignmentForm({
  courses = [],
  preselected = [],
  lessons,
  preselectedLesson,
  course,
}: {
  courses?: CourseOption[];
  preselected?: string[];
  lessons: { id: string; title: string }[];
  preselectedLesson?: string;
  /** Modalità corso: l'esercizio va a tutti gli iscritti, niente scelta dei discenti. */
  course?: { id: string; title: string; enrolled: number };
}) {
  const [lessonId, setLessonId] = useState(preselectedLesson ?? "");
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(preselected));
  const [kind, setKind] = useState<AssignmentKind>("parere");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [due, setDue] = useState("");
  const [timed, setTimed] = useState(false);
  const [opens, setOpens] = useState("");
  const [hours, setHours] = useState("7");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recipients = useMemo(() => courses.filter((c) => selected.has(c.id)).reduce((n, c) => n + c.enrolled, 0), [courses, selected]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!course && !selected.size) return setError("Scegli almeno un corso.");
    if (!title.trim()) return setError("Inserisci un titolo.");
    if (timed && !opens) return setError("Indica quando si apre la simulazione.");

    const uploadBatch = crypto.randomUUID();
    try {
      const metas = [];
      for (const f of files) {
        setBusy(`Caricamento di ${f.name}…`);
        metas.push(await uploadFile(f, `tracce/${uploadBatch}`));
      }
      const targets = course ? [course.id] : [...selected];
      let total = 0;
      for (const [i, pid] of targets.entries()) {
        setBusy(targets.length > 1 ? `Invio al corso ${i + 1} di ${targets.length}…` : "Invio agli iscritti…");
        const res = await createAssignments({
          batchId: i === 0 ? uploadBatch : crypto.randomUUID(),
          uploadBatchId: uploadBatch,
          studentIds: [],
          kind,
          title,
          instructions,
          dueLocal: due,
          files: metas,
          lessonId: lessonId || null,
          packageId: pid,
          timed: timed ? { opensLocal: opens, durationMin: Math.round(Number(hours.replace(",", ".")) * 60) } : null,
        });
        if (!res.ok) throw new Error(res.error);
        total += res.count ?? 0;
      }
      router.push(course || targets.length === 1 ? `/docente/corsi/${targets[0]}` : `/docente/esercitazioni?inviata=${total}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invio non riuscito.");
      setBusy(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <div className="panel space-y-5 p-6">
          <fieldset>
            <legend className="label">Tipo</legend>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <label
                  key={k.value}
                  className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[15px] ${
                    kind === k.value ? "border-codice bg-codice-soft font-medium text-codice" : "border-line text-slate hover:text-ink"
                  }`}
                >
                  <input type="radio" name="kind" value={k.value} checked={kind === k.value} onChange={() => setKind(k.value)} className="sr-only" />
                  {k.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="title" className="label">Titolo</label>
            <input id="title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Parere: risoluzione per inadempimento" required />
          </div>
          <div>
            <label htmlFor="instructions" className="label">Traccia e istruzioni</label>
            <textarea
              id="instructions"
              rows={9}
              className="field font-serif text-[17px] leading-relaxed"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Testo della traccia, tempo a disposizione, indicazioni sulla consegna."
            />
          </div>
          <div className={`rounded-[14px] border p-4 ${timed ? "border-codice bg-codice-soft/50" : "border-line"}`}>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 size-4 accent-codice" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
              <span>
                <span className="block text-[15px] font-semibold">Simulazione d&apos;esame a tempo</span>
                <span className="block text-[14px] text-slate">
                  La traccia resta nascosta fino all&apos;ora di inizio, poi parte il conto alla rovescia. Allo scadere la consegna si chiude, come all&apos;esame.
                </span>
              </span>
            </label>
            {timed && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="opens" className="label">Inizio</label>
                  <input id="opens" type="datetime-local" className="field" value={opens} onChange={(e) => setOpens(e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="hours" className="label">Durata (ore)</label>
                  <input id="hours" inputMode="decimal" className="field" value={hours} onChange={(e) => setHours(e.target.value)} />
                  <p className="hint">All&apos;esame ogni prova scritta dura 7 ore.</p>
                </div>
              </div>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {!timed && (
              <div>
                <label htmlFor="due" className="label">Scadenza (facoltativa)</label>
                <input id="due" type="datetime-local" className="field" value={due} onChange={(e) => setDue(e.target.value)} />
              </div>
            )}
            <div>
              <label htmlFor="lesson" className="label">Collegata alla lezione</label>
              <select id="lesson" className="field" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
                <option value="">Nessuna lezione</option>
                {lessons.map((l, i) => (
                  <option key={l.id} value={l.id}>
                    {i + 1}. {l.title}
                  </option>
                ))}
              </select>
              <p className="hint">Se la colleghi, il discente deve consegnarla per sbloccare la lezione successiva.</p>
            </div>
          </div>
        </div>

        <div className="panel space-y-4 p-6">
          <h2 className="font-semibold">File della traccia</h2>
          {files.length > 0 && (
            <ul className="divide-y divide-line-soft rounded-[10px] border border-line">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                  <FileIcon name={f.name} />
                  <span className="min-w-0 flex-1 truncate text-[15px]">{f.name}</span>
                  <span className="text-sm text-mute">{fileSize(f.size)}</span>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}>
                    Rimuovi
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Dropzone onFiles={(f) => setFiles((x) => [...x, ...f])} disabled={!!busy} />
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        {course ? (
          <div className="panel p-5">
            <h2 className="font-semibold">Destinatari</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate">
              Tutti gli iscritti a <strong className="text-ink">{course.title}</strong>:{" "}
              {course.enrolled === 1 ? "1 discente oggi" : `${course.enrolled} discenti oggi`}. Chi si iscrive in seguito lo riceve in automatico.
            </p>
          </div>
        ) : (
          <div className="panel p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Corsi</h2>
              <span className="text-sm text-mute tabular-nums">{selected.size} scelti</span>
            </div>
            <p className="mt-1 text-[14px] text-slate">La traccia va a tutti gli iscritti dei corsi scelti, e in automatico a chi si iscrive dopo.</p>
            <ul className="mt-3 space-y-1">
              {courses.map((c) => (
                <li key={c.id}>
                  <label className={`flex cursor-pointer items-start gap-3 rounded-[10px] px-2.5 py-2.5 ${selected.has(c.id) ? "bg-codice-soft" : "hover:bg-paper"}`}>
                    <input type="checkbox" className="mt-1 size-4 accent-codice" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                    <span className="min-w-0">
                      <span className="block text-[15px] font-medium">{c.title}</span>
                      <span className="block text-sm text-mute">
                        {c.period ? `${c.period} · ` : ""}
                        {c.enrolled === 1 ? "1 iscritto" : `${c.enrolled} iscritti`}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
              {!courses.length && <li className="px-2 py-3 text-sm text-mute">Non sei ancora docente di nessun corso.</li>}
            </ul>
            {selected.size > 0 && (
              <p className="mt-3 text-[14px] text-slate">
                Destinatari oggi: <strong className="text-ink">{recipients}</strong> {recipients === 1 ? "discente" : "discenti"}
              </p>
            )}
          </div>
        )}

        {error && <p role="alert" className="text-sm text-ceralacca">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={!!busy}>
          {busy ?? (course || selected.size <= 1 ? "Assegna al corso" : `Assegna a ${selected.size} corsi`)}
        </button>
        <p className="text-sm text-mute">Gli iscritti ricevono la notifica con il link alla traccia.</p>
      </aside>
    </form>
  );
}

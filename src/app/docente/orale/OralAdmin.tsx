"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { createOralSlots, deleteOralSlot, deleteQuizQuestion, saveQuizQuestion } from "@/app/docente/actions";

export function SlotForm() {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      ref={form}
      className="grid gap-4 sm:grid-cols-2"
      action={(fd) =>
        start(async () => {
          const res = await createOralSlots(fd);
          setMsg(res.ok ? { ok: true, text: res.message ?? "Fatto." } : { ok: false, text: res.error });
          if (res.ok) form.current?.reset();
          router.refresh();
        })
      }
    >
      <div>
        <label htmlFor="starts_at" className="label">Primo orario</label>
        <input id="starts_at" name="starts_at" type="datetime-local" required className="field" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="duration_min" className="label">Durata (min)</label>
          <input id="duration_min" name="duration_min" type="number" min={10} max={180} defaultValue={30} className="field" />
        </div>
        <div>
          <label htmlFor="count" className="label">Quanti di fila</label>
          <input id="count" name="count" type="number" min={1} max={12} defaultValue={1} className="field" />
        </div>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="meeting_url" className="label">Link della videochiamata</label>
        <input id="meeting_url" name="meeting_url" className="field" placeholder="https://meet.google.com/… oppure Zoom" />
        <p className="hint">Con &laquo;Quanti di fila&raquo; crei più orari consecutivi: ad esempio 4 da 30 minuti dalle 15:00 alle 17:00.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pending}>{pending ? "Salvataggio…" : "Aggiungi orari"}</button>
        {msg && <p role="status" className={`text-[14px] ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}

export function DeleteSlot({ id, booked }: { id: string; booked: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-[14px] text-mute hover:text-ceralacca"
      onClick={() => {
        if (booked && !confirm("L'orario è prenotato: il discente riceverà un'email di annullamento. Procedere?")) return;
        start(async () => {
          await deleteOralSlot(id);
          router.refresh();
        });
      }}
    >
      {pending ? "…" : "Elimina"}
    </button>
  );
}

type Q = { id: string; topic: string; question: string; options: string[]; correct: number; explanation: string };

export function QuestionForm({ initial, onDone }: { initial?: Q; onDone?: () => void }) {
  const router = useRouter();
  const [options, setOptions] = useState<string[]>(initial?.options ?? ["", "", "", ""]);
  const [correct, setCorrect] = useState(initial?.correct ?? 0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={form}
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          fd.set("correct", String(correct));
          const res = await saveQuizQuestion(fd);
          setMsg(res.ok ? { ok: true, text: res.message ?? "Fatto." } : { ok: false, text: res.error });
          if (res.ok) {
            if (!initial) {
              form.current?.reset();
              setOptions(["", "", "", ""]);
              setCorrect(0);
            }
            onDone?.();
          }
          router.refresh();
        })
      }
    >
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
        <div>
          <label className="label" htmlFor={`topic-${initial?.id ?? "new"}`}>Argomento</label>
          <select id={`topic-${initial?.id ?? "new"}`} name="topic" defaultValue={initial?.topic ?? "deontologia"} className="field">
            <option value="deontologia">Deontologia</option>
            <option value="ordinamento">Ordinamento</option>
            <option value="previdenza">Previdenza</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`q-${initial?.id ?? "new"}`}>Domanda</label>
          <input id={`q-${initial?.id ?? "new"}`} name="question" defaultValue={initial?.question} required className="field" />
        </div>
      </div>
      <fieldset>
        <legend className="label">Risposte (seleziona quella corretta)</legend>
        <div className="space-y-2">
          {options.map((o, k) => (
            <div key={k} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-ui-${initial?.id ?? "new"}`}
                checked={correct === k}
                onChange={() => setCorrect(k)}
                className="size-4 accent-codice"
                aria-label={`Risposta ${String.fromCharCode(65 + k)} corretta`}
              />
              <input
                name="option"
                value={o}
                onChange={(e) => setOptions((x) => x.map((v, j) => (j === k ? e.target.value : v)))}
                className="field py-2"
                placeholder={`Risposta ${String.fromCharCode(65 + k)}`}
              />
            </div>
          ))}
        </div>
        {options.length < 5 && (
          <button type="button" className="mt-2 text-[14px] font-medium text-codice" onClick={() => setOptions((x) => [...x, ""])}>
            + Aggiungi risposta
          </button>
        )}
      </fieldset>
      <div>
        <label className="label" htmlFor={`exp-${initial?.id ?? "new"}`}>Spiegazione</label>
        <textarea id={`exp-${initial?.id ?? "new"}`} name="explanation" rows={2} defaultValue={initial?.explanation} className="field" placeholder="Mostrata dopo la risposta: norma di riferimento e motivo." />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary btn-sm" disabled={pending}>{pending ? "Salvataggio…" : initial ? "Salva" : "Aggiungi domanda"}</button>
        {msg && <p role="status" className={`text-[14px] ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}

export function QuestionRow({ q }: { q: Q }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [pending, start] = useTransition();
  return (
    <li className="px-4 py-3.5 sm:px-5">
      {edit ? (
        <QuestionForm initial={q} onDone={() => setEdit(false)} />
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium capitalize text-codice">{q.topic}</p>
            <p className="text-[15px] font-medium">{q.question}</p>
            <p className="mt-0.5 text-[14px] text-slate">Corretta: {q.options[q.correct]}</p>
          </div>
          <div className="flex shrink-0 gap-3">
            <button type="button" className="text-[14px] font-medium text-codice" onClick={() => setEdit(true)}>Modifica</button>
            <button
              type="button"
              className="text-[14px] text-mute hover:text-ceralacca"
              disabled={pending}
              onClick={() => {
                if (!confirm("Eliminare la domanda?")) return;
                start(async () => {
                  await deleteQuizQuestion(q.id);
                  router.refresh();
                });
              }}
            >
              Elimina
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { bookOralSlot, cancelOralSlot, saveQuizAttempt } from "@/app/area/actions";

export type QuizQuestion = { id: string; topic: string; question: string; options: string[]; correct: number; explanation: string };

const TOPICS = [
  { v: "", l: "Tutti gli argomenti" },
  { v: "deontologia", l: "Deontologia" },
  { v: "ordinamento", l: "Ordinamento" },
  { v: "previdenza", l: "Previdenza" },
];

function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** Quiz a risposta multipla: 10 domande a caso, correzione immediata con spiegazione. */
export function QuizRunner({ questions }: { questions: QuizQuestion[] }) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [round, setRound] = useState<QuizQuestion[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [, start] = useTransition();

  const pool = useMemo(() => questions.filter((q) => !topic || q.topic === topic), [questions, topic]);

  function begin() {
    setRound(shuffle(pool).slice(0, 10));
    setI(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  }

  if (!questions.length) {
    return <p className="text-[15px] text-slate">I docenti stanno preparando le domande. Torna presto.</p>;
  }

  if (!round) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setTopic(t.v)}
              className={`rounded-full px-3.5 py-1.5 text-[15px] ${topic === t.v ? "bg-ink text-white" : "border border-line bg-surface text-slate hover:text-ink"}`}
            >
              {t.l}
            </button>
          ))}
        </div>
        <p className="text-[15px] text-slate">
          {Math.min(10, pool.length)} domande a caso su {pool.length} disponibili. Dopo ogni risposta vedi subito la spiegazione.
        </p>
        <button type="button" className="btn-primary" disabled={!pool.length} onClick={begin}>
          Inizia il quiz
        </button>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / round.length) * 100);
    return (
      <div className="text-center">
        <p className="text-[15px] text-slate">Risultato</p>
        <p className={`mt-1 text-[48px] font-semibold tabular-nums ${pct >= 60 ? "text-codice" : "text-ceralacca"}`}>
          {score}/{round.length}
        </p>
        <p className="text-[15px] text-slate">{pct >= 80 ? "Ottimo lavoro." : pct >= 60 ? "Buona base, ripassa le risposte sbagliate." : "Da ripassare: rileggi le spiegazioni e riprova."}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn-primary" onClick={begin}>Nuovo quiz</button>
          <button type="button" className="btn-secondary" onClick={() => setRound(null)}>Cambia argomento</button>
        </div>
      </div>
    );
  }

  const q = round[i];
  const answered = picked !== null;

  function choose(k: number) {
    if (answered) return;
    setPicked(k);
    if (k === q.correct) setScore((s) => s + 1);
  }

  function next() {
    if (i + 1 >= round!.length) {
      const final = score;
      setDone(true);
      start(async () => {
        await saveQuizAttempt(topic || null, final, round!.length);
        router.refresh();
      });
      return;
    }
    setI(i + 1);
    setPicked(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[14px] text-mute">
        <span className="capitalize">{q.topic}</span>
        <span className="tabular-nums">
          Domanda {i + 1} di {round.length}
        </span>
      </div>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-line-soft">
        <span className="block h-full rounded-full bg-codice transition-[width]" style={{ width: `${((i + (answered ? 1 : 0)) / round.length) * 100}%` }} />
      </span>
      <p className="mt-5 text-[18px] font-semibold leading-snug">{q.question}</p>
      <ul className="mt-4 space-y-2">
        {q.options.map((o, k) => {
          const right = answered && k === q.correct;
          const wrong = answered && k === picked && k !== q.correct;
          return (
            <li key={k}>
              <button
                type="button"
                onClick={() => choose(k)}
                disabled={answered}
                className={`flex w-full items-center gap-3 rounded-[14px] border px-4 py-3 text-left text-[15px] transition-colors ${
                  right ? "border-codice bg-codice-soft font-medium text-codice" : wrong ? "border-ceralacca bg-ceralacca-soft text-ceralacca" : "border-line bg-surface hover:border-codice/50"
                }`}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-paper text-[13px] font-semibold">{String.fromCharCode(65 + k)}</span>
                {o}
              </button>
            </li>
          );
        })}
      </ul>
      {answered && (
        <div className={`mt-4 rounded-[14px] p-4 text-[15px] leading-relaxed ${picked === q.correct ? "bg-codice-soft text-codice" : "bg-ceralacca-soft text-ceralacca"}`}>
          <p className="font-semibold">{picked === q.correct ? "Risposta corretta." : `Risposta corretta: ${String.fromCharCode(65 + q.correct)}.`}</p>
          {q.explanation && <p className="mt-1 text-ink">{q.explanation}</p>}
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <button type="button" className="btn-primary" disabled={!answered} onClick={next}>
          {i + 1 >= round.length ? "Vedi il risultato" : "Avanti"}
        </button>
      </div>
    </div>
  );
}

export function SlotButton({ id, booked }: { id: string; booked: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        className={booked ? "btn-ghost btn-sm text-ceralacca" : "btn-primary btn-sm"}
        onClick={() => {
          if (booked && !confirm("Annullare la prenotazione?")) return;
          start(async () => {
            const res = booked ? await cancelOralSlot(id) : await bookOralSlot(id);
            setMsg(res.ok ? { ok: true, text: res.message ?? "Fatto." } : { ok: false, text: res.error });
            router.refresh();
          });
        }}
      >
        {pending ? "…" : booked ? "Annulla" : "Prenota"}
      </button>
      {msg && !msg.ok && <span className="max-w-[220px] text-right text-[13px] text-ceralacca">{msg.text}</span>}
    </div>
  );
}

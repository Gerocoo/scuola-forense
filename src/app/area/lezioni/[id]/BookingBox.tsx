"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bookLesson, cancelBooking } from "@/app/area/actions";

export function BookingBox({
  lessonId,
  booked,
  capacity,
  taken,
  past,
}: {
  lessonId: string;
  booked: boolean;
  capacity: number | null;
  taken: number;
  past: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const free = capacity ? Math.max(0, capacity - taken) : null;
  const full = free === 0 && !booked;

  const run = (fn: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) =>
    start(async () => {
      const res = await fn();
      setMsg(res.ok ? { ok: true, text: res.message ?? "Fatto." } : { ok: false, text: res.error });
      router.refresh();
    });

  return (
    <div className={`panel p-5 ${booked ? "border-codice" : ""}`}>
      <h2 className="font-semibold">{booked ? "Hai prenotato il tuo posto" : "Prenotazione"}</h2>
      <p className="mt-1 text-[15px] text-slate">
        {past
          ? "L'incontro si è già svolto."
          : booked
            ? "Ti mandiamo un promemoria via email il giorno prima."
            : free === null
              ? "Conferma la tua presenza: ci aiuta a preparare l'aula."
              : full
                ? "Posti esauriti. Scrivi al docente se vuoi essere avvisato in caso di rinuncia."
                : `${free} ${free === 1 ? "posto libero" : "posti liberi"} su ${capacity}.`}
      </p>
      {!past && (
        <div className="mt-4">
          {booked ? (
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={pending}
              onClick={() => {
                if (confirm("Annullare la prenotazione? Il posto tornerà disponibile.")) run(() => cancelBooking(lessonId));
              }}
            >
              Annulla prenotazione
            </button>
          ) : (
            <button type="button" className="btn-primary w-full" disabled={pending || full} onClick={() => run(() => bookLesson(lessonId))}>
              {pending ? "Prenotazione…" : "Prenota il posto"}
            </button>
          )}
        </div>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-3 text-sm ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { submitReview } from "@/app/actions/community";

export function ReviewForm({ initial }: { initial?: { rating: number; body: string; approved: boolean } | null }) {
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      action={(fd) =>
        start(async () => {
          fd.set("rating", String(rating));
          const res = await submitReview(fd);
          setMsg(res.ok ? { ok: true, text: res.message ?? "Grazie!" } : { ok: false, text: res.error });
        })
      }
    >
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Voto">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} su 5`}
            onClick={() => setRating(n)}
            className={`text-[28px] leading-none transition-transform hover:scale-110 ${n <= rating ? "text-ambra" : "text-line"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea name="body" rows={4} minLength={20} maxLength={1500} required defaultValue={initial?.body} className="field" placeholder="Com'è andata? Cosa ti è servito di più per l'esame?" />
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary btn-sm" disabled={pending}>{pending ? "Invio…" : initial ? "Aggiorna la recensione" : "Pubblica la recensione"}</button>
        {msg && <p role="status" className={`text-[14px] ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
        {!msg && initial && <p className="text-[13px] text-mute">{initial.approved ? "Pubblicata in vetrina" : "In attesa di verifica"}</p>}
      </div>
    </form>
  );
}

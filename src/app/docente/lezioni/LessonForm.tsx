"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveLesson } from "@/app/docente/actions";
import { VideoUrlField } from "./VideoUrlField";
import type { Lesson, LessonKind, Package } from "@/lib/types";

export function LessonForm({
  lesson,
  packages,
  defaultKind = "registrata",
  scheduledLocal = "",
  defaultPackage,
}: {
  lesson?: Lesson;
  packages: Pick<Package, "id" | "title" | "period_label">[];
  defaultKind?: LessonKind;
  scheduledLocal?: string;
  defaultPackage?: string;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<LessonKind>(lesson?.kind ?? defaultKind);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="panel space-y-5 p-6"
      action={(fd) =>
        start(async () => {
          const res = await saveLesson(lesson?.id ?? null, fd);
          if (!res.ok) return setMsg({ ok: false, text: res.error });
          setMsg({ ok: true, text: res.message ?? "Salvato." });
          if (!lesson && res.id) router.replace(`/docente/lezioni/${res.id}`);
          router.refresh();
        })
      }
    >
      <fieldset>
        <legend className="label">Tipo di lezione</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["registrata", "Registrata"],
              ["in_presenza", "In presenza"],
            ] as const
          ).map(([v, l]) => (
            <label
              key={v}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[15px] ${
                kind === v ? "border-codice bg-codice-soft font-medium text-codice" : "border-line text-slate"
              }`}
            >
              <input type="radio" name="kind" value={v} checked={kind === v} onChange={() => setKind(v)} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="title" className="label">Titolo</label>
        <input id="title" name="title" defaultValue={lesson?.title} required className="field" placeholder="Es. La struttura del parere civile" />
      </div>

      <div>
        <label htmlFor="summary" className="label">Descrizione</label>
        <textarea id="summary" name="summary" rows={5} defaultValue={lesson?.summary} className="field" placeholder="Cosa si tratta nella lezione, cosa preparare." />
      </div>

      {kind === "registrata" ? (
        <div className="grid gap-5 sm:grid-cols-[1fr_160px]">
          <VideoUrlField
            defaultValue={lesson?.video_url ?? ""}
            label="Video della lezione"
            durationInputId="duration_min"
            hint="Il video deve essere «Non in elenco» su YouTube. Se carichi i file su Bunny, usa invece il riquadro di caricamento in cima alla pagina."
          />
          <div>
            <label htmlFor="duration_min" className="label">Durata (min)</label>
            <input id="duration_min" name="duration_min" type="number" min={1} defaultValue={lesson?.duration_min ?? ""} className="field" />
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="scheduled_at" className="label">Data e ora</label>
            <input id="scheduled_at" name="scheduled_at" type="datetime-local" defaultValue={scheduledLocal} required className="field" />
          </div>
          <div>
            <label htmlFor="duration_min" className="label">Durata (min)</label>
            <input id="duration_min" name="duration_min" type="number" min={1} defaultValue={lesson?.duration_min ?? ""} className="field" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="location" className="label">Luogo</label>
            <input id="location" name="location" defaultValue={lesson?.location ?? ""} className="field" placeholder="Aula, indirizzo" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="meeting_url" className="label">Link alla diretta (facoltativo)</label>
            <input id="meeting_url" name="meeting_url" type="url" defaultValue={lesson?.meeting_url ?? ""} className="field" placeholder="https://meet.google.com/…" />
          </div>
          <div className="sm:col-span-2">
            <VideoUrlField
              defaultValue={lesson?.video_url ?? ""}
              label="Registrazione dell'incontro (facoltativa)"
              hint="Dopo l'incontro scegli il video della registrazione: i discenti lo rivedono nella pagina dell'incontro."
            />
          </div>
          <div className="rounded-[10px] border border-line-soft bg-paper p-4 sm:col-span-2">
            <label className="flex items-center gap-3 text-[15px] font-medium">
              <input type="checkbox" name="booking_enabled" defaultChecked={lesson?.booking_enabled ?? false} className="size-4 accent-codice" />
              I discenti devono prenotare il posto
            </label>
            <div className="mt-3 flex items-center gap-3">
              <label htmlFor="capacity" className="text-sm text-slate">Posti disponibili</label>
              <input id="capacity" name="capacity" type="number" min={1} defaultValue={lesson?.capacity ?? ""} className="field w-28 py-1.5" placeholder="Illimitati" />
            </div>
            <p className="hint">Il giorno prima ricevono un promemoria via email: solo i prenotati se la prenotazione è attiva, altrimenti tutti gli iscritti dei corsi scelti.</p>
          </div>
        </div>
      )}

      <fieldset>
        <legend className="label">Visibile agli iscritti di</legend>
        <div className="space-y-2">
          {packages.map((p) => (
            <label key={p.id} className="flex items-center gap-3 text-[15px]">
              <input
                type="checkbox"
                name="package_ids"
                value={p.id}
                defaultChecked={lesson ? lesson.package_ids.includes(p.id) : defaultPackage ? p.id === defaultPackage : packages.length === 1}
                className="size-4 accent-codice"
              />
              {p.title} <span className="text-mute">({p.period_label})</span>
            </label>
          ))}
        </div>
      </fieldset>

      {kind === "registrata" && (
        <label className="flex items-start gap-3 rounded-[14px] bg-paper p-4 text-[15px]">
          <input type="checkbox" name="sequential" defaultChecked={lesson?.sequential ?? true} className="mt-0.5 size-4 accent-codice" />
          <span>
            <span className="font-medium">Si sblocca dopo la lezione precedente</span>
            <span className="block text-[13px] text-mute">
              Il discente la vede solo dopo aver guardato per intero la lezione precedente e consegnato le sue esercitazioni.
              L&apos;ordine segue il campo &laquo;Ordine&raquo; qui sotto.
            </span>
          </span>
        </label>
      )}

      <div className="flex flex-wrap items-center gap-6 border-t border-line-soft pt-5">
        <label className="flex items-center gap-3 text-[15px] font-medium">
          <input type="checkbox" name="published" defaultChecked={lesson?.published ?? false} className="size-4 accent-codice" />
          Pubblica (visibile ai discenti)
        </label>
        <label className="flex items-center gap-2 text-sm text-slate">
          Ordine
          <input type="number" name="sort" defaultValue={lesson?.sort ?? 0} className="field w-20 py-1.5" />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Salvataggio…" : lesson ? "Salva modifiche" : "Crea lezione"}</button>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { savePackage } from "@/app/docente/actions";
import { toLocalInput } from "@/lib/format";
import type { Package } from "@/lib/types";

const money = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ",").replace(",00", ""));

export function PackageForm({
  pkg,
  teachers,
  selectedTeachers = [],
}: {
  pkg?: Package;
  /** Docenti tra cui scegliere quelli del corso (staff della scuola). */
  teachers?: { id: string; name: string }[];
  selectedTeachers?: string[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-6"
      action={(fd) =>
        start(async () => {
          const res = await savePackage(pkg?.id ?? null, fd);
          if (!res.ok) return setMsg({ ok: false, text: res.error });
          setMsg({ ok: true, text: res.message ?? "Salvato." });
          if (!pkg && res.id) router.replace(`/docente/corsi/${res.id}`);
          router.refresh();
        })
      }
    >
      <div className="panel grid gap-5 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="title">Nome del corso</label>
          <input id="title" name="title" defaultValue={pkg?.title} required className="field" placeholder="Intensivo primavera" />
        </div>
        <div>
          <label className="label" htmlFor="subject">Materia</label>
          <select id="subject" name="subject" defaultValue={pkg?.subject ?? ""} className="field">
            <option value="">Tutte le materie</option>
            <option value="civile">Diritto civile</option>
            <option value="penale">Diritto penale</option>
            <option value="amministrativo">Diritto amministrativo</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="period_label">Periodo mostrato</label>
          <input id="period_label" name="period_label" defaultValue={pkg?.period_label} className="field" placeholder="Marzo – maggio 2027" />
        </div>
        <div>
          <label className="label" htmlFor="slug">Indirizzo della pagina</label>
          <input id="slug" name="slug" defaultValue={pkg?.slug} className="field" placeholder="si crea da solo dal nome" />
          <p className="hint">Diventa /corsi/indirizzo. Evita di cambiarlo dopo la pubblicazione.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="tagline">Frase di presentazione</label>
          <input id="tagline" name="tagline" defaultValue={pkg?.tagline} className="field" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">Descrizione</label>
          <textarea id="description" name="description" rows={6} defaultValue={pkg?.description} className="field" />
          <p className="hint">Lascia una riga vuota tra un paragrafo e l&apos;altro.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="features">Cosa comprende</label>
          <textarea id="features" name="features" rows={5} defaultValue={pkg?.features.join("\n")} className="field" placeholder={"Una voce per riga"} />
        </div>
      </div>

      <div className="panel grid gap-5 p-6 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Prezzo e promozione</h2>
        <div>
          <label className="label" htmlFor="price">Prezzo pieno (€)</label>
          <input id="price" name="price" inputMode="decimal" defaultValue={money(pkg?.price_cents)} required className="field" />
        </div>
        <div>
          <label className="label" htmlFor="promo_price">Prezzo promozionale (€)</label>
          <input id="promo_price" name="promo_price" inputMode="decimal" defaultValue={money(pkg?.promo_price_cents)} className="field" />
          <p className="hint">Lascia vuoto se non c&apos;è promozione.</p>
        </div>
        <div>
          <label className="label" htmlFor="promo_label">Testo della promozione</label>
          <input id="promo_label" name="promo_label" defaultValue={pkg?.promo_label ?? ""} className="field" placeholder="Prezzo di lancio fino al 31 gennaio" />
        </div>
        <div>
          <label className="label" htmlFor="promo_until">Promozione valida fino al</label>
          <input id="promo_until" name="promo_until" type="datetime-local" defaultValue={toLocalInput(pkg?.promo_until)} className="field" />
          <p className="hint">Dopo questa data torna automaticamente il prezzo pieno.</p>
        </div>
        <p className="text-sm text-slate sm:col-span-2">
          I codici sconto (es. per ex allievi) si creano in Stripe, in Prodotti › Coupon: i discenti li inseriscono al pagamento.
        </p>
      </div>

      <div className="panel grid gap-5 p-6 sm:grid-cols-3">
        <h2 className="font-semibold sm:col-span-3">Date</h2>
        <div>
          <label className="label" htmlFor="starts_on">Inizio corso</label>
          <input id="starts_on" name="starts_on" type="date" defaultValue={pkg?.starts_on ?? ""} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="ends_on">Fine corso</label>
          <input id="ends_on" name="ends_on" type="date" defaultValue={pkg?.ends_on ?? ""} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="access_until">Accesso all&apos;area fino al</label>
          <input id="access_until" name="access_until" type="date" defaultValue={pkg?.access_until ?? ""} className="field" />
        </div>
      </div>

      <div className="panel p-6">
        <h2 className="font-semibold">Impegni mensili dei docenti</h2>
        <p className="mt-1 text-[15px] text-slate">
          Quanto materiale va pubblicato ogni mese per rispettare ciò che è stato venduto. I docenti del corso vedono l&apos;avanzamento e
          ricevono un promemoria via email quando il mese sta per chiudersi e mancano contenuti. Lascia vuoto per non monitorare.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="promise_recorded_month">Video lezioni al mese</label>
            <input id="promise_recorded_month" name="promise_recorded_month" type="number" min={0} max={60} defaultValue={pkg?.promise_recorded_month ?? ""} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="promise_live_month">Incontri dal vivo al mese</label>
            <input id="promise_live_month" name="promise_live_month" type="number" min={0} max={30} defaultValue={pkg?.promise_live_month ?? ""} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="promise_exercises_month">Tracce al mese</label>
            <input id="promise_exercises_month" name="promise_exercises_month" type="number" min={0} max={30} defaultValue={pkg?.promise_exercises_month ?? ""} className="field" />
          </div>
        </div>
      </div>

      <div className="panel flex flex-wrap items-center gap-6 p-6">
        <label className="flex items-center gap-3 text-[15px] font-medium">
          <input type="checkbox" name="active" defaultChecked={pkg?.active ?? true} className="size-4 accent-codice" />
          In vendita
        </label>
        <label className="flex items-center gap-3 text-[15px] font-medium">
          <input type="checkbox" name="highlight" defaultChecked={pkg?.highlight ?? false} className="size-4 accent-codice" />
          Evidenzia in vetrina
        </label>
        <label className="flex items-center gap-2 text-sm text-slate">
          Ordine
          <input type="number" name="sort" defaultValue={pkg?.sort ?? 0} className="field w-20 py-1.5" />
        </label>
      </div>

      {teachers && (
        <div className="panel p-6">
          <input type="hidden" name="teachers_present" value="1" />
          <h2 className="font-semibold">Docenti del corso</h2>
          <p className="mt-1 text-[14px] text-slate">Vedono il corso nella loro sezione Corsi e possono assegnare esercizi agli iscritti.</p>
          {teachers.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {teachers.map((t) => (
                <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-line px-3 py-2.5 text-[15px] has-[:checked]:border-codice has-[:checked]:bg-codice-soft">
                  <input type="checkbox" name="teacher_ids" value={t.id} defaultChecked={selectedTeachers.includes(t.id)} className="size-4 accent-codice" />
                  {t.name}
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[14px] text-slate">Non ci sono ancora docenti registrati.</p>
          )}
          <a href="/docente/utenti" className="mt-4 inline-block text-[14px] font-medium text-codice hover:underline">Invita un nuovo docente</a>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Salvataggio…" : pkg ? "Salva modifiche" : "Crea corso"}</button>
        {pkg && <a href={`/corsi/${pkg.slug}`} target="_blank" rel="noopener" className="btn-ghost">Vedi in vetrina</a>}
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}

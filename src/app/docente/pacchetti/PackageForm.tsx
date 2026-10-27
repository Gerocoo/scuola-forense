"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { savePackage } from "@/app/docente/actions";
import { toLocalInput } from "@/lib/format";
import type { Package } from "@/lib/types";

const money = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ",").replace(",00", ""));

export function PackageForm({ pkg }: { pkg?: Package }) {
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
          if (!pkg && res.id) router.replace(`/docente/pacchetti/${res.id}`);
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
          <label className="label" htmlFor="period_label">Periodo mostrato</label>
          <input id="period_label" name="period_label" defaultValue={pkg?.period_label} className="field" placeholder="Marzo – maggio 2027" />
        </div>
        <div>
          <label className="label" htmlFor="slug">Indirizzo della pagina</label>
          <input id="slug" name="slug" defaultValue={pkg?.slug} required className="field" placeholder="intensivo-marzo-maggio-2027" />
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

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Salvataggio…" : pkg ? "Salva modifiche" : "Crea corso"}</button>
        {pkg && <a href={`/corsi/${pkg.slug}`} target="_blank" rel="noopener" className="btn-ghost">Vedi in vetrina</a>}
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}

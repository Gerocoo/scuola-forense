import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/site/CheckoutForm";
import { activeProducts, priceOf } from "@/lib/services";
import { euro } from "@/lib/format";
import type { Package } from "@/lib/types";

export const metadata: Metadata = {
  title: "Lezioni private, correzioni e simulazioni",
  description:
    "Lezioni individuali con i docenti, correzione dei tuoi atti e pareri in 7 giorni, simulazioni d'esame con classifica e abbonamento per chi ripete l'esame.",
};
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ consenso?: string; errore?: string }> };

const SECTIONS: { key: NonNullable<Package["product"]>; title: string; text: string }[] = [
  { key: "lezioni", title: "Lezioni private", text: "Ore individuali con i docenti, in videochiamata o in sede. Compri un pacchetto e prenoti dalla tua area quando ti serve." },
  { key: "correzioni", title: "Correzione dei tuoi elaborati", text: "Svolgi una traccia, anche dall'archivio, e inviala: un docente la corregge sul documento con la griglia della commissione, entro 7 giorni." },
  { key: "simulazione", title: "Simulazioni d'esame", text: "Tutti nello stesso giorno, sette ore come in aula. Correzione personale e classifica anonima tra i partecipanti." },
  { key: "abbonamento", title: "Per chi ripete l'esame", text: "Un anno di archivio, Orale e correzioni, senza ricominciare da capo un corso intero." },
];

function Card({ p }: { p: Package }) {
  const price = priceOf(p);
  const promo = price !== p.price_cents;
  return (
    <li className="panel flex flex-col p-6">
      <p className="text-[14px] font-medium text-codice">{p.period_label}</p>
      <h3 className="mt-1 text-[21px] font-semibold leading-snug">{p.title}</h3>
      {p.tagline && <p className="mt-2 text-[15px] leading-relaxed text-slate">{p.tagline}</p>}
      {p.features?.length ? (
        <ul className="mt-4 space-y-1.5 text-[15px]">
          {p.features.map((f) => (
            <li key={f} className="flex gap-2">
              <span aria-hidden className="text-codice">✓</span>
              {f}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-auto pt-6">
        <p className="mb-3 flex items-baseline gap-2">
          <span className="text-[28px] font-semibold tabular-nums">{euro(price)}</span>
          {promo && <span className="text-[15px] text-mute line-through">{euro(p.price_cents)}</span>}
        </p>
        <CheckoutForm slug={p.slug} label="Acquista" />
      </div>
    </li>
  );
}

export default async function ServiziPage({ searchParams }: Props) {
  const { consenso, errore } = await searchParams;
  const products = await activeProducts(["lezioni", "correzioni", "simulazione", "abbonamento"]);
  const sections = SECTIONS.map((s) => ({ ...s, items: products.filter((p) => p.product === s.key) })).filter((s) => s.items.length);

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-[14px] font-semibold uppercase tracking-wide text-codice">Servizi</p>
      <h1 className="mt-2 max-w-3xl text-[36px] font-semibold leading-tight sm:text-[46px]">Il supporto che ti serve, quando ti serve</h1>
      <p className="mt-4 max-w-2xl text-[18px] leading-relaxed text-slate">
        Oltre ai corsi: lezioni individuali, correzioni dei tuoi elaborati e simulazioni d&apos;esame. Paghi solo quello che usi.
      </p>
      {(consenso || errore) && (
        <p role="alert" className="mt-6 rounded-[14px] bg-ambra-soft px-4 py-3 text-[15px]">
          {consenso ? "Per procedere conferma la richiesta di accesso immediato ai contenuti." : "Il pagamento non è partito. Riprova tra qualche minuto."}
        </p>
      )}

      {sections.length ? (
        <div className="mt-12 space-y-14">
          {sections.map((s) => (
            <section key={s.key} id={s.key}>
              <h2 className="text-[26px] font-semibold">{s.title}</h2>
              <p className="mt-2 max-w-2xl text-[16px] text-slate">{s.text}</p>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {s.items.map((p) => (
                  <Card key={p.id} p={p} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="panel mt-12 p-6 text-[16px] text-slate">
          I servizi saranno disponibili a breve. Intanto puoi{" "}
          <Link href="/prova-gratuita" className="font-medium text-codice hover:underline">provare gratis una traccia con correzione</Link>.
        </p>
      )}
    </div>
  );
}

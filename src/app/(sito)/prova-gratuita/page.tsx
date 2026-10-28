import type { Metadata } from "next";
import { TrialForm } from "./TrialForm";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Prova gratuita: una traccia d'esame con correzione",
  description: "Svolgi gratis una traccia per l'esame di abilitazione forense e ricevi la correzione personale di un docente.",
};

const STEPS = [
  { t: "Ricevi la traccia", b: "Un parere o un atto come all'esame, nella tua area riservata." },
  { t: "Svolgila e caricala", b: "Scrivi con calma, poi carica il file in PDF o Word." },
  { t: "Ricevi la correzione", b: "Un docente annota il tuo elaborato, con note a margine e giudizio in trentesimi." },
];

export default async function ProvaGratuitaPage() {
  const { user } = await getSession();
  return (
    <section className="mx-auto max-w-[1080px] px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div>
          <p className="font-serif text-[19px] italic text-codice">Prova gratuita</p>
          <h1 className="mt-3 text-[36px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[52px]">Prova il metodo su una traccia vera.</h1>
          <p className="mt-5 max-w-xl text-[18px] leading-relaxed text-slate">
            Ti mandiamo una traccia d&apos;esame. La svolgi quando vuoi e un docente la corregge personalmente, come durante il corso. Gratis e senza
            impegno.
          </p>
          <ol className="mt-10 space-y-6">
            {STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span className="font-serif text-[36px] leading-none text-codice tabular-nums">{i + 1}</span>
                <span>
                  <span className="block text-[18px] font-semibold">{s.t}</span>
                  <span className="block text-[16px] text-slate">{s.b}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="panel p-6 sm:p-8">
          <TrialForm loggedIn={!!user} />
        </div>
      </div>
    </section>
  );
}

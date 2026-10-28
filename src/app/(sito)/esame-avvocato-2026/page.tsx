import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { SITE } from "@/content/site";

export const metadata: Metadata = {
  title: "Esame di avvocato 2026-2027: come cambiano le prove",
  description:
    "Parere e atto in sette ore con i soli codici annotati, orale con caso pratico e domanda su deontologia e previdenza: la guida al nuovo esame di abilitazione forense e come prepararsi.",
};

const WRITTEN = [
  {
    t: "Primo scritto: il parere",
    b: "Redazione di un parere motivato su una questione nella materia scelta tra diritto privato, penale e amministrativo. Sette ore, in presenza.",
  },
  {
    t: "Secondo scritto: l'atto",
    b: "Redazione di un atto giudiziario su un caso pratico, nella stessa materia. Anche qui sette ore.",
  },
  {
    t: "Solo codici annotati",
    b: "In entrambe le prove si possono consultare i soli codici annotati con la giurisprudenza: serve allenarsi a trovare in fretta la norma e l'orientamento giusti.",
  },
];

const ORAL = [
  "Si accede con almeno 18 punti in ciascuna prova scritta.",
  "Un caso pratico nella materia scelta.",
  "Tre quesiti: diritto processuale, diritto sostanziale e una materia a scelta tra quelle previste.",
  "Una domanda su ordinamento, deontologia e previdenza forense.",
];

const CRITERIA = ["Chiarezza", "Logicità", "Rigore metodologico", "Soluzione di problemi concreti", "Tecnica argomentativa"];

const PREP = [
  { t: "Simulazioni a tempo", b: "Tracce che si aprono a un'ora fissa e si chiudono dopo sette ore, come in aula d'esame.", href: "/#piattaforma" },
  { t: "Griglia con i criteri ufficiali", b: "Ogni elaborato riceve un punteggio per criterio in trentesimi, con la soglia di 18 sempre in vista.", href: "/#metodo" },
  { t: "Correzione a margine", b: "Il docente annota il tuo elaborato riga per riga, poi la classe rivede insieme gli errori più frequenti.", href: "/#metodo" },
  { t: "Allenamento all'orale", b: "Quiz su deontologia, ordinamento e previdenza e simulazioni d'orale in videochiamata con un docente.", href: "/#piattaforma" },
];

const FAQ = [
  {
    q: "Quante sono le prove scritte del nuovo esame?",
    a: "Due: un parere motivato e un atto giudiziario, ciascuno della durata di sette ore, nella materia scelta tra diritto privato, penale e amministrativo.",
  },
  {
    q: "Si possono usare i codici commentati?",
    a: "No: sono ammessi soltanto i codici annotati con la giurisprudenza.",
  },
  {
    q: "Che punteggio serve per l'orale?",
    a: "Almeno 18 punti in ciascuna delle due prove scritte.",
  },
  {
    q: "Cosa si porta all'orale?",
    a: "Un caso pratico nella materia scelta, tre quesiti (processuale, sostanziale e una materia a scelta) e una domanda su ordinamento, deontologia e previdenza forense.",
  },
];

export default function Esame2026Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto max-w-[1080px] px-4 pt-16 sm:px-6 sm:pt-24">
        <p className="hero-in font-serif text-[19px] italic text-codice">Guida aggiornata alla sessione 2026-2027</p>
        <h1 className="hero-in mt-3 max-w-4xl text-[36px] font-semibold leading-[1.06] tracking-[-0.03em] [animation-delay:120ms] sm:text-[56px]">
          Il nuovo esame di avvocato, spiegato semplice.
        </h1>
        <p className="hero-in mt-5 max-w-2xl text-[18px] leading-relaxed text-slate [animation-delay:240ms] sm:text-[20px]">
          Due prove scritte da sette ore, i soli codici annotati e un orale che parte da un caso pratico. Ecco cosa cambia e come ci si prepara.
        </p>
        <div className="hero-in mt-8 flex flex-wrap gap-3 [animation-delay:360ms]">
          <Link href="/prova-gratuita" className="btn-primary btn-lg btn-shine">Prova gratis una traccia</Link>
          <Link href="/#corsi" className="btn-secondary btn-lg">Vedi i corsi</Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1080px] px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="text-[28px] font-semibold sm:text-[40px]">Le prove scritte</h2>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {WRITTEN.map((w, i) => (
            <Reveal key={w.t} delay={i * 90} className="h-full">
              <div className="panel h-full p-6">
                <span className="font-serif text-[40px] leading-none text-codice tabular-nums">{i + 1}</span>
                <h3 className="mt-4 text-[19px] font-semibold">{w.t}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-slate">{w.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-codice py-20 text-white">
        <div className="mx-auto grid max-w-[1080px] gap-10 px-4 sm:px-6 md:grid-cols-2">
          <Reveal>
            <h2 className="text-[28px] font-semibold sm:text-[40px]">L&apos;orale</h2>
            <ul className="mt-6 space-y-3">
              {ORAL.map((o) => (
                <li key={o} className="flex gap-3 text-[17px] leading-relaxed text-white/90">
                  <svg aria-hidden viewBox="0 0 16 16" className="mt-1.5 size-4 shrink-0 text-ivory"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {o}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="text-[28px] font-semibold sm:text-[40px]">Come si viene valutati</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-white/85">Gli elaborati sono giudicati su criteri dichiarati:</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {CRITERIA.map((c) => (
                <span key={c} className="rounded-full bg-white/10 px-3.5 py-1.5 text-[15px] text-white">{c}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-[1080px] px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="text-[28px] font-semibold sm:text-[40px]">Come ti prepariamo, prova per prova</h2>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PREP.map((p, i) => (
            <Reveal key={p.t} delay={i * 80} className="h-full">
              <div className="panel h-full p-6">
                <h3 className="text-[19px] font-semibold">{p.t}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-slate">{p.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-surface py-20">
        <div className="mx-auto max-w-[760px] px-4 sm:px-6">
          <h2 className="text-center text-[28px] font-semibold sm:text-[40px]">Domande frequenti sul nuovo esame</h2>
          <div className="mt-10 divide-y divide-line-soft border-y border-line-soft">
            {FAQ.map((f) => (
              <details key={f.q} className="faq group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[18px] font-medium">
                  {f.q}
                  <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-paper text-[18px] text-slate transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 pr-10 text-[16px] leading-relaxed text-slate">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-center text-[14px] text-mute">
            Informazioni aggiornate a ottobre 2026 sulla base delle regole annunciate per la sessione 2026-2027. Fa fede il bando del Ministero della
            Giustizia.
          </p>
        </div>
      </section>

      <section className="py-20 text-center">
        <div className="mx-auto max-w-[760px] px-4 sm:px-6">
          <h2 className="text-[30px] font-semibold sm:text-[44px]">Allenati sulle prove vere.</h2>
          <p className="mt-4 text-[18px] text-slate">{SITE.brand} prepara parere, atto e orale con correzioni personali e simulazioni a tempo.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/prova-gratuita" className="btn-primary btn-lg btn-shine">Prova gratis</Link>
            <Link href="/#corsi" className="btn-secondary btn-lg">Scegli il corso</Link>
          </div>
        </div>
      </section>
    </>
  );
}

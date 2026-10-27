/**
 * L'elemento distintivo della vetrina: un parere svolto, con le correzioni
 * del docente a margine in inchiostro rosso. Mostra ciò che la scuola vende.
 */
export function HeroFascicolo() {
  return (
    <figure className="ink-play relative mx-auto w-full max-w-[560px]" aria-label="Esempio di elaborato corretto dal docente">
      {/* foglio sottostante: il fascicolo */}
      <div aria-hidden className="absolute inset-x-6 -bottom-3 top-6 rotate-[1.5deg] rounded-[6px] border border-line bg-surface" />
      <div className="relative rounded-[6px] border border-line bg-surface px-6 pb-7 pt-6 shadow-[0_1px_0_#d7dde4,0_18px_40px_-24px_rgba(23,33,47,0.35)] sm:px-8">
        <div className="flex items-baseline justify-between border-b border-line-soft pb-3">
          <p className="font-serif text-[15px] italic text-slate">Parere motivato in materia di diritto civile</p>
          <p className="text-xs text-mute">pag. 2 di 4</p>
        </div>

        <div className="grid grid-cols-[1fr_116px] gap-4 pt-4 sm:grid-cols-[1fr_140px]">
          <div className="space-y-3 font-serif text-[15px] leading-[1.7] text-ink sm:text-[16px]">
            <p>
              Ciò premesso, occorre stabilire se il comportamento di Tizio integri un inadempimento{" "}
              <span className="ink-mark" style={{ "--d": "1.8s" } as React.CSSProperties}>di non scarsa importanza</span> ai sensi dell&apos;art. 1455 c.c.,
              tale da giustificare la risoluzione del contratto.
            </p>
            <p>
              La giurisprudenza di legittimità ritiene che la valutazione debba essere condotta{" "}
              <span className="ink-strike" style={{ "--d": "1.8s" } as React.CSSProperties}>in astratto</span>{" "}
              <span className="ink-insert italic text-ceralacca" style={{ "--d": "1.8s" } as React.CSSProperties}>in concreto</span>, avuto riguardo all&apos;interesse
              del creditore all&apos;esatto adempimento.
            </p>
            <p className="text-slate">
              Nel caso di specie, il ritardo di Tizio nella consegna del bene…
            </p>
          </div>

          <div className="relative space-y-6 border-l border-dashed border-ceralacca/40 pl-3">
            <p className="fascicolo-note" style={{ animationDelay: "2.5s" }}>
              Bene: richiami subito la norma. Cita anche l&apos;orientamento prevalente.
            </p>
            <p className="fascicolo-note" style={{ animationDelay: "3.6s" }}>
              Attenzione: è il punto decisivo della traccia.
            </p>
          </div>
        </div>

        <div className="fascicolo-note mt-6 flex items-start gap-3 rounded-[8px] bg-ceralacca-soft px-4 py-3 not-italic" style={{ animationDelay: "4.3s" }}>
          <span aria-hidden className="mt-0.5 font-serif text-xl leading-none text-ceralacca">§</span>
          <p className="font-sans text-sm leading-relaxed text-ink">
            <span className="font-semibold">Giudizio: discreto.</span> Struttura solida e conclusione coerente. Da
            rafforzare la parte sugli orientamenti giurisprudenziali.
          </p>
        </div>
      </div>
      <figcaption className="sr-only">
        Un estratto di parere con annotazioni a margine e un giudizio finale del docente.
      </figcaption>

      <style>{`
        .fascicolo-note {
          font-family: var(--font-serif); font-style: italic; font-size: 14px; line-height: 1.45; color: #a3301d;
          opacity: 0; transform: translateY(4px); animation: fascicolo-in .6s ease-out forwards;
        }
        @keyframes fascicolo-in { to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .fascicolo-note { opacity: 1; transform: none; animation: none; } }
      `}</style>
    </figure>
  );
}

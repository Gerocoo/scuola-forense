import { LogoMark } from "@/components/Logo";
import { Reveal } from "./Reveal";

/**
 * Griglia delle funzioni della piattaforma, in stile pagina prodotto.
 * Ogni riquadro mostra una piccola interfaccia vera, non un'icona decorativa.
 */
export function PlatformBento() {
  return (
    <div className="grid gap-4 md:grid-cols-6">
      {/* Correzione: il riquadro principale */}
      <Reveal className="md:col-span-4">
        <article className="flex h-full flex-col overflow-hidden lift rounded-[24px] bg-surface p-6 shadow-[var(--shadow-card)] sm:rounded-[28px] sm:p-10">
          <h3 className="text-[28px] font-semibold leading-tight sm:text-[32px]">Correzione a margine.</h3>
          <p className="mt-2 max-w-md text-[17px] leading-relaxed text-slate">
            Carichi l&apos;elaborato, il docente lo restituisce annotato riga per riga, con un giudizio motivato.
          </p>
          <div className="mt-8 grid flex-1 grid-cols-[1fr_120px] gap-4 rounded-[18px] bg-paper p-5 sm:grid-cols-[1fr_160px]">
            <div className="space-y-2.5 font-serif text-[15px] leading-[1.7] text-ink">
              <p>
                Occorre stabilire se l&apos;inadempimento sia{" "}
                <span className="ink-mark" style={{ "--d": "0.5s" } as React.CSSProperties}>di non scarsa importanza</span>{" "}
                ai sensi dell&apos;art. 1455 c.c.
              </p>
              <p>
                La valutazione va condotta <span className="ink-strike" style={{ "--d": "0.5s" } as React.CSSProperties}>in astratto</span>{" "}
                <span className="ink-insert italic text-ceralacca" style={{ "--d": "0.5s" } as React.CSSProperties}>in concreto</span>.
              </p>
            </div>
            <div className="space-y-4 border-l border-dashed border-ceralacca/40 pl-3 font-serif text-[13px] italic leading-snug text-ceralacca">
              <p>Bene il richiamo alla norma.</p>
              <p>È il punto decisivo.</p>
            </div>
          </div>
        </article>
      </Reveal>

      {/* Video lezioni */}
      <Reveal className="md:col-span-2" delay={80}>
        <article className="lift flex h-full flex-col overflow-hidden rounded-[24px] bg-codice p-6 text-white sm:rounded-[28px] sm:p-8">
          <h3 className="text-[24px] font-semibold leading-tight">Mini lezioni, quando vuoi.</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-white/75">Tre al mese, da venti minuti. In streaming su ogni dispositivo.</p>
          <div className="mt-auto pt-8">
            <div className="group relative aspect-video overflow-hidden rounded-[14px] bg-codice-deep">
              <div aria-hidden className="absolute inset-0 grid place-items-center">
                <span className="grid size-14 place-items-center rounded-full bg-white/95 shadow-lg transition-transform duration-500 group-hover:scale-110">
                  <svg viewBox="0 0 24 24" className="ml-1 size-6 text-codice"><path d="M7 5v14l12-7z" fill="currentColor" /></svg>
                </span>
              </div>
              <div aria-hidden className="absolute inset-x-3 bottom-3 h-1 overflow-hidden rounded-full bg-white/20">
                <div className="anim-progress h-full w-2/5 rounded-full bg-ivory" />
              </div>
            </div>
          </div>
        </article>
      </Reveal>

      {/* Calendario */}
      <Reveal className="md:col-span-2">
        <article className="lift flex h-full flex-col rounded-[24px] bg-surface p-6 shadow-[var(--shadow-card)] sm:rounded-[28px] sm:p-8">
          <h3 className="text-[24px] font-semibold leading-tight">Un incontro in aula al mese.</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-slate">Prenoti il posto, lo aggiungi al tuo calendario, ricevi il promemoria.</p>
          <div className="mt-auto pt-8">
            <div className="rounded-[16px] bg-paper p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-semibold">Marzo</span>
                <span className="text-[11px] text-mute">2027</span>
              </div>
              <div aria-hidden className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] tabular-nums text-mute">
                {Array.from({ length: 21 }, (_, i) => {
                  const d = i + 8;
                  const on = d === 18;
                  return (
                    <span key={i} className={`grid aspect-square place-items-center rounded-full ${on ? "anim-pulse bg-codice font-semibold text-white" : ""}`}>
                      {d}
                    </span>
                  );
                })}
              </div>
              <p className="mt-3 rounded-[10px] bg-surface px-3 py-2 text-[12px]">
                <span className="font-semibold text-codice">18 mar, 17:00</span> Il parere penale
              </p>
            </div>
          </div>
        </article>
      </Reveal>

      {/* Messaggi */}
      <Reveal className="md:col-span-2" delay={80}>
        <article className="lift flex h-full flex-col rounded-[24px] bg-surface p-6 shadow-[var(--shadow-card)] sm:rounded-[28px] sm:p-8">
          <h3 className="text-[24px] font-semibold leading-tight">Il docente ti risponde.</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-slate">Messaggi diretti, legati alla traccia di cui state parlando.</p>
          <div aria-hidden className="mt-auto space-y-2 pt-8 text-[13px] leading-snug">
            <p className="anim-bubble ml-auto w-fit max-w-[85%] rounded-[16px] rounded-br-[6px] bg-codice px-3.5 py-2 text-white" style={{ "--d": "0.4s" } as React.CSSProperties}>
              Nel parere posso citare anche la Cassazione del 2024?
            </p>
            <p className="anim-bubble w-fit max-w-[85%] rounded-[16px] rounded-bl-[6px] bg-paper px-3.5 py-2" style={{ "--d": "1.3s" } as React.CSSProperties}>
              Sì, ma prima l&apos;orientamento consolidato. Ne parliamo giovedì.
            </p>
          </div>
        </article>
      </Reveal>

      {/* La tua area */}
      <Reveal className="md:col-span-2" delay={160}>
        <article className="lift flex h-full flex-col rounded-[24px] bg-ivory p-6 sm:rounded-[28px] sm:p-8">
          <h3 className="text-[24px] font-semibold leading-tight">Tutto in un&apos;area riservata.</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-slate">Tracce, consegne, correzioni e lezioni. Accedi con Google o con la tua email.</p>
          <div aria-hidden className="mt-auto flex items-end gap-3 pt-8">
            <LogoMark className="size-14" />
            <div className="flex-1 space-y-1.5">
              {[["Da svolgere", "2", "bg-ambra-soft text-ambra"], ["Corrette", "7", "bg-codice-soft text-codice"]].map(([l, n, c]) => (
                <div key={l} className="flex items-center justify-between rounded-[10px] bg-surface px-3 py-1.5 text-[12px]">
                  {l}
                  <span className={`rounded-full px-2 font-semibold tabular-nums ${c}`}>{n}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </Reveal>
    </div>
  );
}

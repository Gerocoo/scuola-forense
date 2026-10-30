import Link from "next/link";
import { HeroFascicolo } from "@/components/site/HeroFascicolo";
import { PackageCard } from "@/components/site/PackageCard";
import { PlatformBento } from "@/components/site/PlatformBento";
import { Reveal } from "@/components/site/Reveal";
import { Marquee, ScrollWords, WordsIn } from "@/components/site/Motion";
import { Spotlight } from "@/components/site/Spotlight";
import { LogoMark } from "@/components/Logo";
import { ABOUT, FAQ, HERO, METHOD, SITE, STATS, TEAM, TESTIMONIALS } from "@/content/site";
import { createClient } from "@/lib/supabase/server";
import { initials, SUBJECTS } from "@/lib/format";
import type { Package } from "@/lib/types";
import { enrolledCounts, seatsLeft } from "@/lib/seats";

type Props = { searchParams: Promise<{ materia?: string }> };

export default async function HomePage({ searchParams }: Props) {
  const { materia } = await searchParams;
  const supabase = await createClient();
  const { data: packages } = await supabase
    .from("packages")
    .select("*")
    .eq("active", true)
    .not("slug", "in", "(archivio-tracce,modulo-orale)")
    .order("sort")
    .returns<Package[]>();
  const taken = await enrolledCounts((packages ?? []).filter((p) => p.seats).map((p) => p.id));

  return (
    <>
      {/* Apertura: titolo grande al centro, poi il "prodotto" su un palco verde */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="aurora" />
        <div className="mx-auto max-w-[1080px] px-4 pt-16 text-center sm:px-6 sm:pt-24">
          <p className="hero-in font-serif text-[19px] italic text-codice sm:text-[21px]">
            Preparazione all&apos;esame di abilitazione alla professione forense
          </p>
          <h1 className="mx-auto mt-4 max-w-4xl text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[64px] lg:text-[76px]">
            <WordsIn text={HERO.title} start={150} />
          </h1>
          <p className="hero-in [animation-delay:260ms] mx-auto mt-6 max-w-2xl text-[19px] leading-relaxed text-slate sm:text-[21px]">{HERO.body}</p>
          <div className="hero-in [animation-delay:400ms] mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="#corsi" className="btn-primary btn-lg btn-shine">Scegli il corso</Link>
            <Link href="/prova-gratuita" className="btn-secondary btn-lg">Prova gratis</Link>
            <Link href="#metodo" className="btn-ghost btn-lg btn-arrow">
              Come funziona
              <svg aria-hidden viewBox="0 0 16 16" className="size-4"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-[1180px] px-4 sm:mt-20 sm:px-6">
          <div className="stage-in"><div className="stage-scroll relative overflow-hidden rounded-[32px] bg-codice px-4 pb-0 pt-12 sm:rounded-[40px] sm:px-10 sm:pt-16">
            {/* tempio in filigrana: richiama il marchio senza competere con il foglio */}
            <svg aria-hidden viewBox="0 0 64 64" className="temple-float pointer-events-none absolute -right-16 -top-10 size-[420px] opacity-[0.07]">
              <polygon points="12,22.6 32,11.2 52,22.6" fill="#f4eee2" />
              <rect x="13" y="23.8" width="38" height="2.2" fill="#f4eee2" />
              {[19, 27, 37, 45].map((c) => (
                <rect key={c} x={c - 1.9} y="28.6" width="3.8" height="13.7" fill="#f4eee2" />
              ))}
              <rect x="13" y="42.9" width="38" height="2" fill="#f4eee2" />
            </svg>
            <div className="relative translate-y-6">
              <HeroFascicolo />
            </div>
          </div></div>
        </div>
      </section>

      {/* Nastro delle materie */}
      <div className="border-y border-black/[0.06] bg-surface/60 py-5 text-[15px] font-medium text-slate">
        <Marquee
          items={["Atto giudiziario", "Parere di diritto civile", "Parere di diritto penale", "Deontologia forense", "Diritto amministrativo", "Correzione personale", "Lezioni in presenza", "Simulazioni d'esame"]}
        />
      </div>

      {/* Chi siamo: una dichiarazione, grande */}
      <section className="mx-auto max-w-[1080px] px-4 py-20 sm:px-6 sm:py-36">
        <Reveal>
          <p className="text-[15px] font-medium text-codice">{ABOUT.title}</p>
          <p className="mt-5 max-w-4xl text-[26px] font-semibold leading-[1.2] tracking-[-0.025em] text-ink sm:text-[44px]">
            <ScrollWords text={ABOUT.body[0]} />
          </p>
          <p className="mt-8 max-w-2xl text-[19px] leading-relaxed text-slate">{ABOUT.body[1]}</p>
        </Reveal>
      </section>

      {STATS.length > 0 && (
        <section aria-label="Risultati" className="border-y border-black/[0.06] bg-surface">
          <dl className="mx-auto grid max-w-[1080px] gap-8 px-4 py-14 text-center sm:grid-cols-3 sm:px-6">
            {STATS.map((st) => (
              <Reveal key={st.label}>
                <dt className="sr-only">{st.label}</dt>
                <dd className="text-[44px] font-semibold tracking-[-0.03em] text-codice tabular-nums">{st.value}</dd>
                <dd className="mt-1 text-[16px] text-slate">{st.label}</dd>
              </Reveal>
            ))}
          </dl>
        </section>
      )}

      {/* Metodo: sequenza reale, quindi numerata */}
      <section id="metodo" className="scroll-mt-16 bg-surface py-20 sm:py-32">
        <div className="mx-auto max-w-[1080px] px-4 sm:px-6">
          <Reveal className="text-center">
            <h2 className="text-[32px] font-semibold leading-tight sm:text-[56px]">{METHOD.title}.</h2>
            <p className="mx-auto mt-4 max-w-xl text-[19px] leading-relaxed text-slate">{METHOD.intro}</p>
          </Reveal>
          <Reveal className="relative mt-16 hidden lg:block" >
            <div aria-hidden className="relative h-3">
              <span className="step-line absolute inset-x-[6px] top-1/2 h-px -translate-y-1/2 bg-codice/30" />
              <div className="absolute inset-0 grid grid-cols-4 gap-x-8">
                {METHOD.steps.map((s, i) => (
                  <span key={s.title} className="step-dot block size-3 rounded-full bg-codice ring-4 ring-surface" style={{ ["--d" as string]: `${0.35 + i * 0.32}s` }} />
                ))}
              </div>
            </div>
          </Reveal>
          <ol className="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:mt-8 lg:grid-cols-4">
            {METHOD.steps.map((s, i) => (
              <li key={s.title}>
                <Reveal delay={i * 90}>
                  <span className="font-serif text-[56px] leading-none text-codice tabular-nums">{i + 1}</span>
                  <h3 className="mt-5 text-[21px] font-semibold">{s.title}</h3>
                  <p className="mt-2 text-[16px] leading-relaxed text-slate">{s.body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Piattaforma */}
      <section id="piattaforma" className="scroll-mt-16 py-20 sm:py-32">
        <div className="mx-auto max-w-[1080px] px-4 sm:px-6">
          <Reveal className="mb-14 max-w-3xl">
            <h2 className="text-[32px] font-semibold leading-tight sm:text-[56px]">La scuola, sempre con te.</h2>
            <p className="mt-4 text-[19px] leading-relaxed text-slate">
              Lezioni, tracce, correzioni e messaggi in un&apos;unica area riservata, dal computer o dal telefono.
            </p>
          </Reveal>
          <PlatformBento />
        </div>
      </section>

      {/* Docenti: su fondo verde, l'unica sezione scura della pagina */}
      <section id="docenti" className="relative isolate scroll-mt-16 overflow-hidden bg-codice py-20 text-white sm:py-32">
        <svg aria-hidden viewBox="0 0 64 64" className="parallax pointer-events-none absolute -left-24 bottom-0 -z-10 size-[460px] opacity-[0.05]">
          <polygon points="12,22.6 32,11.2 52,22.6" fill="#f4eee2" />
          <rect x="13" y="23.8" width="38" height="2.2" fill="#f4eee2" />
          {[19, 27, 37, 45].map((c) => (
            <rect key={c} x={c - 1.9} y="28.6" width="3.8" height="13.7" fill="#f4eee2" />
          ))}
          <rect x="13" y="42.9" width="38" height="2" fill="#f4eee2" />
        </svg>
        <div className="mx-auto max-w-[1080px] px-4 sm:px-6">
          <Reveal className="max-w-3xl">
            <h2 className="text-[32px] font-semibold leading-tight sm:text-[56px]">I docenti.</h2>
            <p className="mt-4 text-[19px] leading-relaxed text-white/75">
              Avvocati che correggono personalmente ogni elaborato e rispondono ai tuoi messaggi.
            </p>
          </Reveal>
          <div className={`mt-14 grid gap-4 ${TEAM.length === 2 ? "md:grid-cols-2 lg:mx-auto lg:max-w-[760px]" : "md:grid-cols-3"}`}>
            {TEAM.map((t, i) => (
              <Reveal key={t.name + t.role} delay={i * 90} className="h-full">
                <Spotlight tone="dark" className="h-full rounded-[24px] bg-white/[0.07] p-6 ring-1 sm:rounded-[28px] sm:p-8 ring-white/10">
                  <span aria-hidden className="grid size-20 place-items-center rounded-full bg-ivory font-serif text-[28px] text-codice">
                    {initials(t.name.replace(/^(Avv\.|Dott\.|Prof\.)\s*/, ""))}
                  </span>
                  <h3 className="mt-6 text-[21px] font-semibold">{t.name}</h3>
                  {t.credential && (
                    <p className="mt-1 inline-block rounded-full bg-ivory px-2.5 py-0.5 text-[13px] font-semibold text-codice">{t.credential}</p>
                  )}
                  <p className="text-[15px] text-ivory/80">{t.role}</p>
                  <p className="mt-4 text-[15px] leading-relaxed text-white/80">{t.bio}</p>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {t.subjects.map((s) => (
                      <li key={s} className="rounded-full bg-white/10 px-3 py-1 text-[14px] text-white/90">{s}</li>
                    ))}
                  </ul>
                </Spotlight>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {TESTIMONIALS.length > 0 && (
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-[1080px] px-4 sm:px-6">
            <Reveal className="max-w-3xl">
              <h2 className="text-[32px] font-semibold leading-tight sm:text-[48px]">Chi ha studiato con noi.</h2>
            </Reveal>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <Reveal key={t.name} delay={i * 90} className="h-full">
                  <figure className="panel flex h-full flex-col p-6">
                    <blockquote className="flex-1 font-serif text-[18px] italic leading-relaxed text-ink">&ldquo;{t.quote}&rdquo;</blockquote>
                    <figcaption className="mt-5 text-[15px]">
                      <span className="font-semibold">{t.name}</span>
                      <span className="block text-mute">{t.detail}</span>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Corsi */}
      <section id="corsi" className="scroll-mt-16 py-20 sm:py-32">
        <div className="mx-auto max-w-[1080px] px-4 sm:px-6">
          <Reveal className="text-center">
            <h2 className="text-[32px] font-semibold leading-tight sm:text-[56px]">Scegli il tuo percorso.</h2>
            <p className="mx-auto mt-4 max-w-xl text-[19px] leading-relaxed text-slate">
              In base a quanto manca alla prova. Dopo il pagamento l&apos;area riservata è attiva subito.
            </p>
          </Reveal>
          {packages && packages.some((p) => p.subject) && (
            <nav aria-label="Filtra per materia" className="mt-10 flex flex-wrap justify-center gap-2">
              {[{ v: "", l: "Tutte" }, ...SUBJECTS.map((x) => ({ v: x.value, l: x.label.replace("Diritto ", "") }))].map((f) => (
                <Link
                  key={f.v}
                  href={f.v ? `/?materia=${f.v}#corsi` : "/#corsi"}
                  scroll={false}
                  aria-current={(materia ?? "") === f.v ? "true" : undefined}
                  className={`rounded-full px-4 py-1.5 text-[15px] capitalize ${(materia ?? "") === f.v ? "bg-ink text-white" : "border border-line bg-surface text-slate hover:text-ink"}`}
                >
                  {f.l}
                </Link>
              ))}
            </nav>
          )}
          {packages && packages.length > 0 ? (
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {packages.filter((p) => !materia || !p.subject || p.subject === materia).map((p, i) => (
                <Reveal key={p.id} delay={i * 90} className="h-full">
                  <Spotlight tone={p.highlight ? "dark" : "light"} className="h-full rounded-[28px]">
                    <PackageCard pkg={p} left={seatsLeft(p.seats, taken.get(p.id) ?? 0)} />
                  </Spotlight>
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="panel mx-auto mt-14 max-w-lg p-8 text-center text-slate">
              Le iscrizioni ai nuovi corsi apriranno a breve. Scrivi alla segreteria per essere avvisato.
            </p>
          )}
        </div>
      </section>

      {/* Domande */}
      <section id="domande" className="scroll-mt-16 bg-surface py-20 sm:py-32">
        <div className="mx-auto max-w-[760px] px-4 sm:px-6">
          <h2 className="text-center text-[32px] font-semibold leading-tight sm:text-[48px]">Domande frequenti.</h2>
          <div className="mt-12 divide-y divide-line-soft border-y border-line-soft">
            {FAQ.map((f) => (
              <details key={f.q} className="faq group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[19px] font-medium text-ink">
                  {f.q}
                  <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-paper text-[18px] leading-none text-slate transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 pr-12 text-[17px] leading-relaxed text-slate">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Chiusura */}
      <section className="py-20 sm:py-32">
        <Reveal className="mx-auto flex max-w-[760px] flex-col items-center px-4 text-center sm:px-6">
          <span className="temple-float"><LogoMark className="glow size-20" /></span>
          <h2 className="mt-8 text-[30px] font-semibold leading-tight sm:text-[48px]">La prova si prepara scrivendo.</h2>
          <p className="mt-4 text-[19px] leading-relaxed text-slate">Inizia dal corso più adatto a te. {SITE.brand} ti accompagna fino all&apos;abilitazione.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="#corsi" className="btn-primary btn-lg btn-shine">Scegli il corso</Link>
            <Link href="/prova-gratuita" className="btn-secondary btn-lg">Prova gratis una traccia</Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}

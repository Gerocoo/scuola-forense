import Link from "next/link";
import { HeroFascicolo } from "@/components/site/HeroFascicolo";
import { PackageCard } from "@/components/site/PackageCard";
import { ABOUT, FAQ, HERO, METHOD, TEAM } from "@/content/site";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/format";
import type { Package } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: packages } = await supabase
    .from("packages")
    .select("*")
    .eq("active", true)
    .order("sort")
    .returns<Package[]>();

  return (
    <>
      {/* Apertura */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1fr_minmax(0,560px)]">
        <div className="max-w-xl">
          <p className="text-[15px] font-medium text-codice">Preparazione all&apos;esame di avvocato</p>
          <h1 className="mt-4 text-[40px] font-semibold leading-[1.05] text-ink sm:text-[52px]">{HERO.title}</h1>
          <p className="mt-6 text-lg leading-relaxed text-slate">{HERO.body}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="#corsi" className="btn-primary">Scegli il corso</Link>
            <Link href="#metodo" className="btn-secondary">Come funziona</Link>
          </div>
        </div>
        <HeroFascicolo />
      </section>

      {/* Chi siamo */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[280px_1fr]">
          <h2 className="text-3xl font-semibold text-ink">{ABOUT.title}</h2>
          <div className="max-w-2xl space-y-5 font-serif text-[19px] leading-[1.7] text-ink">
            {ABOUT.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Metodo: è davvero una sequenza, quindi è numerata */}
      <section id="metodo" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold text-ink sm:text-4xl">{METHOD.title}</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate">{METHOD.intro}</p>
          </div>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {METHOD.steps.map((s, i) => (
              <li key={s.title} className="bg-surface p-6">
                <span className="font-serif text-3xl text-codice tabular-nums">{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-[15px] text-slate">
            Ogni mese: tre mini lezioni registrate e una lezione in presenza.
          </p>
        </div>
      </section>

      {/* Docenti */}
      <section id="docenti" className="scroll-mt-20 border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold text-ink sm:text-4xl">I docenti</h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate">
            Avvocati e magistrati che correggono personalmente gli elaborati e rispondono ai tuoi messaggi.
          </p>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {TEAM.map((t) => (
              <article key={t.name + t.role}>
                <div className="flex items-center gap-4">
                  <span aria-hidden className="grid size-14 place-items-center rounded-full bg-codice-soft text-lg font-semibold text-codice">
                    {initials(t.name.replace(/^(Avv\.|Dott\.|Prof\.)\s*/, ""))}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{t.name}</h3>
                    <p className="text-[15px] text-slate">{t.role}</p>
                  </div>
                </div>
                <p className="mt-4 text-[15px] leading-relaxed text-ink">{t.bio}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {t.subjects.map((s) => (
                    <li key={s} className="rounded-full border border-line px-3 py-1 text-sm text-slate">{s}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Corsi */}
      <section id="corsi" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold text-ink sm:text-4xl">Corsi e prezzi</h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate">
            Scegli il percorso in base a quanto manca alla prova. Dopo il pagamento l&apos;area riservata è attiva subito.
          </p>
          {packages && packages.length > 0 ? (
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {packages.map((p) => (
                <PackageCard key={p.id} pkg={p} />
              ))}
            </div>
          ) : (
            <p className="mt-12 panel p-6 text-slate">
              Le iscrizioni ai nuovi corsi apriranno a breve. Scrivi alla segreteria per essere avvisato.
            </p>
          )}
        </div>
      </section>

      {/* Domande */}
      <section id="domande" className="scroll-mt-20 border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[280px_1fr]">
          <h2 className="text-3xl font-semibold text-ink">Domande frequenti</h2>
          <div className="divide-y divide-line-soft border-y border-line-soft">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-medium text-ink">
                  {f.q}
                  <span aria-hidden className="text-2xl leading-none text-mute transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-slate">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

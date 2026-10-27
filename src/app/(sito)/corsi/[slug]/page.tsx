import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentPrice, dateLong, euro } from "@/lib/format";
import { startCheckout } from "@/app/checkout/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Package } from "@/lib/types";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ errore?: string }> };

async function load(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("packages").select("*").eq("slug", slug).eq("active", true).maybeSingle<Package>();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pkg = await load((await params).slug);
  return pkg ? { title: `${pkg.title}, ${pkg.period_label}`, description: pkg.tagline } : {};
}

export default async function CorsoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { errore } = await searchParams;
  const pkg = await load(slug);
  if (!pkg) notFound();

  const price = currentPrice(pkg);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <Link href="/#corsi" className="text-[15px] text-slate hover:text-ink">Tutti i corsi</Link>

      <div className="mt-6 grid gap-12 lg:grid-cols-[1fr_380px]">
        <div>
          <p className="text-[15px] font-medium text-codice">{pkg.period_label}</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight text-ink sm:text-5xl">{pkg.title}</h1>
          <p className="mt-4 text-xl leading-relaxed text-slate">{pkg.tagline}</p>

          <div className="prose-legal mt-10 max-w-2xl">
            {pkg.description.split(/\n{2,}/).map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>

          <h2 className="mt-12 text-xl font-semibold text-ink">Cosa comprende</h2>
          <ul className="mt-4 max-w-2xl divide-y divide-line-soft border-y border-line-soft">
            {pkg.features.map((f) => (
              <li key={f} className="py-3 text-[16px] text-ink">{f}</li>
            ))}
          </ul>

          <dl className="mt-10 grid max-w-2xl gap-6 sm:grid-cols-3">
            {pkg.starts_on && (
              <div>
                <dt className="text-sm text-mute">Inizio</dt>
                <dd className="mt-1 font-medium text-ink">{dateLong(pkg.starts_on)}</dd>
              </div>
            )}
            {pkg.ends_on && (
              <div>
                <dt className="text-sm text-mute">Fine</dt>
                <dd className="mt-1 font-medium text-ink">{dateLong(pkg.ends_on)}</dd>
              </div>
            )}
            {pkg.access_until && (
              <div>
                <dt className="text-sm text-mute">Accesso all&apos;area fino al</dt>
                <dd className="mt-1 font-medium text-ink">{dateLong(pkg.access_until)}</dd>
              </div>
            )}
          </dl>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="panel p-6">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight tabular-nums">{euro(price.amount)}</span>
              {price.promoActive && <span className="text-mute line-through tabular-nums">{euro(price.full)}</span>}
            </div>
            {price.promoActive && pkg.promo_label && (
              <p className="mt-3 inline-block rounded-full bg-ceralacca-soft px-3 py-1 text-sm font-medium text-ceralacca">
                {pkg.promo_label}
              </p>
            )}
            <form action={startCheckout} className="mt-6">
              <input type="hidden" name="slug" value={pkg.slug} />
              <SubmitButton className="btn-primary w-full" pendingLabel="Apertura del pagamento…">
                Iscriviti e paga
              </SubmitButton>
            </form>
            {errore && (
              <p role="alert" className="mt-3 text-sm text-ceralacca">
                Non è stato possibile avviare il pagamento. Riprova tra qualche minuto o scrivi alla segreteria.
              </p>
            )}
            <ul className="mt-6 space-y-2 border-t border-line-soft pt-5 text-sm text-slate">
              <li>Pagamento sicuro con Stripe: carta, Apple Pay, Google Pay</li>
              <li>Fattura via email con codice fiscale o partita IVA</li>
              <li>Accesso all&apos;area riservata subito dopo il pagamento</li>
            </ul>
          </div>
          <p className="mt-4 text-sm text-slate">
            Hai un codice sconto? Lo inserisci nella pagina di pagamento.
          </p>
        </aside>
      </div>
    </div>
  );
}

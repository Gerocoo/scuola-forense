import Link from "next/link";
import type { Package } from "@/lib/types";
import { currentPrice, euro } from "@/lib/format";

export function PackageCard({ pkg }: { pkg: Package }) {
  const price = currentPrice(pkg);

  return (
    <article
      className={`flex flex-col rounded-[var(--radius-panel)] border bg-surface p-6 ${
        pkg.highlight ? "border-codice ring-1 ring-codice" : "border-line"
      }`}
    >
      <div className="space-y-1">
        <p className="text-sm font-medium text-codice">{pkg.period_label}</p>
        <h3 className="text-xl font-semibold text-ink">{pkg.title}</h3>
        <p className="text-[15px] leading-relaxed text-slate">{pkg.tagline}</p>
      </div>

      <div className="mt-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tracking-tight text-ink tabular-nums">{euro(price.amount)}</span>
          {price.promoActive && (
            <span className="text-base text-mute line-through tabular-nums">{euro(price.full)}</span>
          )}
        </div>
        <p className="mt-1 text-sm text-mute">Prezzo finale, pagamento unico</p>
        {price.promoActive && pkg.promo_label && (
          <p className="mt-3 inline-block rounded-full bg-ceralacca-soft px-3 py-1 text-sm font-medium text-ceralacca">
            {pkg.promo_label}
          </p>
        )}
      </div>

      <ul className="mt-6 flex-1 space-y-2.5 border-t border-line-soft pt-5">
        {pkg.features.map((f) => (
          <li key={f} className="flex gap-2.5 text-[15px] leading-snug text-ink">
            <svg aria-hidden viewBox="0 0 16 16" className="mt-1 size-3.5 shrink-0 text-codice">
              <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <Link
        href={`/corsi/${pkg.slug}`}
        className={`mt-7 ${pkg.highlight ? "btn-primary" : "btn-secondary"}`}
      >
        Vedi il corso
      </Link>
    </article>
  );
}

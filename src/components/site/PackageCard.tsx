import Link from "next/link";
import type { Package } from "@/lib/types";
import { currentPrice, euro, subjectLabel } from "@/lib/format";
import { PromoCountdown } from "./PromoCountdown";

export function PackageCard({ pkg, left = null }: { pkg: Package; left?: number | null }) {
  const installments = process.env.PAGAMENTO_RATE === "1";
  const price = currentPrice(pkg);
  const dark = pkg.highlight;

  return (
    <article
      className={`flex h-full flex-col rounded-[24px] p-6 sm:rounded-[28px] sm:p-8 ${
        dark ? "bg-codice text-white" : "bg-surface text-ink shadow-[var(--shadow-card)]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className={`text-[14px] font-medium ${dark ? "text-ivory/80" : "text-codice"}`}>{pkg.period_label}</p>
        <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${dark ? "bg-white/15 text-white" : "bg-paper text-slate"}`}>
          {subjectLabel(pkg.subject) ?? "Civile, penale e amministrativo"}
        </span>
      </div>
      <h3 className="mt-1 text-[26px] font-semibold leading-tight">{pkg.title}</h3>
      <p className={`mt-2 text-[15px] leading-relaxed ${dark ? "text-white/75" : "text-slate"}`}>{pkg.tagline}</p>

      <div className="mt-8">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{euro(price.amount)}</span>
          {price.promoActive && (
            <span className={`text-[17px] line-through tabular-nums ${dark ? "text-white/50" : "text-mute"}`}>{euro(price.full)}</span>
          )}
        </div>
        {price.promoActive && pkg.promo_label && (
          <p className={`mt-3 inline-block rounded-full px-3 py-1 text-[14px] font-medium ${dark ? "bg-white/15 text-ivory" : "bg-ceralacca-soft text-ceralacca"}`}>
            {pkg.promo_label}
          </p>
        )}
        {price.promoActive && pkg.promo_until && <PromoCountdown until={pkg.promo_until} dark={dark} />}
        <p className={`mt-2 text-[14px] ${dark ? "text-white/70" : "text-mute"}`}>
          {installments ? "Pagamento unico o in 3 rate senza interessi" : "Pagamento unico"}
        </p>
        {left !== null && (
          <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-semibold ${
            left === 0 ? (dark ? "bg-white/15 text-white" : "bg-line-soft text-slate") : left <= 10 ? (dark ? "bg-ceralacca text-white" : "bg-ceralacca-soft text-ceralacca") : dark ? "bg-white/15 text-ivory" : "bg-codice-soft text-codice"
          }`}>
            {left === 0 ? "Posti esauriti" : left === 1 ? "Resta 1 posto" : `Restano ${left} posti`}
          </p>
        )}
      </div>

      <ul className={`mt-8 flex-1 space-y-3 border-t pt-6 ${dark ? "border-white/15" : "border-line-soft"}`}>
        {pkg.features.map((f) => (
          <li key={f} className="flex gap-3 text-[15px] leading-snug">
            <svg aria-hidden viewBox="0 0 16 16" className={`mt-0.5 size-4 shrink-0 ${dark ? "text-ivory" : "text-codice"}`}>
              <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <Link
        href={`/corsi/${pkg.slug}`}
        className={`mt-8 w-full ${dark ? "btn-primary bg-ivory text-codice hover:bg-white" : "btn-primary"}`}
      >
        {left === 0 ? "Vedi il corso" : "Scopri il corso"}
      </Link>
    </article>
  );
}

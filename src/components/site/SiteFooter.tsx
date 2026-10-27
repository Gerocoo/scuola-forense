import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SITE } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-slate">{SITE.description}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-ink">Contatti</p>
          <p className="text-slate">
            <a className="hover:text-ink" href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </p>
          <p className="text-slate">{SITE.phone}</p>
          <p className="text-slate">{SITE.address}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-ink">Piattaforma</p>
          <p><Link className="text-slate hover:text-ink" href="/accedi">Accedi</Link></p>
          <p><Link className="text-slate hover:text-ink" href="/privacy">Privacy e cookie</Link></p>
          <p><Link className="text-slate hover:text-ink" href="/termini">Termini di vendita</Link></p>
        </div>
      </div>
      <div className="border-t border-line-soft">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-mute sm:px-6">
          © {new Date().getFullYear()} {SITE.name}. {SITE.vat}
        </p>
      </div>
    </footer>
  );
}

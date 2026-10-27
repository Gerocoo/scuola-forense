import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { SITE } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="bg-paper">
      <div className="mx-auto max-w-[1080px] px-4 sm:px-6">
        <div className="grid gap-10 border-t border-black/[0.08] py-12 text-[13px] md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="flex items-start gap-3">
            <LogoMark className="size-9" />
            <div>
              <p className="font-serif text-[17px] font-medium uppercase tracking-[0.14em] text-ink">{SITE.brand}</p>
              <p className="mt-1 max-w-xs leading-relaxed text-mute">{SITE.description}</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-ink">Contatti</p>
            <p><a className="text-mute hover:text-ink" href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p className="text-mute">{SITE.phone}</p>
            <p className="text-mute">{SITE.address}</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-ink">Piattaforma</p>
            <p><Link className="text-mute hover:text-ink" href="/accedi">Accedi</Link></p>
            <p><Link className="text-mute hover:text-ink" href="/privacy">Privacy e cookie</Link></p>
            <p><Link className="text-mute hover:text-ink" href="/termini">Termini di vendita</Link></p>
          </div>
        </div>
        <p className="border-t border-black/[0.08] py-5 text-[12px] text-mute">
          Copyright © {new Date().getFullYear()} {SITE.name}. {SITE.vat}
        </p>
      </div>
    </footer>
  );
}

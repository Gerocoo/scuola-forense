import Link from "next/link";
import { SITE } from "@/content/site";

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label={SITE.name}>
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-[9px] bg-codice font-serif text-[22px] leading-none text-white"
      >
        §
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold leading-tight tracking-[-0.01em] text-ink">
          {SITE.shortName}
        </span>
      )}
    </Link>
  );
}

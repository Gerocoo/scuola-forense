import Link from "next/link";
import { SITE } from "@/content/site";

/** Simbolo: un foglio con il margine e una correzione in rosso. Stesso disegno di /public/brand/margine-simbolo.svg */
export function LogoMark({ className = "size-9", inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={`${className} shrink-0`} aria-hidden>
      <rect width="64" height="64" rx="14" fill={inverted ? "#ffffff" : "#1d5747"} />
      <g fill="none" strokeLinecap="round">
        <path d="M19 14v36" stroke={inverted ? "#a3301d" : "#ef8e7a"} strokeWidth="3" />
        <g stroke={inverted ? "#1d5747" : "#ffffff"} strokeWidth="4">
          <path d="M27 21h23" />
          <path d="M27 29.5h10" />
          <path d="M27 38h23" />
          <path d="M27 46.5h13" />
        </g>
        <path d="M42 29.5h8" stroke={inverted ? "#a3301d" : "#ef8e7a"} strokeWidth="4" />
      </g>
    </svg>
  );
}

export function Logo({
  href = "/",
  compact = false,
  inverted = false,
}: {
  href?: string;
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label={SITE.name}>
      <LogoMark inverted={inverted} />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className={`font-serif text-[22px] font-medium tracking-[-0.01em] ${inverted ? "text-white" : "text-ink"}`}>
            {SITE.brand}
          </span>
          <span className={`mt-0.5 hidden text-[11px] sm:block ${inverted ? "text-white/70" : "text-mute"}`}>
            {SITE.tagline}
          </span>
        </span>
      )}
    </Link>
  );
}

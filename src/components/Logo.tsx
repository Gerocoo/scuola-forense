import Link from "next/link";
import { SITE } from "@/content/site";
import { MARK_SHAPES } from "./brand-mark";

const GREEN = "#1d5747";
const IVORY = "#f4eee2";

/** Simbolo: un tempio che poggia su un libro aperto. Stesso disegno di /public/brand/pronao-simbolo.svg */
export function LogoMark({ className = "size-10", inverted = false }: { className?: string; inverted?: boolean }) {
  const bg = inverted ? IVORY : GREEN;
  const fg = inverted ? GREEN : IVORY;
  return (
    <svg viewBox="0 0 64 64" className={`${className} shrink-0`} aria-hidden>
      <rect width="64" height="64" rx="14" fill={bg} />
      {MARK_SHAPES.map((s, i) =>
        s.t === "p" ? (
          <polygon key={i} points={s.d} fill={s.c === "fg" ? fg : bg} />
        ) : (
          <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.c === "fg" ? fg : bg} />
        ),
      )}
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
    <Link href={href} className="group inline-flex items-center gap-3" aria-label={SITE.name}>
      <LogoMark inverted={inverted} />
      {!compact && (
        <span className="flex flex-col leading-none">
          {/* maiuscole spaziate come nelle iscrizioni romane */}
          <span className={`font-serif text-[20px] font-medium uppercase tracking-[0.16em] ${inverted ? "text-white" : "text-ink"}`}>
            {SITE.brand}
          </span>
          <span className={`mt-1 hidden text-[11px] sm:block ${inverted ? "text-white/70" : "text-mute"}`}>
            {SITE.tagline}
          </span>
        </span>
      )}
    </Link>
  );
}

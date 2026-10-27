/**
 * Piccoli effetti di movimento senza JavaScript (animazioni CSS legate allo scorrimento).
 * Sui browser che non le supportano il testo resta semplicemente visibile.
 */

/** Titolo che compare parola per parola, con una leggera sfocatura che si dissolve. */
export function WordsIn({ text, className = "", start = 120, step = 55 }: { text: string; className?: string; start?: number; step?: number }) {
  const words = text.split(/\s+/);
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="word-in" style={{ animationDelay: `${start + i * step}ms` }}>
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

/** Frase che si "accende" parola per parola mentre la si scorre, come su apple.com. */
export function ScrollWords({ text, className = "" }: { text: string; className?: string }) {
  const words = text.split(/\s+/);
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i} className="scroll-word">
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

/** Nastro di parole che scorre all'infinito. */
export function Marquee({ items, className = "" }: { items: string[]; className?: string }) {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="marquee-row flex shrink-0 items-center gap-10 pr-10">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-10 whitespace-nowrap">
          <span>{it}</span>
          <svg aria-hidden viewBox="0 0 12 12" className="size-2.5 opacity-50"><path d="M6 0l1.6 4.4L12 6l-4.4 1.6L6 12 4.4 7.6 0 6l4.4-1.6z" fill="currentColor" /></svg>
        </li>
      ))}
    </ul>
  );
  return (
    <div className={`marquee flex overflow-hidden ${className}`}>
      {row(false)}
      {row(true)}
    </div>
  );
}

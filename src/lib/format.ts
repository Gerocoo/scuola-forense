import type { AssignmentKind, AssignmentStatus, Package } from "./types";

const TZ = "Europe/Rome";

export function euro(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function dateLong(iso: string | null | undefined) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));
}

export function dateShort(iso: string | null | undefined) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: TZ }).format(new Date(iso));
}

export function dateTime(iso: string | null | undefined) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}

export function relative(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("it", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return "adesso";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  return dateShort(iso);
}

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/** Valore per <input type="datetime-local"> nel fuso di Roma. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
  return parts.replace(" ", "T");
}

/** Converte "2027-03-01T18:00" (ora di Roma) in ISO UTC. */
export function fromLocalInput(value: string | null | undefined): string | null {
  if (!value) return null;
  const [d, t] = value.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = (t ?? "00:00").split(":").map(Number);
  const guess = Date.UTC(y, m - 1, day, hh, mm);
  // calcola l'offset di Roma in quel momento
  const asRome = new Date(new Date(guess).toLocaleString("en-US", { timeZone: TZ }));
  const asUtc = new Date(new Date(guess).toLocaleString("en-US", { timeZone: "UTC" }));
  const offset = asRome.getTime() - asUtc.getTime();
  return new Date(guess - offset).toISOString();
}

export function currentPrice(p: Pick<Package, "price_cents" | "promo_price_cents" | "promo_until">) {
  const promoActive =
    p.promo_price_cents != null &&
    p.promo_price_cents < p.price_cents &&
    (!p.promo_until || new Date(p.promo_until) > new Date());
  return {
    amount: promoActive ? p.promo_price_cents! : p.price_cents,
    promoActive,
    full: p.price_cents,
  };
}

export const KIND_LABEL: Record<AssignmentKind, string> = {
  parere: "Parere",
  atto: "Atto giudiziario",
  esercizio: "Esercizio",
  documento: "Documento",
};

export const STATUS_LABEL: Record<AssignmentStatus, string> = {
  assegnato: "Da svolgere",
  consegnato: "Consegnato",
  in_correzione: "In correzione",
  corretto: "Corretto",
};

export const STATUS_LABEL_TEACHER: Record<AssignmentStatus, string> = {
  assegnato: "In attesa del discente",
  consegnato: "Da correggere",
  in_correzione: "In correzione",
  corretto: "Corretto",
};

export function initials(name: string, email?: string) {
  const src = name.trim() || email || "?";
  const parts = src.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export const SUBJECTS = [
  { value: "civile", label: "Diritto civile" },
  { value: "penale", label: "Diritto penale" },
  { value: "amministrativo", label: "Diritto amministrativo" },
] as const;
export type Subject = (typeof SUBJECTS)[number]["value"];
export const subjectLabel = (s: string | null | undefined) => SUBJECTS.find((x) => x.value === s)?.label ?? null;

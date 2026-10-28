import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Impegni mensili promessi in vendita (video lezioni, incontri, tracce) confrontati con
 * quanto i docenti hanno davvero pubblicato nel mese in corso.
 */

export type CommitmentItem = { key: "recorded" | "live" | "exercises"; label: string; done: number; promised: number };

export type CourseCommitment = {
  packageId: string;
  title: string;
  items: CommitmentItem[];
  missing: number; // contenuti ancora da pubblicare nel mese
  daysLeft: number; // giorni alla fine del mese (oggi incluso)
  monthLabel: string;
};

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

export function romeMonth(at = new Date()) {
  const [y, m, d] = at.toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }).split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = new Date(`${y}-${pad(m)}-01T00:00:00+01:00`).toISOString();
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const end = new Date(`${ny}-${pad(nm)}-01T00:00:00+01:00`).toISOString();
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start, end, today: `${y}-${pad(m)}-${pad(d)}`, firstDay: `${y}-${pad(m)}-01`, day: d, daysLeft: lastDay - d + 1, label: `${MONTHS[m - 1]} ${y}` };
}

type Pkg = {
  id: string;
  title: string;
  starts_on: string | null;
  ends_on: string | null;
  promise_recorded_month: number | null;
  promise_live_month: number | null;
  promise_exercises_month: number | null;
};

/** Impegni del mese per i corsi indicati (o per tutti i corsi con impegni, se `packageIds` è omesso). */
export async function courseCommitments(supabase: SupabaseClient, packageIds?: string[]): Promise<CourseCommitment[]> {
  const month = romeMonth();
  let q = supabase
    .from("packages")
    .select("id, title, starts_on, ends_on, promise_recorded_month, promise_live_month, promise_exercises_month")
    .neq("slug", "prova-gratuita");
  if (packageIds) {
    if (!packageIds.length) return [];
    q = q.in("id", packageIds);
  }
  const { data: pkgs } = await q.returns<Pkg[]>();
  // solo corsi con almeno un impegno e in corso in questo mese
  const running = (pkgs ?? []).filter(
    (p) =>
      ((p.promise_recorded_month ?? 0) > 0 || (p.promise_live_month ?? 0) > 0 || (p.promise_exercises_month ?? 0) > 0) &&
      (!p.starts_on || p.starts_on <= month.today) &&
      (!p.ends_on || p.ends_on >= month.firstDay),
  );
  if (!running.length) return [];
  const ids = running.map((p) => p.id);

  const [{ data: recorded }, { data: live }, { data: exercises }] = await Promise.all([
    supabase
      .from("lessons")
      .select("package_ids")
      .eq("kind", "registrata")
      .eq("published", true)
      .gte("created_at", month.start)
      .lt("created_at", month.end)
      .overlaps("package_ids", ids),
    supabase
      .from("lessons")
      .select("package_ids")
      .eq("kind", "in_presenza")
      .eq("published", true)
      .gte("scheduled_at", month.start)
      .lt("scheduled_at", month.end)
      .overlaps("package_ids", ids),
    supabase.from("course_exercises").select("package_id").gte("created_at", month.start).lt("created_at", month.end).in("package_id", ids),
  ]);

  const countIn = (rows: { package_ids: string[] | null }[] | null, id: string) => (rows ?? []).filter((r) => (r.package_ids ?? []).includes(id)).length;

  return running.map((p) => {
    const items: CommitmentItem[] = [];
    if ((p.promise_recorded_month ?? 0) > 0) items.push({ key: "recorded", label: "Video lezioni", done: countIn(recorded, p.id), promised: p.promise_recorded_month! });
    if ((p.promise_live_month ?? 0) > 0) items.push({ key: "live", label: "Incontri dal vivo", done: countIn(live, p.id), promised: p.promise_live_month! });
    if ((p.promise_exercises_month ?? 0) > 0)
      items.push({ key: "exercises", label: "Tracce", done: (exercises ?? []).filter((e: { package_id: string }) => e.package_id === p.id).length, promised: p.promise_exercises_month! });
    return {
      packageId: p.id,
      title: p.title,
      items,
      missing: items.reduce((s, i) => s + Math.max(0, i.promised - i.done), 0),
      daysLeft: month.daysLeft,
      monthLabel: month.label,
    };
  });
}

/** Testo breve sull'urgenza: usato in pannelli, campanella ed email. */
export function urgency(c: Pick<CourseCommitment, "missing" | "daysLeft">) {
  if (c.missing === 0) return { tone: "ok" as const, text: "Impegni del mese rispettati" };
  const d = c.daysLeft === 1 ? "oggi è l'ultimo giorno del mese" : `${c.daysLeft} giorni alla fine del mese`;
  return { tone: c.daysLeft <= 7 ? ("late" as const) : ("todo" as const), text: `${c.missing} ${c.missing === 1 ? "contenuto" : "contenuti"} da pubblicare · ${d}` };
}

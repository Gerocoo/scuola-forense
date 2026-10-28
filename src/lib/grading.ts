/**
 * Criteri di valutazione delle prove scritte (nuovo esame di abilitazione).
 * Ogni criterio vale da 1 a 6 punti: il totale è in trentesimi, sufficienza a 18.
 */
export const CRITERIA = [
  { key: "chiarezza", label: "Chiarezza espositiva", hint: "Proprietà di linguaggio, ordine, forma" },
  { key: "logicita", label: "Logicità", hint: "Coerenza e consequenzialità del ragionamento" },
  { key: "metodo", label: "Rigore metodologico", hint: "Inquadramento, norme, giurisprudenza" },
  { key: "soluzione", label: "Soluzione del caso concreto", hint: "Capacità di risolvere il problema posto" },
  { key: "argomentazione", label: "Tecnica argomentativa", hint: "Persuasività e gestione delle tesi contrarie" },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];
export type Scores = Partial<Record<CriterionKey, number>>;

export const MAX_PER_CRITERION = 6;
export const PASS_MARK = 18;

export function totalOf(scores: Scores | null | undefined) {
  if (!scores) return null;
  const vals = CRITERIA.map((c) => scores[c.key]).filter((v): v is number => typeof v === "number");
  if (vals.length < CRITERIA.length) return null;
  return vals.reduce((a, b) => a + b, 0);
}

export function cleanScores(input: unknown): Scores | null {
  if (!input || typeof input !== "object") return null;
  const out: Scores = {};
  for (const c of CRITERIA) {
    const v = Number((input as Record<string, unknown>)[c.key]);
    if (Number.isFinite(v) && v >= 1 && v <= MAX_PER_CRITERION) out[c.key] = Math.round(v);
  }
  return Object.keys(out).length ? out : null;
}

/** Punteggi delle prove corrette di un discente, in ordine di correzione (per il grafico dei progressi). */
export async function loadScorePoints(
  supabase: { from: (t: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  studentId: string,
) {
  const { data } = await supabase
    .from("assignments")
    .select("title, corrected_at, review:assignment_reviews(total)")
    .eq("student_id", studentId)
    .eq("status", "corretto")
    .order("corrected_at", { ascending: true });
  type Row = { title: string; corrected_at: string | null; review: { total: number | null } | { total: number | null }[] | null };
  return ((data ?? []) as Row[])
    .map((r) => ({ title: r.title, at: r.corrected_at ?? "", total: (Array.isArray(r.review) ? r.review[0]?.total : r.review?.total) ?? null }))
    .filter((p): p is { title: string; at: string; total: number } => typeof p.total === "number" && !!p.at)
    .slice(-12);
}

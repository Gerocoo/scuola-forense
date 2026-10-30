import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreditKind = "minutes" | "corrections";

/** Saldo dei crediti di un utente (minuti di lezione privata o correzioni). */
export async function creditBalance(userId: string) {
  const { data } = await createAdminClient().from("credits").select("kind, amount").eq("user_id", userId);
  let minutes = 0;
  let corrections = 0;
  for (const r of (data ?? []) as { kind: CreditKind; amount: number }[]) {
    if (r.kind === "minutes") minutes += r.amount;
    else corrections += r.amount;
  }
  return { minutes, corrections };
}

/** Accredita i crediti inclusi nel prodotto acquistato (una sola volta per iscrizione). */
export async function grantPurchaseCredits(enrollmentId: string) {
  const admin = createAdminClient();
  const { data: e } = await admin
    .from("enrollments")
    .select("id, user_id, status, package:packages(title, credit_minutes, credit_corrections)")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (!e || e.status !== "active") return;
  const pkg = (Array.isArray(e.package) ? e.package[0] : e.package) as { title: string; credit_minutes: number; credit_corrections: number } | null;
  if (!pkg) return;
  const rows = [
    pkg.credit_minutes > 0 && { user_id: e.user_id, kind: "minutes", amount: pkg.credit_minutes, reason: "acquisto", enrollment_id: e.id, note: pkg.title },
    pkg.credit_corrections > 0 && { user_id: e.user_id, kind: "corrections", amount: pkg.credit_corrections, reason: "acquisto", enrollment_id: e.id, note: pkg.title },
  ].filter(Boolean);
  // l'indice unico (iscrizione, tipo) evita accrediti doppi
  for (const r of rows) await admin.from("credits").insert(r as Record<string, unknown>);
}

/** Usa crediti se il saldo basta. Ritorna false se non bastano. */
export async function spendCredits(
  userId: string,
  kind: CreditKind,
  amount: number,
  ref: { meeting_id?: string; assignment_id?: string; note?: string },
) {
  const bal = await creditBalance(userId);
  if ((kind === "minutes" ? bal.minutes : bal.corrections) < amount) return false;
  const { error } = await createAdminClient().from("credits").insert({ user_id: userId, kind, amount: -amount, reason: "utilizzo", ...ref, note: ref.note ?? "" });
  return !error;
}

/** Restituisce i crediti usati per un colloquio o una correzione annullati. */
export async function refundCredits(ref: { meeting_id?: string; assignment_id?: string }) {
  const admin = createAdminClient();
  let q = admin.from("credits").select("user_id, kind, amount, reason");
  q = ref.meeting_id ? q.eq("meeting_id", ref.meeting_id) : q.eq("assignment_id", ref.assignment_id!);
  const { data } = await q;
  const net = new Map<string, { user_id: string; kind: CreditKind; amount: number }>();
  for (const r of (data ?? []) as { user_id: string; kind: CreditKind; amount: number }[]) {
    const k = `${r.user_id}|${r.kind}`;
    const cur = net.get(k) ?? { user_id: r.user_id, kind: r.kind, amount: 0 };
    cur.amount += r.amount;
    net.set(k, cur);
  }
  for (const n of net.values()) {
    if (n.amount < 0) await admin.from("credits").insert({ user_id: n.user_id, kind: n.kind, amount: -n.amount, reason: "rimborso", ...ref });
  }
}

export function minutesLabel(m: number) {
  if (m <= 0) return "0 minuti";
  const h = Math.floor(m / 60);
  const r = m % 60;
  return [h ? `${h} ${h === 1 ? "ora" : "ore"}` : "", r ? `${r} min` : ""].filter(Boolean).join(" e ");
}

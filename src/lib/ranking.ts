import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Classifica anonima di una simulazione (stessa traccia inviata a più discenti):
 * posizione e percentile del discente tra gli elaborati corretti con punteggio.
 */
export async function simulationRank(batchId: string, studentId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("assignments")
    .select("student_id, status, assignment_reviews(total)")
    .eq("batch_id", batchId)
    .eq("status", "corretto");
  const rows = ((data ?? []) as unknown as { student_id: string; assignment_reviews: { total: number | null } | { total: number | null }[] | null }[])
    .map((r) => {
      const rev = Array.isArray(r.assignment_reviews) ? r.assignment_reviews[0] : r.assignment_reviews;
      return { student: r.student_id, total: rev?.total ?? null };
    })
    .filter((r): r is { student: string; total: number } => r.total != null);
  if (rows.length < 3) return null; // con pochi partecipanti la classifica non è anonima
  const me = rows.find((r) => r.student === studentId);
  if (!me) return null;
  const better = rows.filter((r) => r.total > me.total).length;
  const position = better + 1;
  const passed = rows.filter((r) => r.total >= 18).length;
  const avg = Math.round((rows.reduce((s, r) => s + r.total, 0) / rows.length) * 10) / 10;
  // quota di partecipanti con punteggio inferiore o uguale al mio
  const top = Math.max(1, Math.round(((better + 1) / rows.length) * 100));
  return { position, total: rows.length, top, avg, passRate: Math.round((passed / rows.length) * 100), score: me.total };
}

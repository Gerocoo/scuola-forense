import "server-only";
import { createAdminClient } from "./supabase/admin";

type Recipient = { id: string; email: string; full_name: string };

/** Discenti con un'iscrizione attiva ad almeno uno dei corsi indicati. */
export async function enrolledStudents(packageIds: string[]): Promise<Recipient[]> {
  if (!packageIds.length) return [];
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data } = await admin
    .from("enrollments")
    .select("ends_at, user:profiles(id, email, full_name, role)")
    .in("package_id", packageIds)
    .eq("status", "active");

  const map = new Map<string, Recipient>();
  for (const row of (data ?? []) as unknown as { ends_at: string | null; user: (Recipient & { role: string }) | null }[]) {
    if (!row.user || row.user.role !== "student") continue;
    if (row.ends_at && row.ends_at < now) continue;
    map.set(row.user.id, { id: row.user.id, email: row.user.email, full_name: row.user.full_name });
  }
  return [...map.values()];
}

/** Discenti che hanno prenotato il posto a un incontro. */
export async function bookedStudents(lessonId: string): Promise<Recipient[]> {
  const { data } = await createAdminClient()
    .from("lesson_bookings")
    .select("user:profiles(id, email, full_name)")
    .eq("lesson_id", lessonId)
    .eq("status", "confermato");
  return ((data ?? []) as unknown as { user: Recipient | null }[]).flatMap((r) => (r.user ? [r.user] : []));
}

/** Esegue `fn` su tutti gli elementi, al massimo `n` alla volta (rispetta i limiti del servizio email). */
export async function inBatches<T>(items: T[], n: number, fn: (t: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += n) {
    await Promise.all(items.slice(i, i + n).map(fn));
  }
}

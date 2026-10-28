import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Iscritti attivi per corso (solo conteggi): per mostrare i posti rimasti e chiudere le vendite a esaurimento. */
export async function enrolledCounts(packageIds: string[]) {
  const map = new Map<string, number>();
  if (!packageIds.length) return map;
  const { data } = await createAdminClient()
    .from("enrollments")
    .select("package_id")
    .in("package_id", packageIds)
    .eq("status", "active");
  for (const r of data ?? []) map.set(r.package_id, (map.get(r.package_id) ?? 0) + 1);
  return map;
}

export function seatsLeft(seats: number | null | undefined, taken: number) {
  if (!seats) return null;
  return Math.max(0, seats - taken);
}

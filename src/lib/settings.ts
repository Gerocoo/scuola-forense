import { createAdminClient } from "@/lib/supabase/admin";

export type PassRate = { percent: number; label: string } | null;

export async function getSetting<T>(key: string): Promise<T | null> {
  const { data } = await createAdminClient().from("app_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? null;
}

/** Recensioni approvate da mostrare in vetrina: nome abbreviato, corso e voto. */
export async function publicReviews(limit = 6) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("reviews")
    .select("id, rating, body, created_at, user:profiles(full_name)")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as { id: string; rating: number; body: string; user: { full_name: string | null } | null }[]).map((r) => {
    const parts = (r.user?.full_name ?? "").trim().split(/\s+/);
    const name = parts[0] ? `${parts[0]}${parts[1] ? ` ${parts[1][0]}.` : ""}` : "Allievo";
    return { id: r.id, rating: r.rating, quote: r.body, name };
  });
}

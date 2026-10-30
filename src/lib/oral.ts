import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const ORAL_SLUG = "modulo-orale";
/** Prodotti che non contano come "corso frequentato". */
export const NOT_COURSES = ["prova-gratuita", "archivio-tracce", ORAL_SLUG];

/** Ha frequentato (o sta frequentando) almeno un corso vero, pagato o registrato dalla segreteria. */
export async function hasTakenCourse(userId: string) {
  const { data } = await createAdminClient()
    .from("enrollments")
    .select("id, package:packages!inner(slug)")
    .eq("user_id", userId)
    .in("status", ["active", "expired"])
    .not("package.slug", "in", `(${NOT_COURSES.join(",")})`)
    .limit(1);
  return (data ?? []).length > 0;
}

/** Stato dell'Orale per il discente: accesso, vendita aperta o chiusa, requisito del corso. */
export async function oralState(supabase: SupabaseClient, userId: string) {
  const [{ data: access }, { data: pkg }, taken] = await Promise.all([
    supabase.rpc("has_oral_access"),
    createAdminClient().from("packages").select("active, price_cents, promo_price_cents, promo_until").eq("slug", ORAL_SLUG).maybeSingle(),
    hasTakenCourse(userId),
  ]);
  const promo = pkg?.promo_price_cents && (!pkg.promo_until || new Date(pkg.promo_until).getTime() > Date.now());
  return {
    access: access === true,
    open: !!pkg?.active,
    taken,
    price: pkg ? ((promo ? pkg.promo_price_cents : pkg.price_cents) as number) : null,
  };
}

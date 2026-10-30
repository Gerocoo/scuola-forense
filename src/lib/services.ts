import { createAdminClient } from "@/lib/supabase/admin";
import type { Package } from "@/lib/types";

export type Product = NonNullable<Package["product"]>;

/** Pagina a cui torna chi esce dal pagamento o deve accedere, in base al prodotto. */
export function backFor(slug: string, product?: string | null) {
  if (slug === "archivio-tracce") return "/area/archivio";
  if (slug === "modulo-orale") return "/area/orale";
  if (product && product !== "corso") return "/servizi";
  return `/corsi/${slug}`;
}

export function priceOf(p: Pick<Package, "price_cents" | "promo_price_cents" | "promo_until">) {
  const promo = p.promo_price_cents && (!p.promo_until || new Date(p.promo_until).getTime() > Date.now());
  return promo ? (p.promo_price_cents as number) : p.price_cents;
}

/** Prodotti in vendita di un certo tipo, in ordine. */
export async function activeProducts(products: Product[]) {
  const { data } = await createAdminClient()
    .from("packages")
    .select("*")
    .eq("active", true)
    .in("product", products)
    .order("sort")
    .returns<Package[]>();
  return data ?? [];
}

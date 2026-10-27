"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getStripe, siteUrl } from "@/lib/stripe";
import { currentPrice } from "@/lib/format";
import type { Package } from "@/lib/types";

export async function startCheckout(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const { supabase, user, profile } = await getSession();

  if (!user || !profile) {
    redirect(`/accedi?next=${encodeURIComponent(`/corsi/${slug}`)}`);
  }

  const { data: pkg } = await supabase
    .from("packages")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle<Package>();
  if (!pkg) redirect("/#corsi");

  // Già iscritto e attivo: niente doppio pagamento.
  const { data: already } = await supabase
    .from("enrollments")
    .select("id, ends_at")
    .eq("user_id", user.id)
    .eq("package_id", pkg.id)
    .eq("status", "active")
    .maybeSingle();
  if (already && (!already.ends_at || new Date(already.ends_at) > new Date())) {
    redirect("/area?gia_iscritto=1");
  }

  const price = currentPrice(pkg);
  let url: string | null = null;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      locale: "it",
      customer_email: profile.email,
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: price.amount,
            product_data: {
              name: `${pkg.title} (${pkg.period_label})`,
              description: pkg.tagline || undefined,
            },
          },
        },
      ],
      metadata: { user_id: user.id, package_id: pkg.id, slug: pkg.slug },
      payment_intent_data: { metadata: { user_id: user.id, package_id: pkg.id } },
      allow_promotion_codes: true,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      invoice_creation: { enabled: true },
      custom_fields: [
        {
          key: "codice_fiscale",
          label: { type: "custom", custom: "Codice fiscale" },
          type: "text",
          optional: false,
          text: { minimum_length: 11, maximum_length: 16 },
        },
      ],
      success_url: `${siteUrl()}/checkout/successo?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/corsi/${pkg.slug}`,
    });
    url = session.url;
  } catch (e) {
    console.error("[checkout]", e);
  }

  if (!url) redirect(`/corsi/${slug}?errore=1`);
  redirect(url);
}

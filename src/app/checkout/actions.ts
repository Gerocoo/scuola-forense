"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getStripe, siteUrl } from "@/lib/stripe";
import { currentPrice } from "@/lib/format";
import type { Package } from "@/lib/types";
import { enrolledCounts } from "@/lib/seats";

export async function startCheckout(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const { supabase, user, profile } = await getSession();

  if (!user || !profile) {
    redirect(`/accedi?next=${encodeURIComponent(slug === "archivio-tracce" ? "/area/archivio" : `/corsi/${slug}`)}`);
  }

  const back = slug === "archivio-tracce" ? "/area/archivio" : `/corsi/${slug}`;
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
    redirect(slug === "archivio-tracce" ? "/area/archivio" : "/area?gia_iscritto=1");
  }

  // posti limitati: niente vendita a corso pieno
  if (pkg.seats) {
    const taken = (await enrolledCounts([pkg.id])).get(pkg.id) ?? 0;
    if (taken >= pkg.seats) redirect(`/corsi/${pkg.slug}?esaurito=1`);
  }

  const price = currentPrice(pkg);
  let url: string | null = null;

  // Metodi di pagamento: di norma decide la dashboard Stripe. Con STRIPE_PAYMENT_METHODS
  // (es. "card,paypal,klarna,satispay,amazon_pay") l'elenco viene imposto dal sito.
  // Apple Pay e Google Pay rientrano in "card" e compaiono solo sui dispositivi compatibili.
  const forced = (process.env.STRIPE_PAYMENT_METHODS ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const create = (methods: string[] | null) =>
    getStripe().checkout.sessions.create({
      ...(methods?.length ? { payment_method_types: methods as never } : {}),
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
      // configurazione dei metodi di pagamento scelta in Stripe (se assente usa quella predefinita dell'account)
      ...(!methods?.length && process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION
        ? { payment_method_configuration: process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION }
        : {}),
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
      cancel_url: `${siteUrl()}${back}`,
    });

  try {
    url = (await create(forced)).url;
  } catch (e) {
    console.error("[checkout]", e);
    // se un metodo imposto non è attivo sull'account, si riprova con le impostazioni della dashboard
    if (forced.length) {
      try {
        url = (await create(null)).url;
      } catch (e2) {
        console.error("[checkout] anche senza metodi imposti", e2);
      }
    }
  }

  if (!url) redirect(`${back}?errore=1`);
  redirect(url);
}

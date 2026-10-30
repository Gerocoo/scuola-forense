"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getStripe, siteUrl } from "@/lib/stripe";
import { currentPrice } from "@/lib/format";
import type { Package } from "@/lib/types";
import { enrolledCounts } from "@/lib/seats";
import { invoicingConfigured } from "@/lib/invoices";
import { backFor } from "@/lib/services";

export async function startCheckout(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  // Codice del consumo, art. 59 lett. o): richiesta di accesso immediato e rinuncia al recesso
  const waiver = formData.get("rinuncia_recesso") === "on";
  const { supabase, user, profile } = await getSession();
  const { data: kindRow } = await supabase.from("packages").select("product").eq("slug", slug).maybeSingle<{ product: string }>();
  const back = backFor(slug, kindRow?.product);

  if (!user || !profile) {
    redirect(`/accedi?next=${encodeURIComponent(back)}`);
  }

  const { data: pkg } = await supabase
    .from("packages")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle<Package>();
  if (!pkg) redirect("/#corsi");
  if (!waiver) redirect(`${back}?consenso=1`);
  // il modulo Orale si acquista solo dopo aver frequentato un corso
  if (pkg.slug === "modulo-orale") {
    const { hasTakenCourse } = await import("@/lib/oral");
    if (!(await hasTakenCourse(user.id))) redirect("/area/orale?requisito=1");
  }

  // Già iscritto e attivo: niente doppio pagamento (i pacchetti di crediti invece si ricomprano).
  const repeatable = pkg.product === "lezioni" || pkg.product === "correzioni";
  const { data: already } = repeatable
    ? { data: null }
    : await supabase
        .from("enrollments")
        .select("id, ends_at")
        .eq("user_id", user.id)
        .eq("package_id", pkg.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
  if (already && (!already.ends_at || new Date(already.ends_at) > new Date())) {
    redirect(slug === "archivio-tracce" || slug === "modulo-orale" ? back : "/area?gia_iscritto=1");
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

  // codice amico arrivato con il link: si applica da solo (altrimenti si può inserire a mano)
  let referralPromo: string | null = null;
  try {
    const { cookies } = await import("next/headers");
    const code = (await cookies()).get("amico")?.value;
    if (code && /^[A-Z0-9]{4,20}$/.test(code)) {
      const found = await getStripe().promotionCodes.list({ code, active: true, limit: 1 });
      const pc = found.data[0];
      if (pc && pc.metadata?.referrer_id && pc.metadata.referrer_id !== user.id) referralPromo = pc.id;
    }
  } catch (e) {
    console.error("[checkout amico]", e);
  }

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
      metadata: { user_id: user.id, package_id: pkg.id, slug: pkg.slug, rinuncia_recesso: new Date().toISOString() },
      payment_intent_data: { metadata: { user_id: user.id, package_id: pkg.id } },
      // configurazione dei metodi di pagamento scelta in Stripe (se assente usa quella predefinita dell'account)
      ...(!methods?.length && process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION
        ? { payment_method_configuration: process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION }
        : {}),
      ...(referralPromo ? { discounts: [{ promotion_code: referralPromo }] } : { allow_promotion_codes: true }),
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      // con Fatture in Cloud la fattura elettronica parte da lì; altrimenti Stripe invia la sua ricevuta-fattura
      invoice_creation: { enabled: !invoicingConfigured() },
      custom_fields: [
        {
          key: "codice_fiscale",
          label: { type: "custom", custom: "Codice fiscale" },
          type: "text",
          optional: false,
          text: { minimum_length: 11, maximum_length: 16 },
        },
        {
          key: "sdi_pec",
          label: { type: "custom", custom: "Codice SDI o PEC (solo con partita IVA)" },
          type: "text",
          optional: true,
          text: { maximum_length: 120 },
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

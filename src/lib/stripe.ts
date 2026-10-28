import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "./supabase/admin";
import { notify, emailLayout } from "./notify";
import { euro } from "./format";

let stripe: Stripe | undefined;

export function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      appInfo: { name: "Pronao, Scuola di Alta Formazione Forense" },
    });
  }
  return stripe;
}

/**
 * Indirizzo pubblico del sito, usato nei link delle email e nei ritorni da Stripe.
 * SITE_URL è letto all'avvio (basta riavviare `npm start` se cambia, es. con un tunnel);
 * NEXT_PUBLIC_SITE_URL invece viene fissato al momento della build.
 */
export function siteUrl() {
  return (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Attiva l'iscrizione dopo un pagamento riuscito.
 * Idempotente: chiamata sia dal webhook sia dalla pagina di conferma.
 */
export async function fulfillCheckout(sessionId: string) {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return { fulfilled: false as const, session };

  const userId = session.metadata?.user_id;
  const packageId = session.metadata?.package_id;
  if (!userId || !packageId) throw new Error("Metadati mancanti nella sessione Stripe");

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("enrollments")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (existing) return { fulfilled: true as const, session };

  const { data: pkg } = await admin
    .from("packages")
    .select("title, period_label, access_until")
    .eq("id", packageId)
    .single();

  // dati per la fattura elettronica, dal checkout Stripe
  const cd = session.customer_details;
  const field = (k: string) => session.custom_fields?.find((f) => f.key === k)?.text?.value?.trim() || "";
  const sdiPec = field("sdi_pec");
  const vat = cd?.tax_ids?.find((t) => t.type === "eu_vat")?.value ?? "";
  const billing = {
    name: cd?.name ?? "",
    tax_code: field("codice_fiscale").toUpperCase(),
    vat_number: vat,
    address: [cd?.address?.line1, cd?.address?.line2].filter(Boolean).join(", "),
    postal_code: cd?.address?.postal_code ?? "",
    city: cd?.address?.city ?? "",
    province: cd?.address?.state ?? "",
    country: cd?.address?.country ?? "IT",
    email: cd?.email ?? "",
    sdi: /^[A-Z0-9]{7}$/i.test(sdiPec) ? sdiPec.toUpperCase() : "",
    pec: sdiPec.includes("@") ? sdiPec : "",
  };

  const endsAt = pkg?.access_until ? new Date(`${pkg.access_until}T23:59:59+01:00`).toISOString() : null;

  const { error } = await admin.from("enrollments").insert({
    user_id: userId,
    package_id: packageId,
    status: "active",
    amount_cents: session.amount_total ?? 0,
    currency: session.currency ?? "eur",
    stripe_session_id: session.id,
    stripe_payment_intent:
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    ends_at: endsAt,
    payment_method: "stripe",
    paid_at: new Date().toISOString(),
    billing,
    withdrawal_waiver_at: session.metadata?.rinuncia_recesso ?? null,
  });

  // 23505 = violazione di unicità: un'altra chiamata ha già creato l'iscrizione.
  if (error && error.code !== "23505") throw error;

  if (!error) {
    const { data: created } = await admin.from("enrollments").select("id").eq("stripe_session_id", session.id).maybeSingle();
    if (created) {
      const { issueInvoice } = await import("@/lib/invoices");
      await issueInvoice(created.id);
    }
    const { data: profile } = await admin.from("profiles").select("email, full_name").eq("id", userId).single();
    if (profile?.email) {
      await notify({
        to: profile.email,
        subject: `Iscrizione confermata: ${pkg?.title ?? "il tuo corso"}`,
        html: emailLayout(
          `Benvenuto${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`,
          `<p>Il pagamento di ${euro(session.amount_total ?? 0)} è andato a buon fine e l'iscrizione a <strong>${pkg?.title ?? ""}</strong> (${pkg?.period_label ?? ""}) è attiva.</p>
           <p>Nella tua area riservata trovi le lezioni, le tracce da svolgere e i messaggi con i docenti.</p>
           ${session.metadata?.rinuncia_recesso ? `<p style="font-size:13px;color:#5e5e63">Al momento dell'acquisto hai chiesto l'accesso immediato ai contenuti digitali del corso e hai preso atto che, con l'avvio dell'erogazione, perdi il diritto di recesso (art. 59, comma 1, lett. o, del Codice del consumo).</p>` : ""}`,
          { label: "Apri la tua area", href: `${siteUrl()}/area` },
        ),
      });
    }
  }

  return { fulfilled: true as const, session };
}

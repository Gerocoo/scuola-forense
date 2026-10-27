import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "./supabase/admin";
import { notify, emailLayout } from "./notify";
import { euro } from "./format";

let stripe: Stripe | undefined;

export function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      appInfo: { name: "Scuola Alta Formazione Forense" },
    });
  }
  return stripe;
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
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
  });

  // 23505 = violazione di unicità: un'altra chiamata ha già creato l'iscrizione.
  if (error && error.code !== "23505") throw error;

  if (!error) {
    const { data: profile } = await admin.from("profiles").select("email, full_name").eq("id", userId).single();
    if (profile?.email) {
      await notify({
        to: profile.email,
        subject: `Iscrizione confermata: ${pkg?.title ?? "il tuo corso"}`,
        html: emailLayout(
          `Benvenuto${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`,
          `<p>Il pagamento di ${euro(session.amount_total ?? 0)} è andato a buon fine e l'iscrizione a <strong>${pkg?.title ?? ""}</strong> (${pkg?.period_label ?? ""}) è attiva.</p>
           <p>Nella tua area riservata trovi le lezioni, le tracce da svolgere e i messaggi con i docenti.</p>`,
          { label: "Apri la tua area", href: `${siteUrl()}/area` },
        ),
      });
    }
  }

  return { fulfilled: true as const, session };
}

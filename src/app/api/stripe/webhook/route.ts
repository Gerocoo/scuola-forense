import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfillCheckout, getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Eventi da abilitare nella dashboard Stripe:
 *   checkout.session.completed
 *   checkout.session.async_payment_succeeded
 *   charge.refunded
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "firma mancante" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (e) {
    console.error("[webhook] firma non valida", e);
    return NextResponse.json({ error: "firma non valida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await fulfillCheckout(session.id);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (pi && charge.refunded) {
          await createAdminClient()
            .from("enrollments")
            .update({ status: "refunded" })
            .eq("stripe_payment_intent", pi);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[webhook] elaborazione fallita", event.type, e);
    // 500: Stripe riproverà automaticamente.
    return NextResponse.json({ error: "errore interno" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

const SETTING = "referral_coupon";
/** Sconto per chi usa un codice amico e premio per chi lo ha condiviso. */
export const REFERRAL_PERCENT = Number(process.env.REFERRAL_PERCENT || 10);
export const REFERRAL_REWARD_CORRECTIONS = Number(process.env.REFERRAL_REWARD_CORRECTIONS || 1);

async function couponId() {
  if (process.env.STRIPE_REFERRAL_COUPON) return process.env.STRIPE_REFERRAL_COUPON;
  const admin = createAdminClient();
  const { data } = await admin.from("app_settings").select("value").eq("key", SETTING).maybeSingle();
  const saved = (data?.value as { id?: string } | null)?.id;
  if (saved) return saved;
  const c = await getStripe().coupons.create({ percent_off: REFERRAL_PERCENT, duration: "once", name: `Codice amico ${REFERRAL_PERCENT}%` });
  await admin.from("app_settings").upsert({ key: SETTING, value: { id: c.id }, updated_at: new Date().toISOString() });
  return c.id;
}

/** Codice amico personale (creato su Stripe la prima volta). */
export async function ensureReferralCode(userId: string, name: string) {
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("referral_code").eq("id", userId).maybeSingle();
  if (p?.referral_code) return p.referral_code as string;
  const base = (name.split(" ")[0] || "AMICO").normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 8) || "AMICO";
  for (let i = 0; i < 4; i++) {
    const code = `${base}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    try {
      await getStripe().promotionCodes.create({ coupon: await couponId(), code, metadata: { referrer_id: userId } });
    } catch {
      continue; // codice già esistente su Stripe: si riprova
    }
    await admin.from("profiles").update({ referral_code: code }).eq("id", userId);
    return code;
  }
  throw new Error("Impossibile creare il codice amico");
}

/** Dopo un acquisto con codice amico: registra l'invito e premia chi l'ha condiviso. */
export async function rewardReferral(sessionId: string, buyerId: string, enrollmentId: string) {
  const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ["discounts.promotion_code"] });
  const promo = session.discounts?.map((d) => d.promotion_code).find((p) => p && typeof p !== "string");
  const referrer = promo && typeof promo !== "string" ? promo.metadata?.referrer_id : null;
  if (!referrer || referrer === buyerId) return;
  const admin = createAdminClient();
  // un solo premio per persona invitata
  const { error } = await admin.from("referrals").insert({ referrer_id: referrer, referred_id: buyerId, enrollment_id: enrollmentId });
  if (error) return;
  if (REFERRAL_REWARD_CORRECTIONS > 0) {
    await admin.from("credits").insert({ user_id: referrer, kind: "corrections", amount: REFERRAL_REWARD_CORRECTIONS, reason: "premio", enrollment_id: null, note: "Codice amico" });
  }
  const { sendPush } = await import("@/lib/push");
  await sendPush([referrer], {
    title: "Un amico si è iscritto con il tuo codice",
    body: REFERRAL_REWARD_CORRECTIONS > 0 ? `Hai ricevuto ${REFERRAL_REWARD_CORRECTIONS === 1 ? "una correzione gratuita" : `${REFERRAL_REWARD_CORRECTIONS} correzioni gratuite`}.` : "Grazie per il passaparola!",
    url: "/area/invita",
  }).catch(() => {});
}

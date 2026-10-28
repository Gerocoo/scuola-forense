import "server-only";
import { createPrivateKey, sign } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Notifiche push senza librerie esterne: il server invia un push vuoto firmato (VAPID)
 * e il service worker del telefono scarica il testo da /api/push/ultima.
 * Chiavi: VAPID_PUBLIC_KEY (anche NEXT_PUBLIC_VAPID_PUBLIC_KEY) e VAPID_PRIVATE_KEY.
 */
export type PushPayload = { title: string; body: string; url: string };

const b64u = (b: Buffer) => b.toString("base64url");

function vapidHeader(endpoint: string) {
  const pub = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const prv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !prv) return null;
  const raw = Buffer.from(pub, "base64url");
  const key = createPrivateKey({
    key: { kty: "EC", crv: "P-256", d: prv, x: b64u(raw.subarray(1, 33)), y: b64u(raw.subarray(33, 65)) },
    format: "jwk",
  });
  const header = b64u(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(
    Buffer.from(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: `mailto:${process.env.PUSH_CONTACT || "segreteria@pronao.it"}`,
      }),
    ),
  );
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), { key, dsaEncoding: "ieee-p1363" });
  return `vapid t=${header}.${claims}.${b64u(signature)}, k=${pub}`;
}

export function pushConfigured() {
  return !!((process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) && process.env.VAPID_PRIVATE_KEY);
}

export async function sendPush(userIds: string[], payload: PushPayload) {
  if (!pushConfigured() || !userIds.length) return;
  const admin = createAdminClient();
  await admin.from("push_last").upsert(userIds.map((user_id) => ({ user_id, payload, at: new Date().toISOString() })));
  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint").in("user_id", userIds);
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        const auth = vapidHeader(s.endpoint);
        if (!auth) return;
        const res = await fetch(s.endpoint, { method: "POST", headers: { Authorization: auth, TTL: "86400", Urgency: "normal", "Content-Length": "0" } });
        // dispositivo non più valido: si toglie
        if (res.status === 404 || res.status === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
      } catch (e) {
        console.error("[push]", e);
      }
    }),
  );
}

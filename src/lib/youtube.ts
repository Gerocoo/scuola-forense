import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "./supabase/admin";

/**
 * Collegamento al canale YouTube della scuola (YouTube Data API v3, sola lettura).
 * Variabili d'ambiente:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET  client OAuth "Applicazione web" su Google Cloud
 *   INTEGRATIONS_SECRET                      facoltativa: chiave per cifrare i token
 */
export const YT_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

export function youtubeConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/* ---------- cifratura dei token (AES-256-GCM) ---------- */
function key() {
  const base = process.env.INTEGRATIONS_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createHash("sha256").update(`pronao-integrazioni:${base}`).digest();
}
export function seal(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}
function open(sealed: string) {
  const [iv, tag, enc] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

/* ---------- OAuth ---------- */
export function authUrl(redirectUri: string, state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: YT_SCOPE,
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...body,
    }),
    cache: "no-store",
  });
  const json = (await res.json()) as { access_token?: string; refresh_token?: string; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) throw new Error(json.error_description || json.error || "Token Google non ottenuto");
  return json;
}

export async function exchangeCode(code: string, redirectUri: string) {
  return tokenRequest({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
}

async function yt<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`YouTube ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

type ChannelResp = {
  items?: {
    id: string;
    snippet: { title: string; thumbnails?: { default?: { url: string } } };
    contentDetails: { relatedPlaylists: { uploads: string } };
  }[];
};

export async function myChannel(accessToken: string) {
  const r = await yt<ChannelResp>("channels?part=snippet,contentDetails&mine=true", accessToken);
  const c = r.items?.[0];
  if (!c) return null;
  return {
    id: c.id,
    title: c.snippet.title,
    image: c.snippet.thumbnails?.default?.url ?? null,
    uploads: c.contentDetails.relatedPlaylists.uploads,
  };
}

/* ---------- stato del collegamento ---------- */
export type YoutubeLink = { channelId: string; channelName: string; channelImage: string | null; connectedAt: string };

export async function getLink(): Promise<YoutubeLink | null> {
  const { data } = await createAdminClient()
    .from("integrations")
    .select("account_id, account_name, account_image, connected_at")
    .eq("provider", "youtube")
    .maybeSingle();
  if (!data) return null;
  return { channelId: data.account_id, channelName: data.account_name, channelImage: data.account_image, connectedAt: data.connected_at };
}

async function accessToken() {
  const { data } = await createAdminClient().from("integrations").select("secret, extra").eq("provider", "youtube").maybeSingle();
  if (!data) return null;
  const t = await tokenRequest({ refresh_token: open(data.secret), grant_type: "refresh_token" });
  return { token: t.access_token!, uploads: (data.extra as { uploads?: string })?.uploads ?? null };
}

/* ---------- elenco video ---------- */
export type ChannelVideo = {
  id: string;
  title: string;
  thumb: string | null;
  publishedAt: string;
  privacy: "public" | "unlisted" | "private";
  durationMin: number | null;
};

function isoToMin(iso: string | undefined) {
  if (!iso) return null;
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!m) return null;
  const secs = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return secs ? Math.max(1, Math.round(secs / 60)) : null;
}

export async function listVideos(pageToken?: string) {
  const auth = await accessToken();
  if (!auth?.uploads) return null;

  const pl = await yt<{
    nextPageToken?: string;
    items?: { contentDetails: { videoId: string } }[];
  }>(
    `playlistItems?part=contentDetails&maxResults=24&playlistId=${auth.uploads}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
    auth.token,
  );
  const ids = (pl.items ?? []).map((i) => i.contentDetails.videoId);
  if (!ids.length) return { items: [] as ChannelVideo[], nextPageToken: null as string | null };

  const v = await yt<{
    items?: {
      id: string;
      snippet: { title: string; publishedAt: string; thumbnails?: Record<string, { url: string }> };
      status: { privacyStatus: ChannelVideo["privacy"] };
      contentDetails: { duration: string };
    }[];
  }>(`videos?part=snippet,status,contentDetails&id=${ids.join(",")}`, auth.token);

  const items: ChannelVideo[] = (v.items ?? []).map((x) => ({
    id: x.id,
    title: x.snippet.title,
    thumb: x.snippet.thumbnails?.medium?.url ?? x.snippet.thumbnails?.default?.url ?? null,
    publishedAt: x.snippet.publishedAt,
    privacy: x.status.privacyStatus,
    durationMin: isoToMin(x.contentDetails.duration),
  }));
  // stesso ordine della playlist (più recenti prima)
  items.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  return { items, nextPageToken: pl.nextPageToken ?? null };
}

export async function revoke() {
  const admin = createAdminClient();
  const { data } = await admin.from("integrations").select("secret").eq("provider", "youtube").maybeSingle();
  if (data?.secret) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(open(data.secret))}`, { method: "POST" });
    } catch {
      /* il token potrebbe essere già scaduto: si elimina comunque */
    }
  }
  await admin.from("integrations").delete().eq("provider", "youtube");
}

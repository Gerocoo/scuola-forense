import "server-only";
import { createHash } from "node:crypto";
import type { VideoStatus } from "./types";

/**
 * Bunny Stream (https://bunny.net/stream): hosting video con streaming adattivo.
 * Variabili d'ambiente:
 *   BUNNY_STREAM_LIBRARY_ID   ID della libreria video
 *   BUNNY_STREAM_API_KEY      chiave API della libreria (Stream › libreria › API)
 *   BUNNY_STREAM_TOKEN_KEY    chiave "Token authentication" (Stream › libreria › Security)
 */
const API = "https://video.bunnycdn.com";

export function bunnyConfigured() {
  return !!(process.env.BUNNY_STREAM_LIBRARY_ID && process.env.BUNNY_STREAM_API_KEY);
}

function cfg() {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  if (!libraryId || !apiKey) throw new Error("Bunny Stream non configurato");
  return { libraryId, apiKey };
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Crea il contenitore del video e restituisce i dati per il caricamento TUS dal browser. */
export async function createUpload(title: string) {
  const { libraryId, apiKey } = cfg();
  const res = await fetch(`${API}/library/${libraryId}/videos`, {
    method: "POST",
    headers: { AccessKey: apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ title: title.slice(0, 200) }),
  });
  if (!res.ok) throw new Error(`Bunny: creazione video fallita (${res.status})`);
  const video = (await res.json()) as { guid: string };

  // firma valida 6 ore: basta anche per file di diversi GB su connessioni lente
  const expire = Math.floor(Date.now() / 1000) + 6 * 3600;
  return {
    endpoint: `${API}/tusupload`,
    videoId: video.guid,
    libraryId,
    expire,
    signature: sha256(libraryId + apiKey + expire + video.guid),
  };
}

const STATUS: Record<number, VideoStatus> = {
  0: "uploading", // creato, in attesa del file
  1: "processing", // caricato
  2: "processing",
  3: "processing", // transcodifica
  4: "ready",
  5: "error",
  6: "error", // caricamento fallito
};

export async function getVideo(videoId: string) {
  const { libraryId, apiKey } = cfg();
  const res = await fetch(`${API}/library/${libraryId}/videos/${videoId}`, {
    headers: { AccessKey: apiKey, Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Bunny: lettura video fallita (${res.status})`);
  const v = (await res.json()) as { status: number; length: number; encodeProgress?: number };
  return {
    status: STATUS[v.status] ?? "processing",
    // la riproduzione è possibile non appena è pronta la prima risoluzione
    durationMin: v.length ? Math.max(1, Math.round(v.length / 60)) : null,
    progress: v.encodeProgress ?? null,
  };
}

export async function deleteVideo(videoId: string) {
  if (!bunnyConfigured()) return;
  const { libraryId, apiKey } = cfg();
  await fetch(`${API}/library/${libraryId}/videos/${videoId}`, {
    method: "DELETE",
    headers: { AccessKey: apiKey },
  }).catch(() => undefined);
}

/**
 * URL del player con token firmato: il link funziona solo per poche ore,
 * quindi copiarlo fuori dalla piattaforma non serve a condividere il video.
 */
export function embedUrl(videoId: string) {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID!;
  const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY;
  const base = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
  const params = new URLSearchParams({ autoplay: "false", preload: "true", responsive: "true" });
  if (tokenKey) {
    const expires = Math.floor(Date.now() / 1000) + 4 * 3600;
    params.set("token", sha256(tokenKey + videoId + expires));
    params.set("expires", String(expires));
  }
  return `${base}?${params.toString()}`;
}

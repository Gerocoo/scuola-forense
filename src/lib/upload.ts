"use client";

import { createClient } from "./supabase/client";
import type { UploadedMeta } from "./types";

export const BUCKET = "materiali";
export const MAX_BYTES = 50 * 1024 * 1024;
export const ACCEPT =
  ".pdf,.doc,.docx,.odt,.rtf,.txt,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const ALLOWED_EXT = ["pdf", "doc", "docx", "odt", "rtf", "txt", "jpg", "jpeg", "png"];

function safeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(-120);
}

export function validateFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.includes(ext)) return `${file.name}: formato non accettato. Usa PDF, Word, ODT, RTF, TXT o immagini.`;
  if (file.size > MAX_BYTES) return `${file.name}: supera i 50 MB.`;
  if (file.size === 0) return `${file.name}: il file è vuoto.`;
  return null;
}

/** Carica un file nel bucket privato sotto la cartella indicata. */
export async function uploadFile(file: File, folder: string): Promise<UploadedMeta> {
  const err = validateFile(file);
  if (err) throw new Error(err);
  const supabase = createClient();
  const path = `${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(`Caricamento di ${file.name} non riuscito: ${error.message}`);
  return { path, name: file.name, size: file.size, type: file.type };
}

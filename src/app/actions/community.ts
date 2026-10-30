"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasTakenCourse } from "@/lib/oral";
import type { ActionResult } from "@/lib/types";

/** Recensione del discente (una per persona): pubblicata dopo l'approvazione della direzione. */
export async function submitReview(formData: FormData): Promise<ActionResult> {
  const { user } = await requireUser();
  if (!(await hasTakenCourse(user.id))) return { ok: false, error: "Puoi lasciare una recensione dopo aver frequentato un corso." };
  const rating = Math.round(Number(formData.get("rating")));
  const body = String(formData.get("body") ?? "").trim();
  if (!(rating >= 1 && rating <= 5)) return { ok: false, error: "Scegli un voto da 1 a 5." };
  if (body.length < 20) return { ok: false, error: "Scrivi almeno qualche riga (20 caratteri)." };
  const { error } = await createAdminClient()
    .from("reviews")
    .upsert({ user_id: user.id, rating, body: body.slice(0, 1500), approved: false, created_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { ok: false, error: "Recensione non salvata." };
  revalidatePath("/area/corsi");
  revalidatePath("/docente/recensioni");
  return { ok: true, message: "Grazie! La recensione sarà pubblicata dopo una breve verifica." };
}

export async function moderateReview(id: string, action: "approve" | "hide" | "delete"): Promise<ActionResult> {
  await requireStaff();
  const admin = createAdminClient();
  const { error } =
    action === "delete" ? await admin.from("reviews").delete().eq("id", id) : await admin.from("reviews").update({ approved: action === "approve" }).eq("id", id);
  if (error) return { ok: false, error: "Non riuscito." };
  revalidatePath("/docente/recensioni");
  revalidatePath("/");
  return { ok: true };
}

/** Percentuale di promossi mostrata in vetrina (vuoto = nascosta). */
export async function savePassRate(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const raw = String(formData.get("percent") ?? "").trim();
  if (!raw) {
    await admin.from("app_settings").delete().eq("key", "esito");
  } else {
    const percent = Math.round(Number(raw.replace(",", ".")));
    const label = String(formData.get("label") ?? "").trim().slice(0, 120);
    if (!(percent >= 1 && percent <= 100)) return { ok: false, error: "Percentuale non valida." };
    if (!label) return { ok: false, error: "Scrivi la descrizione, es. «degli allievi ha superato lo scritto 2025»." };
    await admin.from("app_settings").upsert({ key: "esito", value: { percent, label }, updated_at: new Date().toISOString() });
  }
  revalidatePath("/");
  revalidatePath("/docente/impostazioni");
  return { ok: true, message: raw ? "Pubblicato in vetrina." : "Rimosso dalla vetrina." };
}

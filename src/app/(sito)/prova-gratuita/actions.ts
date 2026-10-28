"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function requestTrial(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Scrivi un indirizzo email valido." };
  if (formData.get("privacy") !== "on") return { ok: false, error: "Serve il consenso all'informativa privacy." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await createAdminClient()
    .from("leads")
    .upsert({ email, name, source: "prova-gratuita", user_id: user?.id ?? null }, { onConflict: "email,source", ignoreDuplicates: true });
  return { ok: true };
}

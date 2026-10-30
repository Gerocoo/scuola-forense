"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export async function savePost(id: string | null, formData: FormData): Promise<ActionResult & { id?: string }> {
  const { user } = await requireStaff();
  const admin = createAdminClient();
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  if (title.length < 3) return { ok: false, error: "Inserisci un titolo." };
  const slug = slugify(String(formData.get("slug") ?? "") || title);
  if (!slug) return { ok: false, error: "Indirizzo non valido." };
  const published = formData.get("published") === "on";
  const { data: prev } = id ? await admin.from("posts").select("published_at").eq("id", id).maybeSingle() : { data: null };
  const row = {
    title,
    slug,
    excerpt: String(formData.get("excerpt") ?? "").trim().slice(0, 400),
    body: String(formData.get("body") ?? "").slice(0, 60000),
    published,
    published_at: published ? prev?.published_at ?? new Date().toISOString() : prev?.published_at ?? null,
    updated_at: new Date().toISOString(),
  };
  const res = id
    ? await admin.from("posts").update(row).eq("id", id).select("id").single()
    : await admin.from("posts").insert({ ...row, author_id: user.id }).select("id").single();
  if (res.error) return { ok: false, error: res.error.code === "23505" ? "Esiste già una guida con questo indirizzo." : "Salvataggio non riuscito." };
  revalidatePath("/guide");
  revalidatePath(`/guide/${slug}`);
  revalidatePath("/docente/guide");
  return { ok: true, id: res.data.id, message: published ? "Guida pubblicata." : "Bozza salvata." };
}

export async function deletePost(id: string): Promise<ActionResult> {
  await requireStaff();
  const { error } = await createAdminClient().from("posts").delete().eq("id", id);
  if (error) return { ok: false, error: "Non riuscito." };
  revalidatePath("/guide");
  revalidatePath("/docente/guide");
  return { ok: true };
}

import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();
  const pages = ["", "/esame-avvocato-2026", "/prova-gratuita", "/servizi", "/guide", "/privacy", "/termini"].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : p === "/esame-avvocato-2026" ? 0.9 : 0.5,
  }));
  let courses: MetadataRoute.Sitemap = [];
  try {
    const admin = createAdminClient();
    const [{ data }, { data: posts }] = await Promise.all([
      admin.from("packages").select("slug, updated_at").eq("active", true).eq("product", "corso"),
      admin.from("posts").select("slug, updated_at").eq("published", true),
    ]);
    courses = [
      ...(data ?? []).map((c: { slug: string; updated_at: string }) => ({ url: `${base}/corsi/${c.slug}`, lastModified: new Date(c.updated_at), priority: 0.8 })),
      ...(posts ?? []).map((p: { slug: string; updated_at: string }) => ({ url: `${base}/guide/${p.slug}`, lastModified: new Date(p.updated_at), priority: 0.7 })),
    ];
  } catch {
    /* database non raggiungibile durante la build */
  }
  return [...pages, ...courses];
}

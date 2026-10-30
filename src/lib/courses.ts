import type { SupabaseClient } from "@supabase/supabase-js";
import type { Package, Profile } from "@/lib/types";

export type CourseTeacher = Pick<Profile, "id" | "full_name" | "email" | "avatar_url">;

/** Corsi visibili al docente: quelli assegnati a lui (l'amministratore li vede tutti). */
export async function myCourseIds(supabase: SupabaseClient, me: Pick<Profile, "id" | "role"> & { is_super?: boolean | null }) {
  if (me.role === "admin" || me.is_super) {
    // prodotti accessori (archivio, orale) non sono corsi con classe
    const { data } = await supabase.from("packages").select("id").in("product", ["corso", "simulazione"]);
    return (data ?? []).map((p: { id: string }) => p.id);
  }
  const { data } = await supabase.from("package_teachers").select("package_id").eq("teacher_id", me.id);
  return (data ?? []).map((r: { package_id: string }) => r.package_id);
}

export async function canTeach(supabase: SupabaseClient, me: Pick<Profile, "id" | "role"> & { is_super?: boolean | null }, packageId: string) {
  if (me.role === "admin" || me.is_super) return true;
  const { data } = await supabase.from("package_teachers").select("package_id").eq("teacher_id", me.id).eq("package_id", packageId).maybeSingle();
  return !!data;
}

/** Iscritti attivi (id discente) per corso. */
export function activeByPackage(rows: { package_id: string; user_id: string; status: string; ends_at: string | null }[]) {
  const now = new Date().toISOString();
  const map = new Map<string, Set<string>>();
  for (const r of rows) {
    if (r.status !== "active" || (r.ends_at && r.ends_at <= now)) continue;
    if (!map.has(r.package_id)) map.set(r.package_id, new Set());
    map.get(r.package_id)!.add(r.user_id);
  }
  return map;
}

export type CourseSummary = Pick<Package, "id" | "title" | "period_label" | "active" | "starts_on" | "ends_on">;

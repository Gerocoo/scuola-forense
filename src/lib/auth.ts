import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/** Utente e profilo correnti (memorizzati per la singola richiesta). */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as Profile | null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return { supabase, user, profile };
});

export async function requireUser() {
  const s = await getSession();
  if (!s.user || !s.profile) redirect("/accedi");
  return { supabase: s.supabase, user: s.user, profile: s.profile };
}

export async function requireStaff() {
  const s = await requireUser();
  if (s.profile.role === "student") redirect("/area");
  return s;
}

export async function requireAdmin() {
  const s = await requireUser();
  if (s.profile.role !== "admin") redirect("/docente");
  return s;
}

export function isStaff(p: Pick<Profile, "role"> | null | undefined) {
  return p?.role === "teacher" || p?.role === "admin";
}

/** Evita open redirect: accetta solo percorsi interni. */
export function safeNext(next: string | null | undefined, fallback = "/area") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

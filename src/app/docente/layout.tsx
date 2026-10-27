import { AppShell } from "@/components/app/AppShell";
import { requireStaff } from "@/lib/auth";
import type { NavItem } from "@/components/app/NavLinks";

export const dynamic = "force-dynamic";

export default async function DocenteLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await requireStaff();

  const [{ count: unread }, { count: toCorrect }] = await Promise.all([
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", user.id)
      .neq("sender_id", user.id)
      .is("read_at", null),
    supabase.from("assignments").select("id", { count: "exact", head: true }).eq("status", "consegnato"),
  ]);

  const nav: NavItem[] = [
    { href: "/docente", label: "Panoramica", exact: true },
    { href: "/docente/esercitazioni", label: "Esercitazioni", badge: toCorrect ?? 0 },
    { href: "/docente/discenti", label: "Discenti" },
    { href: "/docente/lezioni", label: "Lezioni" },
    { href: "/docente/calendario", label: "Calendario" },
    { href: "/docente/messaggi", label: "Messaggi", badge: unread ?? 0 },
  ];
  if (profile.role === "admin") {
    nav.push({ href: "/docente/pacchetti", label: "Corsi in vendita" }, { href: "/docente/utenti", label: "Utenti e ruoli" });
  }
  nav.push({ href: "/docente/impostazioni", label: "Impostazioni" }, { href: "/docente/profilo", label: "Profilo" });

  return (
    <AppShell profile={profile} nav={nav} home="/docente" areaLabel={profile.role === "admin" ? "Direzione" : "Area docenti"}>
      {children}
    </AppShell>
  );
}

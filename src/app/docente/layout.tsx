import { AppShell } from "@/components/app/AppShell";
import { requireStaff } from "@/lib/auth";
import { staffNotices } from "@/lib/notifications";
import type { NavItem } from "@/components/app/NavLinks";

export const dynamic = "force-dynamic";

export default async function DocenteLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await requireStaff();

  const isAdmin = profile.role === "admin" || !!profile.is_super;
  const [{ count: unread }, { count: toCorrect }, notices, { count: toCollect }] = await Promise.all([
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", user.id)
      .neq("sender_id", user.id)
      .is("read_at", null),
    supabase.from("assignments").select("id", { count: "exact", head: true }).eq("status", "consegnato"),
    staffNotices(supabase, profile),
    isAdmin
      ? supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "pending")
      : Promise.resolve({ count: 0 }),
  ]);

  const nav: NavItem[] = [
    { href: "/docente", label: "Panoramica", exact: true },
    { href: "/docente/corsi", label: "Corsi" },
    { href: "/docente/esercitazioni", label: "Esercitazioni", badge: toCorrect ?? 0 },
    { href: "/docente/discenti", label: "Discenti" },
    { href: "/docente/lezioni", label: "Lezioni" },
    { href: "/docente/calendario", label: "Calendario" },
    { href: "/docente/orale", label: "Orale" },
    { href: "/docente/archivio", label: "Archivio tracce" },
    { href: "/docente/messaggi", label: "Messaggi", badge: unread ?? 0 },
  ];
  if (isAdmin) {
    nav.push(
      { href: "/docente/pacchetti", label: "Corsi in vendita" },
      { href: "/docente/pagamenti", label: "Pagamenti", badge: toCollect ?? 0 },
      { href: "/docente/utenti", label: "Utenti e ruoli" },
      { href: "/docente/statistiche", label: "Statistiche" },
      { href: "/docente/contatti", label: "Contatti" },
    );
  }
  if (profile.is_super) nav.push({ href: "/docente/registro", label: "Registro attività" });
  nav.push({ href: "/docente/impostazioni", label: "Impostazioni" }, { href: "/docente/profilo", label: "Profilo" });

  return (
    <AppShell profile={profile} nav={nav} home="/docente" areaLabel={profile.is_super ? "Super amministratore" : profile.role === "admin" ? "Direzione" : "Area docenti"} notices={notices}>
      {children}
    </AppShell>
  );
}

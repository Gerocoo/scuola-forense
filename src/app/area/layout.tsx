import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { requireUser, isStaff } from "@/lib/auth";
import { studentNotices } from "@/lib/notifications";
import { meetingsToHandle } from "@/lib/meetings";

export const dynamic = "force-dynamic";

export default async function AreaLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await requireUser();
  if (isStaff(profile)) redirect("/docente");

  const [{ count: unread }, { count: todo }, notices, meetings] = await Promise.all([
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .neq("sender_id", user.id)
      .is("read_at", null),
    supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("status", "assegnato"),
    studentNotices(supabase, user),
    meetingsToHandle(supabase, user.id, "student"),
  ]);

  return (
    <AppShell
      profile={profile}
      home="/area"
      areaLabel="Area discente"
      notices={notices}
      nav={[
        { href: "/area", label: "Panoramica", exact: true },
        { href: "/area/lezioni", label: "Lezioni" },
        { href: "/area/calendario", label: "Calendario" },
        { href: "/area/esercitazioni", label: "Esercitazioni", badge: todo ?? 0 },
        { href: "/area/orale", label: "Orale" },
        { href: "/area/archivio", label: "Archivio tracce" },
        { href: "/area/messaggi", label: "Messaggi", badge: unread ?? 0 },
        { href: "/area/colloqui", label: "Colloqui", badge: meetings },
        { href: "/area/corsi", label: "I miei corsi" },
        { href: "/area/profilo", label: "Profilo" },
      ]}
    >
      {children}
    </AppShell>
  );
}

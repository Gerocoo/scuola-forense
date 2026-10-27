import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/AppShell";
import { MessageThread } from "@/components/app/MessageThread";
import { MessageComposer } from "@/components/app/MessageComposer";
import { requireUser } from "@/lib/auth";
import type { Message, Profile } from "@/lib/types";

type Props = { params: Promise<{ docenteId: string }>; searchParams: Promise<{ esercitazione?: string }> };

export default async function ConversazionePage({ params, searchParams }: Props) {
  const { docenteId } = await params;
  const { esercitazione } = await searchParams;
  const { supabase, user } = await requireUser();

  const { data: teacher } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", docenteId)
    .in("role", ["teacher", "admin"])
    .maybeSingle<Profile>();
  if (!teacher) notFound();

  await supabase.rpc("mark_thread_read", { p_student: user.id, p_teacher: teacher.id });

  const [{ data: messages }, { data: assignments }, { data: active }] = await Promise.all([
    supabase
      .from("messages")
      .select("*")
      .eq("student_id", user.id)
      .eq("teacher_id", teacher.id)
      .order("created_at")
      .returns<Message[]>(),
    supabase
      .from("assignments")
      .select("id, title")
      .eq("student_id", user.id)
      .eq("teacher_id", teacher.id)
      .order("created_at", { ascending: false })
      .returns<{ id: string; title: string }[]>(),
    supabase.rpc("has_active_enrollment"),
  ]);

  const titles = Object.fromEntries((assignments ?? []).map((a) => [a.id, a.title]));
  const name = teacher.full_name || teacher.email;

  return (
    <>
      <PageHeader back={{ href: "/area/messaggi", label: "Messaggi" }} title={name} />
      <div className="space-y-6">
        <MessageThread
          messages={messages ?? []}
          meId={user.id}
          otherName={name}
          assignmentTitles={titles}
          assignmentHref={(id) => `/area/esercitazioni/${id}`}
        />
        {active ? (
          <MessageComposer
            otherId={teacher.id}
            otherName={name}
            assignments={assignments ?? []}
            defaultAssignment={esercitazione && titles[esercitazione] ? esercitazione : undefined}
          />
        ) : (
          <p className="rounded-[10px] bg-ambra-soft px-4 py-3 text-[15px] text-ambra">
            Per scrivere ai docenti serve un corso attivo.
          </p>
        )}
      </div>
    </>
  );
}

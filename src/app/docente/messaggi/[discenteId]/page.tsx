import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/AppShell";
import { MessageThread } from "@/components/app/MessageThread";
import { MessageComposer } from "@/components/app/MessageComposer";
import { requireStaff } from "@/lib/auth";
import type { Message, Profile } from "@/lib/types";

type Props = { params: Promise<{ discenteId: string }>; searchParams: Promise<{ esercitazione?: string }> };

export default async function ConversazioneDocente({ params, searchParams }: Props) {
  const { discenteId } = await params;
  const { esercitazione } = await searchParams;
  const { supabase, user } = await requireStaff();

  const { data: student } = await supabase.from("profiles").select("id, full_name, email").eq("id", discenteId).maybeSingle<Profile>();
  if (!student) notFound();

  await supabase.rpc("mark_thread_read", { p_student: student.id, p_teacher: user.id });

  const [{ data: messages }, { data: assignments }] = await Promise.all([
    supabase.from("messages").select("*").eq("student_id", student.id).eq("teacher_id", user.id).order("created_at").returns<Message[]>(),
    supabase
      .from("assignments")
      .select("id, title")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false })
      .returns<{ id: string; title: string }[]>(),
  ]);

  const titles = Object.fromEntries((assignments ?? []).map((a) => [a.id, a.title]));
  const name = student.full_name || student.email;

  return (
    <>
      <PageHeader
        back={{ href: "/docente/messaggi", label: "Messaggi" }}
        title={name}
        actions={<Link href={`/docente/discenti/${student.id}`} className="btn-secondary">Scheda discente</Link>}
      />
      <div className="space-y-6">
        <MessageThread
          messages={messages ?? []}
          meId={user.id}
          otherName={name}
          assignmentTitles={titles}
          assignmentHref={(id) => `/docente/esercitazioni/${id}`}
        />
        <MessageComposer
          otherId={student.id}
          otherName={name}
          assignments={assignments ?? []}
          defaultAssignment={esercitazione && titles[esercitazione] ? esercitazione : undefined}
        />
      </div>
    </>
  );
}

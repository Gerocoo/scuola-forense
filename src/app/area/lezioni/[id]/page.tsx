import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/AppShell";
import { LessonView } from "@/components/app/LessonView";
import { requireUser } from "@/lib/auth";
import type { Lesson, StoredFile } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function LezionePage({ params }: Props) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", id).maybeSingle<Lesson>();
  if (!lesson) notFound();

  const { data: files } = await supabase
    .from("lesson_files")
    .select("*")
    .eq("lesson_id", id)
    .order("created_at")
    .returns<StoredFile[]>();

  return (
    <>
      <PageHeader
        back={{ href: "/area/lezioni", label: "Lezioni" }}
        title={lesson.title}
        description={lesson.kind === "in_presenza" ? "Lezione in presenza" : "Lezione registrata"}
      />
      <LessonView lesson={lesson} files={files ?? []} />
    </>
  );
}

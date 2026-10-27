import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/AppShell";
import { LessonForm } from "../LessonForm";
import { LessonFiles } from "./LessonFiles";
import { requireStaff } from "@/lib/auth";
import { toLocalInput } from "@/lib/format";
import type { Lesson, Package, StoredFile } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function ModificaLezione({ params }: Props) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const [{ data: lesson }, { data: packages }, { data: files }] = await Promise.all([
    supabase.from("lessons").select("*").eq("id", id).maybeSingle<Lesson>(),
    supabase.from("packages").select("id, title, period_label").order("sort").returns<Pick<Package, "id" | "title" | "period_label">[]>(),
    supabase.from("lesson_files").select("*").eq("lesson_id", id).order("created_at").returns<StoredFile[]>(),
  ]);
  if (!lesson) notFound();

  return (
    <>
      <PageHeader back={{ href: "/docente/lezioni", label: "Lezioni" }} title={lesson.title} />
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <LessonForm lesson={lesson} packages={packages ?? []} scheduledLocal={toLocalInput(lesson.scheduled_at)} />
        <LessonFiles lessonId={lesson.id} files={files ?? []} />
      </div>
    </>
  );
}

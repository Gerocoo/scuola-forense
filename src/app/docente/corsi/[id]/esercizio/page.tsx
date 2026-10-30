import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/app/AppShell";
import { NewAssignmentForm } from "@/app/docente/esercitazioni/nuova/NewAssignmentForm";
import { requireStaff } from "@/lib/auth";
import { activeByPackage, canTeach } from "@/lib/courses";

export const metadata = { title: "Nuovo esercizio" };

type Props = { params: Promise<{ id: string }> };

export default async function NuovoEsercizioCorso({ params }: Props) {
  const { id } = await params;
  const { supabase, profile } = await requireStaff();
  const { data: course } = await supabase.from("packages").select("id, title").eq("id", id).maybeSingle<{ id: string; title: string }>();
  if (!course) notFound();
  if (!(await canTeach(supabase, profile, id))) redirect("/docente/corsi");

  const [{ data: enr }, { data: lessons }] = await Promise.all([
    supabase.from("enrollments").select("package_id, user_id, status, ends_at").eq("package_id", id),
    supabase
      .from("lessons")
      .select("id, title, sort, created_at")
      .eq("kind", "registrata")
      .contains("package_ids", [id])
      .order("sort")
      .order("created_at")
      .returns<{ id: string; title: string }[]>(),
  ]);
  const enrolled = activeByPackage(enr ?? []).get(id)?.size ?? 0;

  return (
    <>
      <PageHeader
        back={{ href: `/docente/corsi/${id}`, label: course.title }}
        title="Nuovo esercizio"
        description="Ogni iscritto riceve la propria copia, consegna in modo indipendente e riceve la tua correzione."
      />
      <NewAssignmentForm lessons={lessons ?? []} course={{ id, title: course.title, enrolled }} />
    </>
  );
}

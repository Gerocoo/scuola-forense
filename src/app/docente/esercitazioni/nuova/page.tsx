import { PageHeader } from "@/components/app/AppShell";
import { NewAssignmentForm, type StudentOption } from "./NewAssignmentForm";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "Assegna una traccia" };

type Props = { searchParams: Promise<{ discente?: string; lezione?: string }> };

export default async function NuovaEsercitazione({ searchParams }: Props) {
  const { discente, lezione } = await searchParams;
  const { supabase } = await requireStaff();
  const now = new Date().toISOString();

  const { data: students } = await supabase
    .from("profiles")
    .select("id, full_name, email, enrollments(status, ends_at, package:packages(title))")
    .eq("role", "student")
    .order("full_name");

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, sort, created_at")
    .eq("kind", "registrata")
    .order("sort")
    .order("created_at")
    .returns<{ id: string; title: string }[]>();

  const options: StudentOption[] = (students ?? []).map((s: any) => {
    const active = (s.enrollments ?? []).filter((e: any) => e.status === "active" && (!e.ends_at || e.ends_at > now));
    return {
      id: s.id,
      name: s.full_name || s.email,
      email: s.email,
      packages: active.map((e: any) => e.package?.title).filter(Boolean),
    };
  });

  return (
    <>
      <PageHeader
        back={{ href: "/docente/esercitazioni", label: "Esercitazioni" }}
        title="Assegna una traccia"
        description="Scegli uno o più discenti: ognuno riceve la propria copia della traccia e consegna in modo indipendente."
      />
      <NewAssignmentForm students={options} preselected={discente} lessons={lessons ?? []} preselectedLesson={lezione} />
    </>
  );
}

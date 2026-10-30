import { PageHeader } from "@/components/app/AppShell";
import { NewAssignmentForm, type CourseOption } from "./NewAssignmentForm";
import { requireStaff } from "@/lib/auth";
import { activeByPackage, myCourseIds } from "@/lib/courses";

export const metadata = { title: "Assegna una traccia" };

type Props = { searchParams: Promise<{ discente?: string; corso?: string; lezione?: string }> };

export default async function NuovaEsercitazione({ searchParams }: Props) {
  const { discente, corso, lezione } = await searchParams;
  const { supabase, profile } = await requireStaff();
  const ids = await myCourseIds(supabase, profile);

  const [{ data: pkgs }, { data: enr }, { data: lessons }] = await Promise.all([
    ids.length
      ? supabase.from("packages").select("id, title, period_label, sort").in("id", ids).order("sort").returns<{ id: string; title: string; period_label: string | null }[]>()
      : Promise.resolve({ data: [] as { id: string; title: string; period_label: string | null }[] }),
    ids.length ? supabase.from("enrollments").select("package_id, user_id, status, ends_at").in("package_id", ids) : Promise.resolve({ data: [] }),
    supabase
      .from("lessons")
      .select("id, title, sort, created_at")
      .eq("kind", "registrata")
      .order("sort")
      .order("created_at")
      .returns<{ id: string; title: string }[]>(),
  ]);

  const active = activeByPackage((enr ?? []) as { package_id: string; user_id: string; status: string; ends_at: string | null }[]);
  const courses: CourseOption[] = (pkgs ?? []).map((p) => ({ id: p.id, title: p.title, period: p.period_label, enrolled: active.get(p.id)?.size ?? 0 }));

  // dal profilo di un discente: preseleziona i suoi corsi
  let preselected: string[] = corso && ids.includes(corso) ? [corso] : [];
  if (discente) preselected = courses.filter((c) => active.get(c.id)?.has(discente)).map((c) => c.id);

  return (
    <>
      <PageHeader
        back={{ href: "/docente/esercitazioni", label: "Esercitazioni" }}
        title="Assegna una traccia"
        description="Scegli i corsi: ogni iscritto riceve la propria copia della traccia, consegna in modo indipendente e riceve la tua correzione."
      />
      <NewAssignmentForm courses={courses} preselected={preselected} lessons={lessons ?? []} preselectedLesson={lezione} />
    </>
  );
}

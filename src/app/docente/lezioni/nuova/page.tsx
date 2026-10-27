import { PageHeader } from "@/components/app/AppShell";
import { LessonForm } from "../LessonForm";
import { requireStaff } from "@/lib/auth";
import type { Package } from "@/lib/types";

export const metadata = { title: "Nuova lezione" };

type Props = { searchParams: Promise<{ tipo?: string; corso?: string }> };

export default async function NuovaLezione({ searchParams }: Props) {
  const { tipo, corso } = await searchParams;
  const { supabase } = await requireStaff();
  const { data: packages } = await supabase
    .from("packages")
    .select("id, title, period_label")
    .order("sort")
    .returns<Pick<Package, "id" | "title" | "period_label">[]>();

  return (
    <>
      <PageHeader back={{ href: "/docente/lezioni", label: "Lezioni" }} title="Nuova lezione" description="Dopo il salvataggio potrai allegare slide e materiali." />
      <div className="max-w-3xl">
        <LessonForm packages={packages ?? []} defaultKind={tipo === "in_presenza" ? "in_presenza" : "registrata"} defaultPackage={corso} />
      </div>
    </>
  );
}

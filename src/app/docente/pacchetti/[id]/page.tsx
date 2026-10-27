import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/AppShell";
import { PackageForm } from "../PackageForm";
import { requireAdmin } from "@/lib/auth";
import type { Package } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function ModificaPacchetto({ params }: Props) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: pkg } = await supabase.from("packages").select("*").eq("id", id).maybeSingle<Package>();
  if (!pkg) notFound();
  const { data: staff } = await supabase.from("profiles").select("id, full_name, email").in("role", ["teacher", "admin"]).order("full_name");
  const teachers = (staff ?? []).map((t: { id: string; full_name: string; email: string }) => ({ id: t.id, name: t.full_name || t.email }));
  const { data: assigned } = await supabase.from("package_teachers").select("teacher_id").eq("package_id", id);
  return (
    <>
      <PageHeader back={{ href: "/docente/pacchetti", label: "Corsi in vendita" }} title={pkg.title} description={pkg.period_label} />
      <div className="max-w-3xl">
        <PackageForm pkg={pkg} teachers={teachers} selectedTeachers={(assigned ?? []).map((a: { teacher_id: string }) => a.teacher_id)} />
      </div>
    </>
  );
}

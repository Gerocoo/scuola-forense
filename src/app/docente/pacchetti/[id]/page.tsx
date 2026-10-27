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
  return (
    <>
      <PageHeader back={{ href: "/docente/pacchetti", label: "Corsi in vendita" }} title={pkg.title} description={pkg.period_label} />
      <div className="max-w-3xl">
        <PackageForm pkg={pkg} />
      </div>
    </>
  );
}

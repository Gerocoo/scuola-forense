import { PageHeader } from "@/components/app/AppShell";
import { PackageForm } from "../PackageForm";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Nuovo corso" };

export default async function NuovoPacchetto() {
  const { supabase } = await requireAdmin();
  const { data: staff } = await supabase.from("profiles").select("id, full_name, email").in("role", ["teacher", "admin"]).order("full_name");
  const teachers = (staff ?? []).map((t: { id: string; full_name: string; email: string }) => ({ id: t.id, name: t.full_name || t.email }));
  return (
    <>
      <PageHeader back={{ href: "/docente/corsi", label: "Corsi" }} title="Nuovo corso" description="Dopo il salvataggio il corso compare nella sezione Corsi e, se è in vendita, in vetrina." />
      <div className="max-w-3xl">
        <PackageForm teachers={teachers} />
      </div>
    </>
  );
}

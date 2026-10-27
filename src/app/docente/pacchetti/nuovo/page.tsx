import { PageHeader } from "@/components/app/AppShell";
import { PackageForm } from "../PackageForm";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Nuovo corso" };

export default async function NuovoPacchetto() {
  await requireAdmin();
  return (
    <>
      <PageHeader back={{ href: "/docente/pacchetti", label: "Corsi in vendita" }} title="Nuovo corso" />
      <div className="max-w-3xl">
        <PackageForm />
      </div>
    </>
  );
}

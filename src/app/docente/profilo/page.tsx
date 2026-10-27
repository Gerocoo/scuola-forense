import { PageHeader } from "@/components/app/AppShell";
import { ProfileForm } from "@/components/app/ProfileForm";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "Profilo" };

export default async function ProfiloDocente() {
  const { profile } = await requireStaff();
  return (
    <>
      <PageHeader title="Profilo" description="Il nome compare ai discenti nei messaggi e nelle esercitazioni." />
      <ProfileForm profile={profile} />
    </>
  );
}

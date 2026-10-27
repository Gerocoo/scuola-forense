import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { ProfileForm } from "@/components/app/ProfileForm";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Profilo" };

export default async function ProfiloPage() {
  const { profile, user } = await requireUser();
  const google = user.app_metadata?.provider === "google";
  return (
    <>
      <PageHeader title="Profilo" />
      <ProfileForm profile={profile} />
      <div className="mt-8 max-w-xl text-[15px] text-slate">
        {google ? (
          <p>Accedi con il tuo account Google.</p>
        ) : (
          <p>
            Vuoi cambiare password? <Link href="/password-dimenticata" className="link">Ricevi un link via email</Link>.
          </p>
        )}
      </div>
    </>
  );
}

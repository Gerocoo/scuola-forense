import { PageHeader } from "@/components/app/AppShell";
import { ProfileForm } from "@/components/app/ProfileForm";
import { AvatarSettings, PasswordSettings } from "@/components/app/AccountSettings";
import { PushSettings } from "@/components/app/PushSettings";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Profilo" };

export default async function ProfiloPage() {
  const { profile, user } = await requireUser();
  const hasPassword = (user.identities ?? []).some((i) => i.provider === "email");
  return (
    <>
      <PageHeader title="Profilo" description="La tua foto, i tuoi dati e la password." />
      <div className="max-w-2xl space-y-5">
        <AvatarSettings name={profile.full_name} email={profile.email} avatar={profile.avatar_url} />
        <ProfileForm profile={profile} />
        <PushSettings />
        <PasswordSettings hasPassword={hasPassword} />
      </div>
    </>
  );
}

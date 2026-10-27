import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "./SignupForm";
import { safeNext } from "@/lib/auth";

export const metadata = { title: "Registrati" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function RegistratiPage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next);
  return (
    <AuthShell title="Crea il tuo account" subtitle="Serve per acquistare un corso e accedere alla tua area.">
      <SignupForm next={next} />
    </AuthShell>
  );
}

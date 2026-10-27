import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "./LoginForm";
import { redirect } from "next/navigation";
import { getSession, safeNext } from "@/lib/auth";

export const metadata = { title: "Accedi" };

type Props = { searchParams: Promise<{ next?: string; errore?: string }> };

export default async function AccediPage({ searchParams }: Props) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  // Già collegato: niente seconda schermata di accesso.
  const { user } = await getSession();
  if (user) redirect(next);
  return (
    <AuthShell title="Accedi" subtitle="Entra nella tua area per lezioni, tracce e correzioni.">
      {sp.errore === "link" && (
        <p role="alert" className="mb-6 rounded-[8px] bg-ceralacca-soft px-4 py-3 text-sm text-ceralacca">
          Il link è scaduto o è già stato usato. Accedi di nuovo o richiedine uno nuovo.
        </p>
      )}
      <LoginForm next={next} />
    </AuthShell>
  );
}

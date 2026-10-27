import Link from "next/link";
import { Logo } from "@/components/Logo";
import { fulfillCheckout } from "@/lib/stripe";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Iscrizione" };

type Props = { searchParams: Promise<{ session_id?: string }> };

export default async function SuccessoPage({ searchParams }: Props) {
  const { session_id } = await searchParams;
  const { user } = await getSession();

  let state: "ok" | "pending" | "error" = "error";
  if (session_id) {
    try {
      const res = await fulfillCheckout(session_id);
      // La sessione deve appartenere all'utente collegato.
      if (user && res.session.metadata?.user_id !== user.id) state = "error";
      else state = res.fulfilled ? "ok" : "pending";
    } catch (e) {
      console.error("[successo]", e);
      state = "error";
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-16">
      <Logo />
      <div className="panel mt-10 p-8">
        {state === "ok" && (
          <>
            <h1 className="text-2xl font-semibold">Iscrizione completata</h1>
            <p className="mt-3 leading-relaxed text-slate">
              Il pagamento è andato a buon fine. Ti abbiamo inviato una email di conferma; la fattura arriva da Stripe.
            </p>
            <Link href="/area" className="btn-primary mt-8">Apri la tua area</Link>
          </>
        )}
        {state === "pending" && (
          <>
            <h1 className="text-2xl font-semibold">Pagamento in elaborazione</h1>
            <p className="mt-3 leading-relaxed text-slate">
              La banca non ha ancora confermato il pagamento. Appena arriva la conferma l&apos;area si attiva e ricevi una
              email. Di solito servono pochi minuti.
            </p>
            <Link href="/area" className="btn-secondary mt-8">Vai alla tua area</Link>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="text-2xl font-semibold">Non troviamo questo pagamento</h1>
            <p className="mt-3 leading-relaxed text-slate">
              Se l&apos;addebito è avvenuto, l&apos;iscrizione si attiverà automaticamente. Se entro un&apos;ora non vedi il corso
              nella tua area, scrivi alla segreteria indicando l&apos;email usata per pagare.
            </p>
            <Link href="/area" className="btn-secondary mt-8">Vai alla tua area</Link>
          </>
        )}
      </div>
    </main>
  );
}

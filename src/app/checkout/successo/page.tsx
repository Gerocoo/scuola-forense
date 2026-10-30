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
  let archive = false;
  let oral = false;
  let product = "corso";
  if (session_id) {
    try {
      const res = await fulfillCheckout(session_id);
      archive = res.session.metadata?.slug === "archivio-tracce";
      oral = res.session.metadata?.slug === "modulo-orale";
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const { data: p } = await createAdminClient().from("packages").select("product").eq("slug", res.session.metadata?.slug ?? "").maybeSingle();
      product = p?.product ?? "corso";
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
            <h1 className="text-2xl font-semibold">{product === "corso" ? "Iscrizione completata" : "Acquisto completato"}</h1>
            <p className="mt-3 leading-relaxed text-slate">
              Il pagamento è andato a buon fine. Ti abbiamo inviato una email di conferma; la fattura arriva da Stripe.
            </p>
            <Link
              href={archive ? "/area/archivio" : oral ? "/area/orale" : product === "lezioni" ? "/area/lezioni-private" : product === "correzioni" ? "/area/correzioni" : "/area"}
              className="btn-primary mt-8"
            >
              {archive
                ? "Apri l'archivio tracce"
                : oral
                  ? "Vai all'Orale"
                  : product === "lezioni"
                    ? "Prenota la tua lezione"
                    : product === "correzioni"
                      ? "Invia il tuo elaborato"
                      : "Apri la tua area"}
            </Link>
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

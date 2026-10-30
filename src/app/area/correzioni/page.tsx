import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { CheckoutForm } from "@/components/site/CheckoutForm";
import { CancelCorrection, CorrectionRequestForm } from "./CorrectionClient";
import { requireUser } from "@/lib/auth";
import { creditBalance } from "@/lib/credits";
import { hasArchiveAccess } from "@/lib/archive";
import { activeProducts, priceOf } from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateShort, euro } from "@/lib/format";

export const metadata = { title: "Correzioni" };

const ERR: Record<string, string> = {
  crediti: "Non hai correzioni disponibili: acquistane una qui sotto.",
  archivio: "Quella traccia è riservata: scegline una gratuita o incolla il testo.",
  traccia: "Traccia non trovata.",
  titolo: "Inserisci il titolo della traccia.",
  docenti: "Nessun docente disponibile al momento: scrivi alla segreteria.",
  "1": "Richiesta non riuscita. Riprova.",
};

const STATUS: Record<string, string> = { assegnato: "Da consegnare", consegnato: "In attesa di correzione", in_correzione: "In correzione", corretto: "Corretto" };

export default async function CorrezioniPage({ searchParams }: { searchParams: Promise<{ errore?: string; consenso?: string }> }) {
  const { errore, consenso } = await searchParams;
  const { supabase, user } = await requireUser();
  const [bal, access, products, { data: mine }] = await Promise.all([
    creditBalance(user.id),
    hasArchiveAccess(supabase),
    activeProducts(["correzioni"]),
    supabase.from("assignments").select("id, title, status, created_at").eq("student_id", user.id).eq("on_request", true).order("created_at", { ascending: false }),
  ]);
  let tq = createAdminClient().from("past_tracks").select("id, year, title, subject, kind, free").order("year", { ascending: false }).limit(300);
  if (!access) tq = tq.eq("free", true);
  const { data: tracks } = await tq;

  return (
    <>
      <PageHeader
        title="Correzioni"
        description="Svolgi una traccia, anche dall'archivio, e inviala: un docente la corregge sul documento con la griglia della commissione, entro 7 giorni."
      />
      {(errore || consenso) && (
        <p role="alert" className="mb-5 rounded-[14px] bg-ambra-soft px-4 py-3 text-[15px]">
          {consenso ? "Per procedere conferma la richiesta di accesso immediato." : ERR[errore ?? "1"] ?? ERR["1"]}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="panel p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[19px] font-semibold">Invia un elaborato</h2>
            <span className={`rounded-full px-3 py-1 text-[14px] font-medium ${bal.corrections ? "bg-codice-soft text-codice" : "bg-line-soft text-mute"}`}>
              {bal.corrections} {bal.corrections === 1 ? "correzione disponibile" : "correzioni disponibili"}
            </span>
          </div>
          <div className="mt-4">
            {bal.corrections > 0 ? (
              <CorrectionRequestForm
                tracks={(tracks ?? []).map((t: { id: string; year: number; title: string; subject: string; kind: string }) => ({
                  id: t.id,
                  label: `${t.year} · ${t.subject} · ${t.kind}: ${t.title}`,
                }))}
              />
            ) : (
              <p className="text-[15px] text-slate">Acquista una correzione per inviare il tuo elaborato.</p>
            )}
          </div>
        </section>
        <aside className="space-y-4">
          {products.map((p) => (
            <div key={p.id} className="panel p-5">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-1 text-[14px] text-slate">{p.tagline}</p>
              <p className="my-3 text-[24px] font-semibold tabular-nums">{euro(priceOf(p))}</p>
              <CheckoutForm slug={p.slug} label="Acquista" />
            </div>
          ))}
          {!products.length && <p className="panel p-5 text-[14px] text-slate">Le correzioni a pagamento saranno disponibili a breve.</p>}
        </aside>
      </div>

      {(mine ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[19px] font-semibold">Le tue richieste</h2>
          <ul className="divide-y divide-line-soft rounded-[var(--radius-panel)] bg-surface shadow-[var(--shadow-card)]">
            {(mine ?? []).map((a: { id: string; title: string; status: string; created_at: string }) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <Link href={`/area/esercitazioni/${a.id}`} className="min-w-0 font-medium hover:underline">{a.title}</Link>
                <span className="flex items-center gap-3 text-[14px] text-slate">
                  {STATUS[a.status] ?? a.status} · {dateShort(a.created_at)}
                  {a.status === "assegnato" && <CancelCorrection id={a.id} />}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

import { PageHeader } from "@/components/app/AppShell";
import { CheckoutForm } from "@/components/site/CheckoutForm";
import { MeetingCard, MeetingRequestForm } from "@/components/app/Meetings";
import { requireUser } from "@/lib/auth";
import { creditBalance, minutesLabel } from "@/lib/credits";
import { loadMeetings } from "@/lib/meetings";
import { activeProducts, priceOf } from "@/lib/services";
import { euro } from "@/lib/format";

export const metadata = { title: "Lezioni private" };

export default async function LezioniPrivatePage({ searchParams }: { searchParams: Promise<{ consenso?: string }> }) {
  const { consenso } = await searchParams;
  const { supabase, user } = await requireUser();
  const [bal, products, { toHandle, upcoming, past }, { data: teachers }] = await Promise.all([
    creditBalance(user.id),
    activeProducts(["lezioni"]),
    loadMeetings(supabase, user.id, "student"),
    supabase.from("profiles").select("id, full_name, email").in("role", ["teacher", "admin"]).order("full_name"),
  ]);
  const paid = (m: { kind: string }) => m.kind !== "colloquio";
  const active = [...toHandle, ...upcoming].filter(paid);
  const done = past.filter(paid).slice(0, 15);

  return (
    <>
      <PageHeader
        title="Lezioni private"
        description="Ore individuali con i docenti, in videochiamata o in sede. Prenoti con i minuti acquistati; se annulli con almeno 24 ore di anticipo i minuti ti vengono restituiti."
      />
      {consenso && <p role="alert" className="mb-5 rounded-[14px] bg-ambra-soft px-4 py-3 text-[15px]">Per procedere conferma la richiesta di accesso immediato.</p>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="panel p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[19px] font-semibold">Prenota una lezione</h2>
              <span className={`rounded-full px-3 py-1 text-[14px] font-medium ${bal.minutes ? "bg-codice-soft text-codice" : "bg-line-soft text-mute"}`}>
                Disponibili: {minutesLabel(bal.minutes)}
              </span>
            </div>
            <div className="mt-4">
              {bal.minutes >= 30 ? (
                <MeetingRequestForm
                  paid={{ balance: bal.minutes }}
                  teachers={(teachers ?? []).map((t: { id: string; full_name: string | null; email: string }) => ({ id: t.id, name: t.full_name || t.email }))}
                />
              ) : (
                <p className="text-[15px] text-slate">Acquista un pacchetto per prenotare la tua prima lezione.</p>
              )}
            </div>
          </section>
          {active.length > 0 && (
            <section>
              <h2 className="mb-3 text-[19px] font-semibold">In programma</h2>
              <ul className="space-y-3">
                {active.map((m) => (
                  <MeetingCard key={m.id} m={m} meId={user.id} staff={false} />
                ))}
              </ul>
            </section>
          )}
          {done.length > 0 && (
            <section>
              <h2 className="mb-3 text-[19px] font-semibold">Passate e annullate</h2>
              <ul className="space-y-3">
                {done.map((m) => (
                  <MeetingCard key={m.id} m={m} meId={user.id} staff={false} />
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className="space-y-4">
          {products.map((p) => (
            <div key={p.id} className="panel p-5">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-1 text-[14px] text-slate">{p.tagline}</p>
              <p className="my-3 text-[24px] font-semibold tabular-nums">{euro(priceOf(p))}</p>
              <CheckoutForm slug={p.slug} label="Acquista" />
            </div>
          ))}
          {!products.length && <p className="panel p-5 text-[14px] text-slate">I pacchetti di lezioni private saranno disponibili a breve.</p>}
        </aside>
      </div>
    </>
  );
}

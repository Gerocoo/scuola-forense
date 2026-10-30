import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";
import { requireUser } from "@/lib/auth";
import { dateLong, euro } from "@/lib/format";
import type { Enrollment } from "@/lib/types";
import { ReviewForm } from "@/components/app/ReviewForm";
import { hasTakenCourse } from "@/lib/oral";

export const metadata = { title: "I miei corsi" };

const STATUS = { active: "Attivo", expired: "Scaduto", refunded: "Rimborsato", pending: "In attesa di pagamento" } as const;

export default async function CorsiPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("enrollments")
    .select("*, package:packages(title, period_label, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Enrollment[]>();

  const now = new Date().toISOString();
  const [canReview, { data: myReview }] = await Promise.all([
    hasTakenCourse(user.id),
    supabase.from("reviews").select("rating, body, approved").eq("user_id", user.id).maybeSingle<{ rating: number; body: string; approved: boolean }>(),
  ]);

  return (
    <>
      <PageHeader
        title="I miei corsi"
        description="Le fatture arrivano via email da Stripe al momento del pagamento."
        actions={<Link href="/#corsi" className="btn-secondary">Scopri altri corsi</Link>}
      />
      {!data?.length ? (
        <EmptyState
          title="Nessun acquisto"
          body="Quando acquisti un corso lo trovi qui con la data di scadenza dell'accesso."
          action={<Link href="/#corsi" className="btn-primary">Scegli il corso</Link>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((e) => {
            const expired = e.status === "active" && e.ends_at && e.ends_at < now;
            const label = expired ? "Scaduto" : STATUS[e.status];
            return (
              <li key={e.id} className="panel p-5">
                {e.status === "pending" && (
                  <p className="mb-3 rounded-[12px] bg-ambra-soft px-3 py-2 text-[14px] text-ink">
                    Iscrizione registrata dalla segreteria. Il corso si attiva appena riceviamo il bonifico: ti avviseremo via email.
                  </p>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-codice">{e.package?.period_label}</p>
                    <p className="mt-0.5 text-lg font-semibold">{e.package?.title}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${
                      label === "Attivo" ? "bg-codice-soft text-codice" : e.status === "pending" ? "bg-ambra-soft text-ambra" : "bg-line-soft text-slate"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-[15px]">
                  <div>
                    <dt className="text-sm text-mute">Acquistato il</dt>
                    <dd>{dateLong(e.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-mute">Importo</dt>
                    <dd className="tabular-nums">{euro(e.amount_cents)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-sm text-mute">Accesso fino al</dt>
                    <dd>{e.ends_at ? dateLong(e.ends_at) : "Senza scadenza"}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
      {canReview && (
        <section className="panel mt-8 max-w-2xl p-5 sm:p-6">
          <h2 className="text-[19px] font-semibold">La tua opinione</h2>
          <p className="mt-1 text-[15px] text-slate">Aiuta chi si prepara all&apos;esame a scegliere: la tua recensione comparirà nel sito con il nome abbreviato.</p>
          <div className="mt-4">
            <ReviewForm initial={myReview} />
          </div>
        </section>
      )}
    </>
  );
}

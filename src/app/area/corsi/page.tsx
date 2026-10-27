import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";
import { requireUser } from "@/lib/auth";
import { dateLong, euro } from "@/lib/format";
import type { Enrollment } from "@/lib/types";

export const metadata = { title: "I miei corsi" };

const STATUS = { active: "Attivo", expired: "Scaduto", refunded: "Rimborsato" } as const;

export default async function CorsiPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("enrollments")
    .select("*, package:packages(title, period_label, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Enrollment[]>();

  const now = new Date().toISOString();

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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-codice">{e.package?.period_label}</p>
                    <p className="mt-0.5 text-lg font-semibold">{e.package?.title}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${
                      label === "Attivo" ? "bg-codice-soft text-codice" : "bg-line-soft text-slate"
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
    </>
  );
}

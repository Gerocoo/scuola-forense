import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";
import { StatusBadge } from "@/components/app/StatusBadge";
import { requireUser } from "@/lib/auth";
import { dateShort, KIND_LABEL } from "@/lib/format";
import type { Assignment, AssignmentStatus } from "@/lib/types";

export const metadata = { title: "Esercitazioni" };

const GROUPS: { status: AssignmentStatus[]; title: string; empty: string }[] = [
  { status: ["assegnato"], title: "Da svolgere", empty: "Nessuna traccia da svolgere." },
  { status: ["consegnato", "in_correzione"], title: "In attesa di correzione", empty: "Nessun elaborato in attesa." },
  { status: ["corretto"], title: "Corrette", empty: "Ancora nessuna correzione." },
];

export default async function EsercitazioniPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("assignments")
    .select("*")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Assignment[]>();

  const all = data ?? [];
  const now = new Date().toISOString();

  return (
    <>
      <PageHeader
        title="Esercitazioni"
        description="Scarica la traccia, svolgila e carica il tuo elaborato. Quando il docente pubblica la correzione la trovi nella stessa pagina."
      />
      {!all.length ? (
        <EmptyState title="Ancora nessuna traccia" body="Le tracce assegnate dai docenti compariranno qui. Ti avvisiamo anche via email." />
      ) : (
        <div className="space-y-10">
          {GROUPS.map((g) => {
            const items = all.filter((a) => g.status.includes(a.status));
            return (
              <section key={g.title}>
                <h2 className="text-lg font-semibold">
                  {g.title} <span className="font-normal text-mute tabular-nums">{items.length}</span>
                </h2>
                {items.length ? (
                  <ul className="mt-3 divide-y divide-line-soft rounded-[var(--radius-panel)] bg-surface shadow-[var(--shadow-card)]">
                    {items.map((a) => {
                      const late = a.status === "assegnato" && a.due_at && a.due_at < now;
                      return (
                        <li key={a.id}>
                          <Link href={`/area/esercitazioni/${a.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-paper">
                            <div className="min-w-0">
                              <p className="font-medium">{a.title}</p>
                              <p className="text-sm text-mute">
                                {KIND_LABEL[a.kind]}
                                {a.due_at && (
                                  <span className={late ? "font-medium text-ceralacca" : ""}>
                                    {", "}scadenza {dateShort(a.due_at)}
                                  </span>
                                )}
                              </p>
                            </div>
                            <StatusBadge status={a.status} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 text-[15px] text-mute">{g.empty}</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

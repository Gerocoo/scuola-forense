import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";
import { StatusBadge } from "@/components/app/StatusBadge";
import { requireStaff } from "@/lib/auth";
import { dateShort, KIND_LABEL } from "@/lib/format";
import type { Assignment, AssignmentStatus, Profile } from "@/lib/types";

export const metadata = { title: "Esercitazioni" };

type Row = Assignment & { student: Pick<Profile, "full_name" | "email"> | null };

const FILTERS: { key: string; label: string; status?: AssignmentStatus[] }[] = [
  { key: "da-correggere", label: "Da correggere", status: ["consegnato", "in_correzione"] },
  { key: "in-attesa", label: "In attesa del discente", status: ["assegnato"] },
  { key: "corrette", label: "Corrette", status: ["corretto"] },
  { key: "tutte", label: "Tutte" },
];

type Props = { searchParams: Promise<{ stato?: string; mie?: string; q?: string }> };

export default async function EsercitazioniDocente({ searchParams }: Props) {
  const sp = await searchParams;
  const { supabase, user } = await requireStaff();
  const filter = FILTERS.find((f) => f.key === sp.stato) ?? FILTERS[0];
  const onlyMine = sp.mie === "1";

  let query = supabase
    .from("assignments")
    .select("*, student:profiles!assignments_student_id_fkey(full_name, email)")
    .order(filter.key === "da-correggere" ? "submitted_at" : "created_at", { ascending: filter.key === "da-correggere" })
    .limit(200);
  if (filter.status) query = query.in("status", filter.status);
  if (onlyMine) query = query.eq("teacher_id", user.id);
  if (sp.q) query = query.ilike("title", `%${sp.q.replace(/[%_]/g, "")}%`);

  const { data } = await query.returns<Row[]>();
  const now = new Date().toISOString();

  const href = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { stato: filter.key, mie: onlyMine ? "1" : undefined, q: sp.q, ...o };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    return `/docente/esercitazioni?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Esercitazioni"
        description="Le tracce assegnate ai discenti e gli elaborati da correggere."
        actions={<Link href="/docente/esercitazioni/nuova" className="btn-primary">Assegna una traccia</Link>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={href({ stato: f.key })}
            aria-current={f.key === filter.key ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[15px] ${
              f.key === filter.key ? "bg-ink text-white" : "border border-line bg-surface text-slate hover:text-ink"
            }`}
          >
            {f.label}
          </Link>
        ))}
        <span className="mx-1 h-5 w-px bg-line" />
        <Link href={href({ mie: onlyMine ? undefined : "1" })} className="text-[15px] text-slate hover:text-ink">
          {onlyMine ? "Mostra di tutti i docenti" : "Solo le mie"}
        </Link>
        <form className="ml-auto" action="/docente/esercitazioni">
          <input type="hidden" name="stato" value={filter.key} />
          {onlyMine && <input type="hidden" name="mie" value="1" />}
          <label className="sr-only" htmlFor="q">Cerca per titolo</label>
          <input id="q" name="q" defaultValue={sp.q} placeholder="Cerca per titolo" className="field w-56 py-1.5" />
        </form>
      </div>

      {!data?.length ? (
        <EmptyState
          title={filter.key === "da-correggere" ? "Nessun elaborato da correggere" : "Nessuna esercitazione"}
          body="Assegna una traccia a uno o più discenti: riceveranno un'email e la troveranno nella loro area."
        />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-panel)] bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[640px] text-left text-[15px]">
            <thead className="border-b border-line text-sm text-mute">
              <tr>
                <th className="px-5 py-3 font-medium">Discente</th>
                <th className="px-5 py-3 font-medium">Traccia</th>
                <th className="px-5 py-3 font-medium">Scadenza</th>
                <th className="px-5 py-3 font-medium">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {data.map((a) => {
                const late = a.status === "assegnato" && a.due_at && a.due_at < now;
                return (
                  <tr key={a.id} className="hover:bg-paper">
                    <td className="px-5 py-3">
                      <Link href={`/docente/esercitazioni/${a.id}`} className="font-medium hover:text-codice">
                        {a.student?.full_name || a.student?.email}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className="block">{a.title}</span>
                      <span className="text-sm text-mute">{KIND_LABEL[a.kind]}</span>
                    </td>
                    <td className={`px-5 py-3 tabular-nums ${late ? "text-ceralacca" : "text-slate"}`}>
                      {a.due_at ? dateShort(a.due_at) : "Nessuna"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={a.status} view="teacher" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

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

      <div className="mb-6 space-y-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={href({ stato: f.key })}
              aria-current={f.key === filter.key ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[14px] sm:text-[15px] ${
                f.key === filter.key ? "bg-ink text-white" : "border border-line bg-surface text-slate hover:text-ink"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form className="min-w-0 flex-1 sm:max-w-xs" action="/docente/esercitazioni">
            <input type="hidden" name="stato" value={filter.key} />
            {onlyMine && <input type="hidden" name="mie" value="1" />}
            <label className="sr-only" htmlFor="q">Cerca per titolo</label>
            <input id="q" name="q" defaultValue={sp.q} placeholder="Cerca per titolo" className="field py-2" />
          </form>
          <Link href={href({ mie: onlyMine ? undefined : "1" })} className="text-[14px] font-medium text-codice hover:underline">
            {onlyMine ? "Mostra di tutti i docenti" : "Solo le mie"}
          </Link>
        </div>
      </div>

      {!data?.length ? (
        <EmptyState
          title={filter.key === "da-correggere" ? "Nessun elaborato da correggere" : "Nessuna esercitazione"}
          body="Assegna una traccia a uno o più discenti: riceveranno un'email e la troveranno nella loro area."
        />
      ) : (
        <div className="panel overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_110px_150px] gap-4 border-b border-line px-5 py-3 text-sm text-mute md:grid">
            <span>Discente</span>
            <span>Traccia</span>
            <span>Scadenza</span>
            <span>Stato</span>
          </div>
          <ul className="divide-y divide-line-soft">
            {data.map((a) => {
              const late = a.status === "assegnato" && a.due_at && a.due_at < now;
              return (
                <li key={a.id}>
                  <Link
                    href={`/docente/esercitazioni/${a.id}`}
                    className="grid gap-1 px-4 py-3.5 transition-colors hover:bg-paper md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_110px_150px] md:items-center md:gap-4 md:px-5"
                  >
                    <span className="flex items-center justify-between gap-3 md:block">
                      <span className="truncate text-[15px] font-semibold md:font-medium">{a.student?.full_name || a.student?.email}</span>
                      <span className="shrink-0 md:hidden">
                        <StatusBadge status={a.status} view="teacher" />
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px]">{a.title}</span>
                      <span className="text-[13px] text-mute">
                        {KIND_LABEL[a.kind]}
                        <span className={`md:hidden ${late ? "text-ceralacca" : ""}`}>{a.due_at ? ` · scadenza ${dateShort(a.due_at)}` : ""}</span>
                      </span>
                    </span>
                    <span className={`hidden text-[15px] tabular-nums md:block ${late ? "text-ceralacca" : "text-slate"}`}>
                      {a.due_at ? dateShort(a.due_at) : "Nessuna"}
                    </span>
                    <span className="hidden md:block">
                      <StatusBadge status={a.status} view="teacher" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "Discenti" };

type Props = { searchParams: Promise<{ q?: string; tutti?: string }> };

export default async function DiscentiPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const now = new Date().toISOString();

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, created_at, enrollments(status, ends_at, package:packages(title)), assignments!assignments_student_id_fkey(status)")
    .eq("role", "student")
    .order("full_name");
  if (sp.q) {
    const q = sp.q.replace(/[%_,()]/g, "");
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }
  const { data } = await query;

  type Row = {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    created_at: string;
    enrollments: { status: string; ends_at: string | null; package: { title: string } | null }[];
    assignments: { status: string }[];
  };

  const rows = ((data ?? []) as unknown as Row[]).map((s) => {
    const active = s.enrollments.filter((e) => e.status === "active" && (!e.ends_at || e.ends_at > now));
    return {
      ...s,
      active: active.map((e) => e.package?.title).filter(Boolean) as string[],
      toCorrect: s.assignments.filter((a) => a.status === "consegnato" || a.status === "in_correzione").length,
      todo: s.assignments.filter((a) => a.status === "assegnato").length,
      done: s.assignments.filter((a) => a.status === "corretto").length,
    };
  });
  const base = sp.tutti === "1" ? rows : rows.filter((r) => r.active.length);
  // prima chi ha elaborati da correggere, poi chi deve ancora consegnare
  const list = [...base].sort((x, y) => y.toCorrect - x.toCorrect || y.todo - x.todo || (x.full_name || x.email).localeCompare(y.full_name || y.email));
  const totals = {
    toCorrect: list.reduce((n, r) => n + r.toCorrect, 0),
    todo: list.reduce((n, r) => n + r.todo, 0),
    done: list.reduce((n, r) => n + r.done, 0),
  };

  return (
    <>
      <PageHeader title="Discenti" description={`${list.length} ${sp.tutti === "1" ? "registrati" : "con un corso attivo"}.`} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form action="/docente/discenti" className="flex min-w-0 flex-1 gap-2 sm:flex-none">
          {sp.tutti === "1" && <input type="hidden" name="tutti" value="1" />}
          <label htmlFor="q" className="sr-only">Cerca</label>
          <input id="q" name="q" defaultValue={sp.q} placeholder="Cerca per nome o email" className="field min-w-0 flex-1 py-2 sm:w-64" />
          <button className="btn-secondary btn-sm shrink-0">Cerca</button>
        </form>
        <Link
          href={sp.tutti === "1" ? "/docente/discenti" : "/docente/discenti?tutti=1"}
          className="text-[14px] font-medium text-codice hover:underline"
        >
          {sp.tutti === "1" ? "Solo con corso attivo" : "Mostra anche chi non ha un corso"}
        </Link>
      </div>

      {list.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2 text-[14px]">
          <StatusPill kind="correct" n={totals.toCorrect} label="da correggere" />
          <StatusPill kind="todo" n={totals.todo} label="da svolgere" />
          <StatusPill kind="done" n={totals.done} label="corrette" />
        </div>
      )}

      {!list.length ? (
        <EmptyState title="Nessun discente" body="I discenti compaiono qui dopo la registrazione e l'acquisto di un corso." />
      ) : (
        <ul className="space-y-3">
          {list.map((s) => (
            <li key={s.id}>
              <Link
                href={`/docente/discenti/${s.id}`}
                className={`panel lift flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5 ${s.toCorrect ? "ring-1 ring-ceralacca/25" : ""}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="relative shrink-0">
                    <Avatar name={s.full_name} email={s.email} url={s.avatar_url} />
                    <span
                      aria-hidden
                      className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-2 ring-surface ${
                        s.toCorrect ? "bg-ceralacca" : s.todo ? "bg-ambra" : s.done ? "bg-codice" : "bg-line"
                      }`}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-semibold">{s.full_name || s.email}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {s.active.length ? (
                        s.active.map((c) => (
                          <span key={c} className="rounded-full bg-codice-soft px-2 py-0.5 text-[13px] font-medium text-codice">{c}</span>
                        ))
                      ) : (
                        <span className="rounded-full bg-line-soft px-2 py-0.5 text-[13px] text-mute">Nessun corso attivo</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                  <StatusPill kind="correct" n={s.toCorrect} label="da correggere" compact />
                  <StatusPill kind="todo" n={s.todo} label="da svolgere" compact />
                  <StatusPill kind="done" n={s.done} label="corrette" compact />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const PILL = {
  correct: {
    on: "bg-ceralacca-soft text-ceralacca",
    icon: "M4 20l4-1 11-11-3-3L5 16z M14 6l3 3",
  },
  todo: {
    on: "bg-ambra-soft text-ambra",
    icon: "M12 7v5l3 2 M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  },
  done: {
    on: "bg-codice-soft text-codice",
    icon: "M5 12.5l4.5 4.5L19 7.5",
  },
} as const;

/** Etichetta di stato con icona colorata; grigia quando il numero è zero. */
function StatusPill({ kind, n, label, compact = false }: { kind: keyof typeof PILL; n: number; label: string; compact?: boolean }) {
  const p = PILL[kind];
  return (
    <span
      title={`${n} ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium tabular-nums ${n ? p.on : "bg-paper text-mute/70"} ${compact ? "text-[14px]" : ""}`}
    >
      <svg viewBox="0 0 24 24" className="size-[15px]" aria-hidden>
        <path d={p.icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{n}</span>
      <span className={compact ? "sr-only sm:not-sr-only" : ""}>{label}</span>
    </span>
  );
}

import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { requireStaff } from "@/lib/auth";
import { dateShort } from "@/lib/format";

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
  const list = sp.tutti === "1" ? rows : rows.filter((r) => r.active.length);

  return (
    <>
      <PageHeader title="Discenti" description={`${list.length} ${sp.tutti === "1" ? "registrati" : "con un corso attivo"}.`} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form action="/docente/discenti" className="flex gap-2">
          {sp.tutti === "1" && <input type="hidden" name="tutti" value="1" />}
          <label htmlFor="q" className="sr-only">Cerca</label>
          <input id="q" name="q" defaultValue={sp.q} placeholder="Cerca per nome o email" className="field w-64 py-2" />
          <button className="btn-secondary btn-sm">Cerca</button>
        </form>
        <Link
          href={sp.tutti === "1" ? "/docente/discenti" : "/docente/discenti?tutti=1"}
          className="text-[15px] text-slate hover:text-ink"
        >
          {sp.tutti === "1" ? "Solo con corso attivo" : "Mostra anche chi non ha un corso"}
        </Link>
      </div>

      {!list.length ? (
        <EmptyState title="Nessun discente" body="I discenti compaiono qui dopo la registrazione e l'acquisto di un corso." />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-line bg-surface">
          <table className="w-full min-w-[680px] text-left text-[15px]">
            <thead className="border-b border-line text-sm text-mute">
              <tr>
                <th className="px-5 py-3 font-medium">Discente</th>
                <th className="px-5 py-3 font-medium">Corsi attivi</th>
                <th className="px-5 py-3 text-right font-medium">Da svolgere</th>
                <th className="px-5 py-3 text-right font-medium">Da correggere</th>
                <th className="px-5 py-3 text-right font-medium">Corrette</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {list.map((s) => (
                <tr key={s.id} className="hover:bg-paper">
                  <td className="px-5 py-3">
                    <Link href={`/docente/discenti/${s.id}`} className="flex items-center gap-3 hover:text-codice">
                      <Avatar name={s.full_name} email={s.email} url={s.avatar_url} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{s.full_name || s.email}</span>
                        <span className="block truncate text-sm text-mute">Iscritto dal {dateShort(s.created_at)}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate">{s.active.join(", ") || "Nessuno"}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{s.todo}</td>
                  <td className={`px-5 py-3 text-right tabular-nums ${s.toCorrect ? "font-semibold text-ceralacca" : ""}`}>{s.toCorrect}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{s.done}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

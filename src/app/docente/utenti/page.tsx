import { PageHeader } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Avatar";
import { RoleSelect } from "./RoleSelect";
import { requireAdmin } from "@/lib/auth";
import { dateShort } from "@/lib/format";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Utenti e ruoli" };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function UtentiPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const { supabase, user } = await requireAdmin();

  let query = supabase.from("profiles").select("*").order("role", { ascending: false }).order("full_name").limit(300);
  if (q) {
    const s = q.replace(/[%_,()]/g, "");
    query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%`);
  }
  const { data } = await query.returns<Profile[]>();

  return (
    <>
      <PageHeader
        title="Utenti e ruoli"
        description="Per aggiungere un docente: chiedigli di registrarsi sul sito, poi cambia qui il suo ruolo in Docente."
      />
      <form action="/docente/utenti" className="mb-6 flex gap-2">
        <label htmlFor="q" className="sr-only">Cerca</label>
        <input id="q" name="q" defaultValue={q} placeholder="Cerca per nome o email" className="field w-72 py-2" />
        <button className="btn-secondary btn-sm">Cerca</button>
      </form>
      <div className="overflow-x-auto rounded-[var(--radius-panel)] bg-surface shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[640px] text-left text-[15px]">
          <thead className="border-b border-line text-sm text-mute">
            <tr>
              <th className="px-5 py-3 font-medium">Utente</th>
              <th className="px-5 py-3 font-medium">Registrato</th>
              <th className="px-5 py-3 font-medium">Ruolo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {(data ?? []).map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.full_name} email={p.email} url={p.avatar_url} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.full_name || "Senza nome"}</p>
                      <p className="truncate text-sm text-mute">{p.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate">{dateShort(p.created_at)}</td>
                <td className="px-5 py-3">
                  {p.id === user.id ? <span className="text-slate">Amministratore (tu)</span> : <RoleSelect userId={p.id} role={p.role} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

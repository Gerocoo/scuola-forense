import { PageHeader } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Avatar";
import { RoleSelect } from "./RoleSelect";
import { InviteTeacher, RevokeInvite } from "./InviteTeacher";
import { DeleteUserButton } from "./AccountAdmin";
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
  const [{ data }, { data: invites }] = await Promise.all([
    query.returns<Profile[]>(),
    supabase.from("teacher_invites").select("email, role, created_at").order("created_at", { ascending: false }).returns<{ email: string; role: string; created_at: string }[]>(),
  ]);

  return (
    <>
      <PageHeader
        title="Utenti e ruoli"
        description="Invita i docenti con la loro email: appena si registrano (anche con Google) hanno l'area docenti. Puoi anche cambiare il ruolo di chi è già iscritto."
      />

      <section className="panel mb-10 p-6">
        <h2 className="text-[19px] font-semibold">Aggiungi un docente</h2>
        <p className="mt-1 mb-5 text-[15px] text-slate">
          Usa l&apos;indirizzo con cui accederà, per esempio il suo account Google. Se è già registrato diventa docente subito.
        </p>
        <InviteTeacher />
        {invites && invites.length > 0 && (
          <div className="mt-6">
            <h3 className="text-[14px] font-semibold text-slate">Inviti in attesa di registrazione</h3>
            <ul className="mt-2 divide-y divide-line-soft">
              {invites.map((i) => (
                <li key={i.email} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{i.email}</p>
                    <p className="text-[14px] text-mute">
                      {i.role === "admin" ? "Amministratore" : "Docente"} · invitato il {dateShort(i.created_at)}
                    </p>
                  </div>
                  <RevokeInvite email={i.email} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <form action="/docente/utenti" className="mb-5 flex gap-2">
        <label htmlFor="q" className="sr-only">Cerca</label>
        <input id="q" name="q" defaultValue={q} placeholder="Cerca per nome o email" className="field min-w-0 flex-1 py-2 sm:max-w-xs" />
        <button className="btn-secondary btn-sm shrink-0">Cerca</button>
      </form>
      <ul className="panel divide-y divide-line-soft overflow-hidden">
        {(data ?? []).map((p) => (
          <li key={p.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={p.full_name} email={p.email} url={p.avatar_url} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-medium">{p.full_name || "Senza nome"}</p>
                <p className="truncate text-[14px] text-mute">
                  {p.email} · dal {dateShort(p.created_at)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pl-11 sm:justify-end sm:pl-0">
              {p.is_super ? (
                <span className="rounded-full bg-ink px-2.5 py-1 text-[13px] font-medium text-white">Super amministratore{p.id === user.id ? " (tu)" : ""}</span>
              ) : p.id === user.id ? (
                <span className="text-[14px] text-slate">Amministratore (tu)</span>
              ) : (
                <RoleSelect userId={p.id} role={p.role} />
              )}
              {p.id !== user.id && !p.is_super && <DeleteUserButton userId={p.id} name={p.full_name || p.email} isStaff={p.role !== "student"} />}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

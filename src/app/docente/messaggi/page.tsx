import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { requireStaff } from "@/lib/auth";
import { relative } from "@/lib/format";
import type { Message, Profile } from "@/lib/types";

export const metadata = { title: "Messaggi" };

export default async function MessaggiDocente() {
  const { supabase, user } = await requireStaff();
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1000)
    .returns<Message[]>();

  const threads = new Map<string, { last: Message; unread: number }>();
  for (const m of messages ?? []) {
    const t = threads.get(m.student_id);
    const isUnread = m.sender_id !== user.id && !m.read_at ? 1 : 0;
    if (!t) threads.set(m.student_id, { last: m, unread: isUnread });
    else t.unread += isUnread;
  }

  const ids = [...threads.keys()];
  const { data: people } = ids.length
    ? await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", ids).returns<Profile[]>()
    : { data: [] as Profile[] };

  const list = ids.map((id) => ({ ...threads.get(id)!, person: people?.find((p) => p.id === id) }));

  return (
    <>
      <PageHeader
        title="Messaggi"
        description="Le conversazioni con i tuoi discenti. Per scrivere a un nuovo discente aprilo da Discenti."
        actions={<Link href="/docente/discenti" className="btn-secondary">Scrivi a un discente</Link>}
      />
      {!list.length ? (
        <EmptyState title="Nessuna conversazione" body="Quando un discente ti scrive, la conversazione compare qui e ricevi un'email." />
      ) : (
        <ul className="divide-y divide-line-soft rounded-[var(--radius-panel)] bg-surface shadow-[var(--shadow-card)]">
          {list.map(({ last, unread, person }) => (
            <li key={last.student_id}>
              <Link href={`/docente/messaggi/${last.student_id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper">
                <Avatar name={person?.full_name ?? ""} email={person?.email} url={person?.avatar_url} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={`truncate ${unread ? "font-semibold" : "font-medium"}`}>{person?.full_name || person?.email}</p>
                    <span className="shrink-0 text-sm text-mute">{relative(last.created_at)}</span>
                  </div>
                  <p className={`truncate text-[15px] ${unread ? "text-ink" : "text-slate"}`}>
                    {last.sender_id === user.id ? "Tu: " : ""}
                    {last.body}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="min-w-6 rounded-full bg-ceralacca px-2 text-center text-sm font-semibold leading-6 text-white tabular-nums">{unread}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

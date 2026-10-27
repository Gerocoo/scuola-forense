import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { requireUser } from "@/lib/auth";
import { relative } from "@/lib/format";
import type { Message, Profile } from "@/lib/types";

export const metadata = { title: "Messaggi" };

export default async function MessaggiPage() {
  const { supabase, user } = await requireUser();

  const [{ data: teachers }, { data: messages }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, avatar_url, bio, role").in("role", ["teacher", "admin"]).order("full_name").returns<Profile[]>(),
    supabase.from("messages").select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(500).returns<Message[]>(),
  ]);

  const last = new Map<string, Message>();
  const unread = new Map<string, number>();
  for (const m of messages ?? []) {
    if (!last.has(m.teacher_id)) last.set(m.teacher_id, m);
    if (m.sender_id !== user.id && !m.read_at) unread.set(m.teacher_id, (unread.get(m.teacher_id) ?? 0) + 1);
  }

  const list = [...(teachers ?? [])].sort((a, b) => {
    const la = last.get(a.id)?.created_at ?? "";
    const lb = last.get(b.id)?.created_at ?? "";
    return lb.localeCompare(la);
  });

  return (
    <>
      <PageHeader
        title="Messaggi"
        description="Scrivi ai docenti per dubbi sulle tracce o sulle correzioni. Rispondono di norma entro due giorni lavorativi."
      />
      {!list.length ? (
        <EmptyState title="Nessun docente disponibile" body="I docenti compariranno qui appena attivati dalla segreteria." />
      ) : (
        <ul className="divide-y divide-line-soft rounded-[var(--radius-panel)] border border-line bg-surface">
          {list.map((t) => {
            const m = last.get(t.id);
            const n = unread.get(t.id) ?? 0;
            return (
              <li key={t.id}>
                <Link href={`/area/messaggi/${t.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper">
                  <Avatar name={t.full_name} email={t.email} url={t.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={`truncate ${n ? "font-semibold" : "font-medium"}`}>{t.full_name || t.email}</p>
                      {m && <span className="shrink-0 text-sm text-mute">{relative(m.created_at)}</span>}
                    </div>
                    <p className={`truncate text-[15px] ${n ? "text-ink" : "text-slate"}`}>
                      {m ? `${m.sender_id === user.id ? "Tu: " : ""}${m.body}` : t.bio || "Nessun messaggio"}
                    </p>
                  </div>
                  {n > 0 && (
                    <span className="min-w-6 rounded-full bg-ceralacca px-2 text-center text-sm font-semibold leading-6 text-white tabular-nums">
                      {n}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

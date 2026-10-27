import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { requireStaff } from "@/lib/auth";
import { dateShort, dateTime, KIND_LABEL, relative } from "@/lib/format";
import type { Assignment, Lesson, Message, Profile } from "@/lib/types";

export const metadata = { title: "Area docenti" };

type Row = Assignment & { student: Pick<Profile, "full_name" | "email"> | null };

export default async function DocenteHome() {
  const { supabase, user, profile } = await requireStaff();
  const nowIso = new Date().toISOString();

  const [{ data: queue }, { data: lessons }, { data: inbox }, { count: students }] = await Promise.all([
    supabase
      .from("assignments")
      .select("*, student:profiles!assignments_student_id_fkey(full_name, email)")
      .in("status", ["consegnato", "in_correzione"])
      .order("submitted_at", { ascending: true })
      .limit(8)
      .returns<Row[]>(),
    supabase
      .from("lessons")
      .select("*")
      .eq("kind", "in_presenza")
      .gte("scheduled_at", nowIso)
      .order("scheduled_at")
      .limit(3)
      .returns<Lesson[]>(),
    supabase
      .from("messages")
      .select("*")
      .eq("teacher_id", user.id)
      .neq("sender_id", user.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<Message[]>(),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
  ]);

  const senderIds = [...new Set((inbox ?? []).map((m) => m.student_id))];
  const { data: senders } = senderIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", senderIds)
    : { data: [] as { id: string; full_name: string; email: string }[] };
  const nameOf = (id: string) => {
    const s = senders?.find((x) => x.id === id);
    return s?.full_name || s?.email || "Discente";
  };

  return (
    <>
      <PageHeader
        title={`Buongiorno ${profile.full_name.split(" ")[0] || ""}`.trim()}
        description={`${students ?? 0} discenti registrati sulla piattaforma.`}
        actions={<Link href="/docente/esercitazioni/nuova" className="btn-primary">Assegna una traccia</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="panel p-6 lg:row-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Da correggere</h2>
            <Link href="/docente/esercitazioni?stato=da-correggere" className="text-sm text-slate hover:text-ink">Tutte</Link>
          </div>
          {queue?.length ? (
            <ul className="mt-4 divide-y divide-line-soft">
              {queue.map((a) => (
                <li key={a.id}>
                  <Link href={`/docente/esercitazioni/${a.id}`} className="flex items-center justify-between gap-4 py-3 hover:text-codice">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.student?.full_name || a.student?.email}</p>
                      <p className="truncate text-sm text-mute">
                        {KIND_LABEL[a.kind]}: {a.title}
                      </p>
                    </div>
                    <span className={`shrink-0 text-sm ${a.status === "in_correzione" ? "text-ambra" : "text-slate"}`}>
                      {a.status === "in_correzione" ? "In correzione" : `Consegnato ${a.submitted_at ? dateShort(a.submitted_at) : ""}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[15px] text-slate">Nessun elaborato in attesa. Ottimo lavoro.</p>
          )}
        </section>

        <section className="panel p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Messaggi non letti</h2>
            <Link href="/docente/messaggi" className="text-sm text-slate hover:text-ink">Tutti</Link>
          </div>
          {inbox?.length ? (
            <ul className="mt-4 space-y-3">
              {inbox.map((m) => (
                <li key={m.id}>
                  <Link href={`/docente/messaggi/${m.student_id}`} className="block hover:text-codice">
                    <span className="flex justify-between gap-3">
                      <span className="font-medium">{nameOf(m.student_id)}</span>
                      <span className="text-sm text-mute">{relative(m.created_at)}</span>
                    </span>
                    <span className="line-clamp-1 text-[15px] text-slate">{m.body}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[15px] text-slate">Nessun messaggio da leggere.</p>
          )}
        </section>

        <section className="panel p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Prossimi incontri</h2>
            <Link href="/docente/lezioni/nuova?tipo=in_presenza" className="text-sm text-slate hover:text-ink">Aggiungi</Link>
          </div>
          {lessons?.length ? (
            <ul className="mt-4 space-y-3">
              {lessons.map((l) => (
                <li key={l.id}>
                  <Link href={`/docente/lezioni/${l.id}`} className="block hover:text-codice">
                    <span className="font-medium text-codice">{dateTime(l.scheduled_at)}</span>
                    <span className="block text-[15px]">{l.title}{l.published ? "" : " (bozza)"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[15px] text-slate">Nessun incontro in calendario.</p>
          )}
        </section>
      </div>
    </>
  );
}

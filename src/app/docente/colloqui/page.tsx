import { PageHeader } from "@/components/app/AppShell";
import { MeetingCard, MeetingScheduleForm, type MeetingView } from "@/components/app/Meetings";
import { requireStaff } from "@/lib/auth";
import { myCourseIds } from "@/lib/courses";
import { loadMeetings } from "@/lib/meetings";

export const metadata = { title: "Colloqui" };

type Props = { searchParams: Promise<{ discente?: string }> };

function Section({ title, items, meId, empty }: { title: string; items: MeetingView[]; meId: string; empty?: string }) {
  if (!items.length && !empty) return null;
  return (
    <section>
      <h2 className="mb-3 text-[19px] font-semibold">{title}</h2>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((m) => (
            <MeetingCard key={m.id} m={m} meId={meId} staff />
          ))}
        </ul>
      ) : (
        <p className="panel p-5 text-[15px] text-slate">{empty}</p>
      )}
    </section>
  );
}

export default async function ColloquiDocente({ searchParams }: Props) {
  const { discente } = await searchParams;
  const { supabase, user, profile } = await requireStaff();
  const isAdmin = profile.role === "admin" || !!profile.is_super;

  // discenti dei miei corsi (gli amministratori vedono tutti)
  const ids = await myCourseIds(supabase, profile);
  const now = new Date().toISOString();
  const { data: enr } = ids.length
    ? await supabase
        .from("enrollments")
        .select("ends_at, user:profiles!enrollments_user_id_fkey(id, full_name, email, role)")
        .in("package_id", ids)
        .eq("status", "active")
    : { data: [] };
  const map = new Map<string, string>();
  for (const e of (enr ?? []) as unknown as { ends_at: string | null; user: { id: string; full_name: string | null; email: string; role: string } | null }[]) {
    if (!e.user || e.user.role !== "student" || (e.ends_at && e.ends_at < now)) continue;
    map.set(e.user.id, e.user.full_name || e.user.email);
  }
  const students = [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));

  const { toHandle, upcoming, past } = await loadMeetings(supabase, user.id, "teacher");

  return (
    <>
      <PageHeader
        title="Colloqui"
        description="Richieste dei discenti e colloqui individuali. Proponi un orario: il discente lo conferma o ne propone un altro."
      />
      <div className="space-y-8">
        <Section title="Da gestire" items={toHandle} meId={user.id} />
        <Section title="In programma" items={upcoming} meId={user.id} empty={toHandle.length ? undefined : "Nessun colloquio in programma."} />
        <details className="panel p-5 sm:p-6" open={!!discente}>
          <summary className="cursor-pointer text-[17px] font-semibold">Fissa un colloquio con un discente</summary>
          <div className="mt-4">
            {students.length ? (
              <MeetingScheduleForm students={students} defaultStudent={discente && map.has(discente) ? discente : undefined} />
            ) : (
              <p className="text-[15px] text-slate">{isAdmin ? "Nessun discente con un corso attivo." : "Non ci sono ancora discenti iscritti ai tuoi corsi."}</p>
            )}
          </div>
        </details>
        <Section title="Passati e annullati" items={past.slice(0, 20)} meId={user.id} />
      </div>
    </>
  );
}

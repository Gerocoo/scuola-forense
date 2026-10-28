import { PageHeader } from "@/components/app/AppShell";
import { MeetingCard, MeetingRequestForm, type MeetingView } from "@/components/app/Meetings";
import { requireUser } from "@/lib/auth";
import { loadMeetings } from "@/lib/meetings";

export const metadata = { title: "Colloqui" };

function Section({ title, items, meId, empty }: { title: string; items: MeetingView[]; meId: string; empty?: string }) {
  if (!items.length && !empty) return null;
  return (
    <section>
      <h2 className="mb-3 text-[19px] font-semibold">{title}</h2>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((m) => (
            <MeetingCard key={m.id} m={m} meId={meId} staff={false} />
          ))}
        </ul>
      ) : (
        <p className="panel p-5 text-[15px] text-slate">{empty}</p>
      )}
    </section>
  );
}

export default async function ColloquiDiscente() {
  const { supabase, user } = await requireUser();
  const [{ toHandle, upcoming, past }, { data: teachers }] = await Promise.all([
    loadMeetings(supabase, user.id, "student"),
    supabase.from("profiles").select("id, full_name, email").in("role", ["teacher", "admin"]).order("full_name"),
  ]);
  return (
    <>
      <PageHeader
        title="Colloqui"
        description="Chiedi un colloquio individuale a un docente. Riceverai una proposta di orario: puoi confermarla o proporne un'altra in base ai tuoi impegni."
      />
      <div className="space-y-8">
        <Section title="Da confermare" items={toHandle} meId={user.id} />
        <Section title="In programma" items={upcoming} meId={user.id} empty={toHandle.length ? undefined : "Nessun colloquio in programma."} />
        <details className="panel p-5 sm:p-6" open={!toHandle.length && !upcoming.length}>
          <summary className="cursor-pointer text-[17px] font-semibold">Chiedi un colloquio</summary>
          <div className="mt-4">
            <MeetingRequestForm teachers={(teachers ?? []).map((t: { id: string; full_name: string | null; email: string }) => ({ id: t.id, name: t.full_name || t.email }))} />
          </div>
        </details>
        <Section title="Passati e annullati" items={past.slice(0, 20)} meId={user.id} />
      </div>
    </>
  );
}

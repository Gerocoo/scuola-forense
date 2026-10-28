import { PageHeader } from "@/components/app/AppShell";
import { DeleteSlot, QuestionForm, QuestionRow, SlotForm } from "./OralAdmin";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "Orale" };

const TZ = "Europe/Rome";
const when = (iso: string) =>
  new Date(iso).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ });

export default async function OraleDocente() {
  const { supabase, user, profile } = await requireStaff();
  const isAdmin = profile.role === "admin" || !!profile.is_super;
  const now = new Date().toISOString();

  let slotQuery = supabase
    .from("oral_slots")
    .select("id, starts_at, duration_min, meeting_url, booked_by, teacher_id, student:profiles!oral_slots_booked_by_fkey(full_name, email), teacher:profiles!oral_slots_teacher_id_fkey(full_name)")
    .gte("starts_at", now)
    .order("starts_at")
    .limit(100);
  if (!isAdmin) slotQuery = slotQuery.eq("teacher_id", user.id);

  const [{ data: slots }, { data: questions }] = await Promise.all([
    slotQuery.returns<
      { id: string; starts_at: string; duration_min: number; meeting_url: string | null; booked_by: string | null; teacher_id: string; student: { full_name: string; email: string } | null; teacher: { full_name: string } | null }[]
    >(),
    supabase.from("quiz_questions").select("id, topic, question, options, correct, explanation").order("topic").order("created_at"),
  ]);

  const booked = (slots ?? []).filter((s) => s.booked_by).length;

  return (
    <>
      <PageHeader title="Orale" description="Orari per le simulazioni d'orale in videochiamata e domande del quiz su deontologia, ordinamento e previdenza." />

      <div className="space-y-8">
        <section className="panel p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[19px] font-semibold">Simulazioni d&apos;orale</h2>
            <span className="text-[14px] text-mute">{booked} prenotate su {(slots ?? []).length} in programma</span>
          </div>
          <div className="mt-4">
            <SlotForm />
          </div>
          {(slots ?? []).length > 0 && (
            <ul className="mt-6 divide-y divide-line-soft rounded-[14px] border border-line">
              {(slots ?? []).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium capitalize">
                      {when(s.starts_at)} <span className="font-normal text-slate">· {s.duration_min} min</span>
                    </p>
                    <p className="text-[14px] text-slate">
                      {s.booked_by ? (
                        <span className="font-medium text-codice">Prenotato da {s.student?.full_name || s.student?.email}</span>
                      ) : (
                        "Libero"
                      )}
                      {isAdmin && s.teacher_id !== user.id && ` · ${s.teacher?.full_name ?? "docente"}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.meeting_url && (
                      <a href={s.meeting_url} target="_blank" rel="noopener" className="btn-secondary btn-sm">Apri il collegamento</a>
                    )}
                    <DeleteSlot id={s.id} booked={!!s.booked_by} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel overflow-hidden">
          <div className="p-5 sm:p-6">
            <h2 className="text-[19px] font-semibold">Domande del quiz</h2>
            <p className="mt-1 text-[15px] text-slate">
              I discenti ne ricevono 10 a caso per volta. Le prime dieci sono di esempio: verificale e aggiungine altre.
            </p>
            <div className="mt-4 rounded-[14px] bg-paper p-4">
              <QuestionForm />
            </div>
          </div>
          <ul className="divide-y divide-line-soft border-t border-line-soft">
            {(questions ?? []).map((q: { id: string; topic: string; question: string; options: string[]; correct: number; explanation: string }) => (
              <QuestionRow key={q.id} q={q} />
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

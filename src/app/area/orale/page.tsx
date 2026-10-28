import { PageHeader } from "@/components/app/AppShell";
import { QuizRunner, SlotButton, type QuizQuestion } from "./OralClient";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Orale" };

const TZ = "Europe/Rome";
const day = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
const hour = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

export default async function OralePage() {
  const { supabase, user } = await requireUser();
  const now = new Date().toISOString();
  const until = new Date(Date.now() + 45 * 86400000).toISOString();

  const [{ data: questions }, { data: slots }, { data: attempts }] = await Promise.all([
    supabase.from("quiz_questions").select("id, topic, question, options, correct, explanation").eq("active", true).returns<QuizQuestion[]>(),
    supabase
      .from("oral_slots")
      .select("id, starts_at, duration_min, meeting_url, booked_by, teacher:profiles!oral_slots_teacher_id_fkey(full_name)")
      .gte("starts_at", now)
      .lte("starts_at", until)
      .order("starts_at")
      .returns<{ id: string; starts_at: string; duration_min: number; meeting_url: string | null; booked_by: string | null; teacher: { full_name: string } | null }[]>(),
    supabase.from("quiz_attempts").select("score, total, topic, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const mine = (slots ?? []).filter((s) => s.booked_by === user.id);
  const free = (slots ?? []).filter((s) => !s.booked_by);
  const byDay = new Map<string, typeof free>();
  for (const s of free) byDay.set(day(s.starts_at), [...(byDay.get(day(s.starts_at)) ?? []), s]);

  return (
    <>
      <PageHeader
        title="Orale"
        description="All'orale c'è un caso pratico, tre quesiti e una domanda su ordinamento, deontologia e previdenza forense. Allenati con i quiz e prenota una simulazione con un docente."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="panel p-5 sm:p-6">
          <h2 className="text-[19px] font-semibold">Quiz: deontologia, ordinamento e previdenza</h2>
          <div className="mt-4">
            <QuizRunner questions={questions ?? []} />
          </div>
          {(attempts ?? []).length > 0 && (
            <div className="mt-6 border-t border-line-soft pt-4">
              <p className="text-[14px] font-medium text-slate">Ultimi risultati</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {(attempts ?? []).map((a: { score: number; total: number; topic: string | null; created_at: string }, i: number) => (
                  <li key={i} className={`rounded-full px-3 py-1 text-[14px] tabular-nums ${a.score / a.total >= 0.6 ? "bg-codice-soft text-codice" : "bg-ceralacca-soft text-ceralacca"}`}>
                    {a.score}/{a.total}
                    <span className="ml-1 capitalize text-slate">{a.topic ?? "misto"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="text-[19px] font-semibold">Simulazione d&apos;orale</h2>
          <p className="mt-1 text-[15px] text-slate">Un colloquio in videochiamata con un docente, nelle condizioni dell&apos;esame.</p>

          {mine.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[14px] font-semibold text-codice">Le tue prenotazioni</p>
              {mine.map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-3 rounded-[14px] bg-codice-soft p-3">
                  <div className="min-w-0 text-[15px]">
                    <p className="font-semibold capitalize">{day(s.starts_at)}</p>
                    <p className="text-slate">
                      {hour(s.starts_at)} · {s.duration_min} min · {s.teacher?.full_name ?? "Docente"}
                    </p>
                    {s.meeting_url && (
                      <a href={s.meeting_url} target="_blank" rel="noopener" className="link text-[14px]">Link al collegamento</a>
                    )}
                  </div>
                  <SlotButton id={s.id} booked />
                </div>
              ))}
            </div>
          )}

          <div className="mt-5">
            <p className="text-[14px] font-semibold text-slate">Orari disponibili</p>
            {byDay.size ? (
              <div className="mt-2 space-y-4">
                {[...byDay.entries()].map(([d, list]) => (
                  <div key={d}>
                    <p className="text-[14px] font-medium capitalize">{d}</p>
                    <ul className="mt-1 divide-y divide-line-soft rounded-[14px] border border-line">
                      {list.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <span className="text-[15px]">
                            <strong className="tabular-nums">{hour(s.starts_at)}</strong>
                            <span className="text-slate"> · {s.duration_min} min · {s.teacher?.full_name ?? "Docente"}</span>
                          </span>
                          <SlotButton id={s.id} booked={false} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[15px] text-slate">Al momento non ci sono orari liberi. I docenti ne aggiungono di nuovi ogni settimana.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

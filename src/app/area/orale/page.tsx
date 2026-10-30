import { PageHeader } from "@/components/app/AppShell";
import { QuizRunner, SlotButton, type QuizQuestion } from "./OralClient";
import { requireUser } from "@/lib/auth";
import { oralState, ORAL_SLUG } from "@/lib/oral";
import { CheckoutForm } from "@/components/site/CheckoutForm";
import { euro } from "@/lib/format";
import Link from "next/link";

export const metadata = { title: "Orale" };

const TZ = "Europe/Rome";
const day = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
const hour = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

type Props = { searchParams: Promise<{ errore?: string; consenso?: string; requisito?: string }> };

export default async function OralePage({ searchParams }: Props) {
  const { supabase, user } = await requireUser();
  const st = await oralState(supabase, user.id);
  if (!st.access) return <OralLocked st={st} q={await searchParams} />;
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

function OralLocked({ st, q }: { st: Awaited<ReturnType<typeof oralState>>; q: { errore?: string; consenso?: string; requisito?: string } }) {
  return (
    <>
      <PageHeader title="Orale" description="Simulazioni d'orale individuali con i docenti e quiz di deontologia, ordinamento e previdenza forense." />
      <section className="panel mx-auto max-w-2xl overflow-hidden">
        <div className="bg-codice-deep p-6 text-white sm:p-8">
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-white/10" aria-hidden>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          </span>
          <h2 className="mt-4 text-[22px] font-semibold leading-snug">
            {!st.open ? "L'Orale è momentaneamente chiuso" : st.taken ? "Sblocca il modulo Orale" : "Riservato a chi ha frequentato un corso"}
          </h2>
          <p className="mt-2 text-[16px] leading-relaxed text-white/80">
            {!st.open
              ? "Stiamo preparando le simulazioni d'orale. Riaprirà a breve per chi ha frequentato uno dei nostri corsi: ti avviseremo."
              : st.taken
                ? "Hai già frequentato un corso: puoi aggiungere le simulazioni d'orale individuali con i docenti e i quiz di allenamento."
                : "Il modulo Orale si sblocca dopo aver frequentato uno dei nostri corsi per la prova scritta."}
          </p>
        </div>
        <div className="space-y-4 p-6 sm:p-8">
          <ul className="space-y-2 text-[15px] text-slate">
            <li>• Simulazioni individuali in videochiamata, come davanti alla commissione</li>
            <li>• Quiz su deontologia, ordinamento e previdenza forense</li>
            <li>• Domande aggiornate dai docenti</li>
          </ul>
          {q.requisito && <p role="alert" className="text-[14px] text-ceralacca">Per acquistare il modulo serve aver frequentato un corso.</p>}
          {q.consenso && <p role="alert" className="text-[14px] text-ceralacca">Per procedere conferma la richiesta di accesso immediato ai contenuti.</p>}
          {q.errore && <p role="alert" className="text-[14px] text-ceralacca">Il pagamento non è partito. Riprova tra qualche minuto.</p>}
          {st.open && st.taken && st.price != null ? (
            <div className="max-w-sm">
              <CheckoutForm slug={ORAL_SLUG} label={<>Sblocca l&apos;Orale · {euro(st.price)}</>} />
            </div>
          ) : (
            !st.taken && (
              <Link href="/#corsi" className="btn-primary">
                Scopri i corsi
              </Link>
            )
          )}
        </div>
      </section>
    </>
  );
}

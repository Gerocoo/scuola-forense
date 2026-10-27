import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/AppShell";
import { LessonView } from "@/components/app/LessonView";
import { StatusBadge } from "@/components/app/StatusBadge";
import { LessonStrip, type StripItem } from "@/components/app/LessonStrip";
import { BookingBox } from "./BookingBox";
import { requireUser } from "@/lib/auth";
import { bunnyConfigured, embedUrl } from "@/lib/bunny";
import { googleCalendarUrl } from "@/lib/calendar";
import { loadPath, DONE_STATUSES } from "@/lib/progress";
import { siteUrl } from "@/lib/stripe";
import { thumbnailFor } from "@/lib/video";
import type { Lesson, StoredFile } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function LezionePage({ params }: Props) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", id).maybeSingle<Lesson>();
  if (!lesson) notFound();

  const live = lesson.kind === "in_presenza";
  const path = live ? [] : await loadPath(supabase, user.id);
  const step = path.find((s) => s.lesson.id === lesson.id) ?? null;
  const strip: StripItem[] = path.map((s) => ({
    id: s.lesson.id,
    title: s.lesson.title,
    index: s.index,
    thumb: thumbnailFor(s.lesson),
    percent: s.percent,
    completed: s.completed,
    unlocked: s.unlocked,
    current: s.lesson.id === lesson.id,
  }));
  const stripEl = strip.length > 1 ? <LessonStrip items={strip} /> : null;

  /* ---------- lezione ancora bloccata ---------- */
  if (step && !step.unlocked) {
    const prev = step.blockedBy;
    const pendingEx = prev ? prev.exercises.filter((e) => !DONE_STATUSES.includes(e.status)) : [];
    return (
      <>
        {stripEl}
        <PageHeader back={{ href: "/area/lezioni", label: "Percorso" }} title={lesson.title} description={`Lezione ${step.index + 1}`} />
        <section className="panel mx-auto max-w-xl p-8 text-center">
          <span aria-hidden className="mx-auto grid size-16 place-items-center rounded-full bg-paper">
            <svg viewBox="0 0 24 24" className="size-7 text-slate"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
          </span>
          <h2 className="mt-5 text-[22px] font-semibold">Questa lezione si sblocca dopo la precedente</h2>
          {prev && (
            <div className="mt-4 text-left text-[15px] text-slate">
              <p>
                Completa prima <strong className="text-ink">{prev.lesson.title}</strong>:
              </p>
              <ul className="mt-3 space-y-2">
                <li className="flex items-center justify-between gap-3 rounded-[12px] bg-paper px-4 py-2.5">
                  <span>Guarda il video per intero</span>
                  <span className={`font-semibold tabular-nums ${prev.videoDone ? "text-codice" : "text-ink"}`}>{prev.videoDone ? "Fatto" : `${prev.percent}%`}</span>
                </li>
                {prev.exercises.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-paper px-4 py-2.5">
                    <Link href={`/area/esercitazioni/${e.id}`} className="truncate hover:text-codice">Consegna: {e.title}</Link>
                    <span className={`font-semibold ${DONE_STATUSES.includes(e.status) ? "text-codice" : "text-ink"}`}>
                      {DONE_STATUSES.includes(e.status) ? "Fatto" : "Da fare"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link href={prev ? `/area/lezioni/${prev.lesson.id}` : "/area/lezioni"} className="btn-primary mt-7">
            {prev && !prev.videoDone ? "Vai al video" : pendingEx.length ? "Vai all'esercitazione" : "Torna al percorso"}
          </Link>
        </section>
      </>
    );
  }

  const [{ data: files }, { data: booking }, { data: taken }, { data: note }] = await Promise.all([
    supabase.from("lesson_files").select("*").eq("lesson_id", id).order("created_at").returns<StoredFile[]>(),
    live && lesson.booking_enabled
      ? supabase.from("lesson_bookings").select("status").eq("lesson_id", id).eq("user_id", user.id).maybeSingle<{ status: string }>()
      : Promise.resolve({ data: null }),
    live && lesson.booking_enabled ? supabase.rpc("lesson_seats_taken", { lid: id }) : Promise.resolve({ data: 0 }),
    supabase
      .from("lesson_notes")
      .select("body, updated_at")
      .eq("lesson_id", id)
      .eq("user_id", user.id)
      .maybeSingle<{ body: string; updated_at: string }>(),
  ]);

  const bunny = lesson.bunny_video_id && lesson.video_status === "ready" && bunnyConfigured() ? embedUrl(lesson.bunny_video_id) : null;
  const past = !!(lesson.scheduled_at && new Date(lesson.scheduled_at) < new Date());
  const pageUrl = `${siteUrl()}/area/lezioni/${lesson.id}`;
  const gcal = live ? googleCalendarUrl(lesson, pageUrl) : null;

  const aside = live ? (
    <>
      {lesson.booking_enabled && (
        <BookingBox lessonId={lesson.id} booked={booking?.status === "confermato"} capacity={lesson.capacity} taken={Number(taken ?? 0)} past={past} />
      )}
      {!past && (
        <div className="panel space-y-2 p-5">
          <h2 className="font-semibold">Aggiungi al tuo calendario</h2>
          <div className="flex flex-wrap gap-2">
            {gcal && <a href={gcal} target="_blank" rel="noopener" className="btn-secondary btn-sm">Google Calendar</a>}
            <a href={`/api/calendario/${lesson.id}`} className="btn-secondary btn-sm">Apple o Outlook (.ics)</a>
          </div>
        </div>
      )}
    </>
  ) : step && step.exercises.length > 0 ? (
    <>
      {(
        <div className="panel p-5">
          <h2 className="font-semibold">Esercitazioni della lezione</h2>
          <p className="mt-1 text-[13px] text-mute">Vanno consegnate per sbloccare la lezione successiva.</p>
          <ul className="mt-3 space-y-2">
            {step.exercises.map((e) => (
              <li key={e.id}>
                <Link href={`/area/esercitazioni/${e.id}`} className="flex items-center justify-between gap-3 rounded-[12px] bg-paper px-3 py-2 hover:bg-codice-soft">
                  <span className="truncate text-[14px] font-medium">{e.title}</span>
                  <StatusBadge status={e.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  ) : null;

  return (
    <>
      {stripEl}
      <PageHeader
        back={{ href: "/area/lezioni", label: live ? "Lezioni" : "Percorso" }}
        title={lesson.title}
        description={live ? (past ? "Incontro in presenza, già svolto" : "Incontro in presenza") : step ? `Lezione ${step.index + 1} di ${path.length}` : "Lezione registrata"}
      />
      <LessonView
        lesson={lesson}
        files={files ?? []}
        bunnyEmbed={bunny}
        aside={aside}
        notes={note ?? undefined}
        progress={step ? { buckets: step.buckets, percent: step.percent, position: step.position, completed: step.videoDone } : undefined}
      />
    </>
  );
}

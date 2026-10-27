import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/AppShell";
import { LessonView } from "@/components/app/LessonView";
import { BookingBox } from "./BookingBox";
import { requireUser } from "@/lib/auth";
import { bunnyConfigured, embedUrl } from "@/lib/bunny";
import { googleCalendarUrl } from "@/lib/calendar";
import { siteUrl } from "@/lib/stripe";
import type { Lesson, StoredFile } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function LezionePage({ params }: Props) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", id).maybeSingle<Lesson>();
  if (!lesson) notFound();

  const live = lesson.kind === "in_presenza";
  const [{ data: files }, { data: booking }, { data: taken }] = await Promise.all([
    supabase.from("lesson_files").select("*").eq("lesson_id", id).order("created_at").returns<StoredFile[]>(),
    live && lesson.booking_enabled
      ? supabase.from("lesson_bookings").select("status").eq("lesson_id", id).eq("user_id", user.id).maybeSingle<{ status: string }>()
      : Promise.resolve({ data: null }),
    live && lesson.booking_enabled ? supabase.rpc("lesson_seats_taken", { lid: id }) : Promise.resolve({ data: 0 }),
  ]);

  const bunny = lesson.bunny_video_id && lesson.video_status === "ready" && bunnyConfigured() ? embedUrl(lesson.bunny_video_id) : null;
  const past = !!(lesson.scheduled_at && new Date(lesson.scheduled_at) < new Date());
  const pageUrl = `${siteUrl()}/area/lezioni/${lesson.id}`;
  const gcal = live ? googleCalendarUrl(lesson, pageUrl) : null;

  const aside =
    live ? (
      <>
        {lesson.booking_enabled && (
          <BookingBox
            lessonId={lesson.id}
            booked={booking?.status === "confermato"}
            capacity={lesson.capacity}
            taken={Number(taken ?? 0)}
            past={past}
          />
        )}
        {!past && (
          <div className="panel space-y-2 p-5">
            <h2 className="font-semibold">Aggiungi al tuo calendario</h2>
            <div className="flex flex-wrap gap-2">
              {gcal && (
                <a href={gcal} target="_blank" rel="noopener" className="btn-secondary btn-sm">Google Calendar</a>
              )}
              <a href={`/api/calendario/${lesson.id}`} className="btn-secondary btn-sm">Apple o Outlook (.ics)</a>
            </div>
          </div>
        )}
      </>
    ) : null;

  return (
    <>
      <PageHeader
        back={{ href: "/area/lezioni", label: "Lezioni" }}
        title={lesson.title}
        description={live ? (past ? "Incontro in presenza, già svolto" : "Incontro in presenza") : "Lezione registrata"}
      />
      <LessonView lesson={lesson} files={files ?? []} bunnyEmbed={bunny} aside={aside} />
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Avatar";
import { LessonForm } from "../LessonForm";
import { LessonFiles } from "./LessonFiles";
import { VideoUploader } from "./VideoUploader";
import { requireStaff } from "@/lib/auth";
import { bunnyConfigured, embedUrl } from "@/lib/bunny";
import { dateShort, dateTime, toLocalInput } from "@/lib/format";
import type { Lesson, Package, StoredFile } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

type BookingRow = { id: string; status: string; created_at: string; user: { id: string; full_name: string; email: string; avatar_url: string | null } | null };

export default async function ModificaLezione({ params }: Props) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const [{ data: lesson }, { data: packages }, { data: files }, { data: bookings }] = await Promise.all([
    supabase.from("lessons").select("*").eq("id", id).maybeSingle<Lesson>(),
    supabase.from("packages").select("id, title, period_label").order("sort").returns<Pick<Package, "id" | "title" | "period_label">[]>(),
    supabase.from("lesson_files").select("*").eq("lesson_id", id).order("created_at").returns<StoredFile[]>(),
    supabase
      .from("lesson_bookings")
      .select("id, status, created_at, user:profiles(id, full_name, email, avatar_url)")
      .eq("lesson_id", id)
      .eq("status", "confermato")
      .order("created_at")
      .returns<BookingRow[]>(),
  ]);
  if (!lesson) notFound();

  const live = lesson.kind === "in_presenza";
  const past = live && lesson.scheduled_at && lesson.scheduled_at < new Date().toISOString();
  const preview = lesson.bunny_video_id && lesson.video_status === "ready" && bunnyConfigured() ? embedUrl(lesson.bunny_video_id) : null;

  return (
    <>
      <PageHeader
        back={{ href: "/docente/lezioni", label: "Lezioni" }}
        title={lesson.title}
        description={live ? dateTime(lesson.scheduled_at) : "Lezione registrata"}
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Per un incontro già svolto la cosa da fare è caricare la registrazione: va in cima */}
          {(!live || past || lesson.bunny_video_id) && (
            <VideoUploader
              lessonId={lesson.id}
              status={lesson.video_status}
              hasVideo={!!lesson.bunny_video_id}
              previewUrl={preview}
              configured={bunnyConfigured()}
              isRecording={live}
            />
          )}
          <LessonForm lesson={lesson} packages={packages ?? []} scheduledLocal={toLocalInput(lesson.scheduled_at)} />
        </div>

        <div className="space-y-6">
          {live && lesson.booking_enabled && (
            <section className="panel p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">Prenotati</h2>
                <span className="text-sm text-mute tabular-nums">
                  {bookings?.length ?? 0}
                  {lesson.capacity ? ` su ${lesson.capacity} posti` : ""}
                </span>
              </div>
              {bookings?.length ? (
                <ul className="mt-3 space-y-2">
                  {bookings.map((b) => (
                    <li key={b.id}>
                      <Link href={`/docente/discenti/${b.user?.id}`} className="flex items-center gap-3 hover:text-codice">
                        <Avatar name={b.user?.full_name ?? ""} email={b.user?.email} url={b.user?.avatar_url} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-[15px]">{b.user?.full_name || b.user?.email}</span>
                        <span className="text-[13px] text-mute">{dateShort(b.created_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate">Ancora nessuna prenotazione.</p>
              )}
              {!!bookings?.length && (
                <a
                  className="btn-ghost btn-sm mt-3 px-0"
                  href={`mailto:?bcc=${encodeURIComponent(bookings.map((b) => b.user?.email).filter(Boolean).join(","))}&subject=${encodeURIComponent(lesson.title)}`}
                >
                  Scrivi a tutti i prenotati
                </a>
              )}
            </section>
          )}
          {live && lesson.reminder_sent_at && (
            <p className="text-sm text-slate">Promemoria inviato il {dateTime(lesson.reminder_sent_at)}.</p>
          )}
          <LessonFiles lessonId={lesson.id} files={files ?? []} />
        </div>
      </div>
    </>
  );
}

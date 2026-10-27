import { FileList } from "./FileList";
import { LessonPlayer } from "./LessonPlayer";
import { dateTime } from "@/lib/format";
import { embedUrl as externalEmbed } from "@/lib/video";
import type { Lesson, StoredFile } from "@/lib/types";

/**
 * Pagina lezione lato discente.
 * `bunnyEmbed` è l'URL firmato del video caricato sulla piattaforma (vale anche per la registrazione di un incontro).
 * `aside` accoglie prenotazione e pulsanti calendario.
 */
export function LessonView({
  lesson,
  files,
  bunnyEmbed,
  aside,
  notes,
  progress,
}: {
  lesson: Lesson;
  files: StoredFile[];
  bunnyEmbed: string | null;
  aside?: React.ReactNode;
  notes?: { body: string; updated_at: string | null };
  progress?: { buckets: string; percent: number; position: number; completed: boolean };
}) {
  const external = externalEmbed(lesson.video_url);
  const hasVideo = !!bunnyEmbed || !!lesson.video_url;
  const live = lesson.kind === "in_presenza";

  const src = bunnyEmbed ?? external ?? lesson.video_url;

  return (
    <div className="space-y-10">
      {hasVideo && src && (
        <section aria-label={live ? "Registrazione dell'incontro" : "Video"}>
          {live && <h2 className="mb-3 text-lg font-semibold">Registrazione dell&apos;incontro</h2>}
          <LessonPlayer
            lessonId={lesson.id}
            title={lesson.title}
            src={src}
            initialNotes={notes?.body ?? ""}
            savedAt={notes?.updated_at ?? null}
            progress={progress}
          />
        </section>
      )}
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-8">
        {!hasVideo && !live && lesson.video_status === "processing" && (
          <p className="panel p-5 text-[15px] text-slate">Il video è in preparazione e sarà disponibile tra pochi minuti.</p>
        )}

        {lesson.summary && (
          <div className="prose-legal max-w-3xl">
            {lesson.summary.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Materiali</h2>
            <FileList files={files} kind="lezione" />
          </section>
        )}
      </div>

      {(live || aside) && (
        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          {live && (
            <dl className="panel divide-y divide-line-soft">
              <div className="p-4">
                <dt className="text-sm text-mute">Quando</dt>
                <dd className="mt-0.5 font-semibold text-codice">{dateTime(lesson.scheduled_at)}</dd>
              </div>
              {lesson.location && (
                <div className="p-4">
                  <dt className="text-sm text-mute">Dove</dt>
                  <dd className="mt-0.5 font-medium">{lesson.location}</dd>
                </div>
              )}
              {lesson.duration_min && (
                <div className="p-4">
                  <dt className="text-sm text-mute">Durata</dt>
                  <dd className="mt-0.5 font-medium">{lesson.duration_min} minuti</dd>
                </div>
              )}
              {lesson.meeting_url && (
                <div className="p-4">
                  <a href={lesson.meeting_url} target="_blank" rel="noopener" className="btn-primary w-full">Segui in diretta</a>
                </div>
              )}
            </dl>
          )}
          {aside}
        </aside>
      )}
    </div>
    </div>
  );
}

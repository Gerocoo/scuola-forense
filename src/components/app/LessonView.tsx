import { FileList } from "./FileList";
import { dateTime } from "@/lib/format";
import { embedUrl } from "@/lib/video";
import type { Lesson, StoredFile } from "@/lib/types";

export function LessonView({ lesson, files }: { lesson: Lesson; files: StoredFile[] }) {
  const embed = embedUrl(lesson.video_url);

  return (
    <div className="space-y-8">
      {lesson.kind === "registrata" && lesson.video_url && (
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-ink">
          {embed ? (
            <iframe
              src={embed}
              title={lesson.title}
              className="aspect-video w-full"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <video src={lesson.video_url} controls controlsList="nodownload" className="aspect-video w-full" preload="metadata" />
          )}
        </div>
      )}

      {lesson.kind === "in_presenza" && (
        <dl className="panel grid gap-6 p-6 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-mute">Quando</dt>
            <dd className="mt-1 font-semibold text-codice">{dateTime(lesson.scheduled_at)}</dd>
          </div>
          {lesson.location && (
            <div>
              <dt className="text-sm text-mute">Dove</dt>
              <dd className="mt-1 font-medium">{lesson.location}</dd>
            </div>
          )}
          {lesson.duration_min && (
            <div>
              <dt className="text-sm text-mute">Durata</dt>
              <dd className="mt-1 font-medium">{lesson.duration_min} minuti</dd>
            </div>
          )}
          {lesson.meeting_url && (
            <div className="sm:col-span-3">
              <a href={lesson.meeting_url} target="_blank" rel="noopener" className="btn-primary">Segui in diretta</a>
            </div>
          )}
        </dl>
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
  );
}

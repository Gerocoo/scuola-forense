"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Dropzone } from "@/components/app/Dropzone";
import { FileList } from "@/components/app/FileList";
import { uploadFile } from "@/lib/upload";
import { deleteLesson, registerLessonFile, removeLessonFile } from "@/app/docente/actions";
import type { StoredFile } from "@/lib/types";

export function LessonFiles({ lessonId, files }: { lessonId: string; files: StoredFile[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function handle(list: File[]) {
    setError(null);
    for (const f of list) {
      setUploading(f.name);
      try {
        const meta = await uploadFile(f, `lezioni/${lessonId}`);
        const res = await registerLessonFile(lessonId, meta);
        if (!res.ok) throw new Error(res.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Caricamento non riuscito.");
        break;
      }
    }
    setUploading(null);
    router.refresh();
  }

  return (
    <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
      <div className="panel space-y-3 p-5">
        <h2 className="font-semibold">Materiali</h2>
        <p className="text-sm text-slate">Slide, schemi e sentenze da scaricare insieme alla lezione.</p>
        <FileList
          files={files}
          kind="lezione"
          renderAction={(f) => (
            <button
              type="button"
              className="btn-ghost btn-sm text-ceralacca"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await removeLessonFile(f.id);
                  router.refresh();
                })
              }
            >
              Rimuovi
            </button>
          )}
        />
        <Dropzone onFiles={handle} disabled={!!uploading} label="Aggiungi materiali" />
        {uploading && <p role="status" className="text-sm text-slate">Caricamento di {uploading}…</p>}
        {error && <p role="alert" className="text-sm text-ceralacca">{error}</p>}
      </div>
      <button
        type="button"
        className="btn-danger btn-sm w-full"
        disabled={pending}
        onClick={() => {
          if (confirm("Eliminare la lezione e i suoi materiali?")) start(() => deleteLesson(lessonId));
        }}
      >
        Elimina lezione
      </button>
    </aside>
  );
}

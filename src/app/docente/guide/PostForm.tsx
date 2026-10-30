"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePost, savePost } from "@/app/actions/posts";

type Post = { id: string; title: string; slug: string; excerpt: string; body: string; published: boolean };

export function PostForm({ post }: { post?: Post }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-5"
      action={(fd) =>
        start(async () => {
          const res = await savePost(post?.id ?? null, fd);
          setMsg(res.ok ? { ok: true, text: res.message ?? "Salvato." } : { ok: false, text: res.error });
          if (res.ok && !post && res.id) router.replace(`/docente/guide/${res.id}`);
          router.refresh();
        })
      }
    >
      <div className="panel space-y-5 p-6">
        <div>
          <label className="label" htmlFor="title">Titolo</label>
          <input id="title" name="title" required defaultValue={post?.title} className="field text-[18px]" placeholder="Come si scrive un atto di appello penale" />
          <p className="hint">Usa le parole che un praticante cercherebbe su Google.</p>
        </div>
        <div>
          <label className="label" htmlFor="slug">Indirizzo</label>
          <input id="slug" name="slug" defaultValue={post?.slug} className="field" placeholder="si crea dal titolo" />
        </div>
        <div>
          <label className="label" htmlFor="excerpt">Sommario</label>
          <textarea id="excerpt" name="excerpt" rows={2} maxLength={400} defaultValue={post?.excerpt} className="field" placeholder="Due righe: compare su Google e nell'elenco delle guide." />
        </div>
        <div>
          <label className="label" htmlFor="body">Testo</label>
          <textarea id="body" name="body" rows={20} defaultValue={post?.body} className="field font-serif text-[17px] leading-relaxed" />
          <p className="hint">Riga vuota tra i paragrafi. «## » all&apos;inizio per un titolo di sezione, «- » per un elenco puntato.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-[15px] font-medium">
          <input type="checkbox" name="published" defaultChecked={post?.published ?? false} className="size-4 accent-codice" />
          Pubblicata
        </label>
        <button className="btn-primary" disabled={pending}>{pending ? "Salvataggio…" : "Salva"}</button>
        {post?.published && <a href={`/guide/${post.slug}`} target="_blank" className="btn-ghost btn-sm">Vedi nel sito</a>}
        {post && (
          <button
            type="button"
            className="btn-ghost btn-sm text-mute hover:text-ceralacca"
            onClick={() =>
              confirm("Eliminare la guida?") &&
              start(async () => {
                await deletePost(post.id);
                router.replace("/docente/guide");
              })
            }
          >
            Elimina
          </button>
        )}
        {msg && <p role="status" className={`text-[14px] ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}

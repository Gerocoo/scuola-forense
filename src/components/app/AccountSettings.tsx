"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { removeAvatar, uploadAvatar } from "@/app/area/actions";
import { createClient } from "@/lib/supabase/client";
import { PasswordField } from "@/components/auth/PasswordField";

/** Ritaglia al centro e ridimensiona a 512×512 JPEG, così il caricamento è leggero anche da telefono. */
async function squareJpeg(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("immagine"));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const size = Math.min(512, side);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
    if (!blob) throw new Error("immagine");
    return new File([blob], "foto.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function initialsOf(name: string, email: string) {
  const parts = (name.trim() || email).split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function AvatarSettings({ name, email, avatar }: { name: string; email: string; avatar: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatar);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function pick(file: File | undefined) {
    if (!file) return;
    setMsg(null);
    start(async () => {
      try {
        const jpg = await squareJpeg(file);
        setPreview(URL.createObjectURL(jpg));
        const fd = new FormData();
        fd.set("file", jpg);
        const res = await uploadAvatar(fd);
        if (!res.ok) throw new Error(res.error);
        setMsg({ ok: true, text: "Foto aggiornata." });
        router.refresh();
      } catch (e) {
        setPreview(avatar);
        setMsg({ ok: false, text: e instanceof Error && e.message !== "immagine" ? e.message : "Non riesco a leggere questa immagine. Prova con una foto JPG o PNG." });
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  }

  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold">Foto profilo</h2>
      <div className="mt-4 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="group relative size-24 shrink-0 overflow-hidden rounded-full ring-4 ring-paper"
          aria-label="Cambia la foto profilo"
          disabled={pending}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="grid size-full place-items-center bg-codice text-[28px] font-semibold text-white">{initialsOf(name, email)}</span>
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/40 text-[13px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            {pending ? "Caricamento…" : "Cambia"}
          </span>
          {pending && <span className="absolute inset-0 grid place-items-center bg-black/30"><span className="size-7 animate-spin rounded-full border-[3px] border-white/30 border-t-white" /></span>}
        </button>
        <div className="min-w-0">
          <p className="text-[15px] text-slate">Compare in alto a destra, nei messaggi e nelle esercitazioni. Usa una foto quadrata del viso.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary btn-sm" onClick={() => input.current?.click()} disabled={pending}>
              {preview ? "Cambia foto" : "Carica una foto"}
            </button>
            {preview && (
              <button
                type="button"
                className="btn-ghost btn-sm text-ceralacca"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await removeAvatar();
                    if (res.ok) {
                      setPreview(null);
                      setMsg({ ok: true, text: "Foto rimossa." });
                      router.refresh();
                    }
                  })
                }
              >
                Rimuovi
              </button>
            )}
          </div>
          {msg && <p role="status" className={`mt-2 text-[14px] ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
        </div>
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </section>
  );
}

export function PasswordSettings({ hasPassword }: { hasPassword: boolean }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) return setMsg({ ok: false, text: "La password deve avere almeno 8 caratteri." });
    if (password !== confirm) return setMsg({ ok: false, text: "Le due password non coincidono." });
    start(async () => {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) {
        const m = error.message.toLowerCase();
        setMsg({
          ok: false,
          text: m.includes("different") || m.includes("same")
            ? "La nuova password deve essere diversa da quella attuale."
            : m.includes("reauth") || m.includes("recent")
              ? "Per sicurezza esci, rientra e riprova subito."
              : m.includes("weak") || m.includes("password")
                ? "Password troppo debole: usa almeno 8 caratteri con lettere e numeri."
                : "Modifica non riuscita. Riprova.",
        });
        return;
      }
      setPassword("");
      setConfirm("");
      setMsg({ ok: true, text: hasPassword ? "Password cambiata." : "Password impostata: ora puoi entrare anche con email e password." });
    });
  }

  return (
    <section id="password" className="panel scroll-mt-24 p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold">{hasPassword ? "Cambia password" : "Imposta una password"}</h2>
      <p className="mt-1 text-[15px] text-slate">
        {hasPassword
          ? "Scegli una nuova password di almeno 8 caratteri."
          : "Accedi con Google. Se vuoi, imposta anche una password per entrare con email e password."}
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new-password" className="label">Nuova password</label>
          <PasswordField id="new-password" autoComplete="new-password" minLength={8} value={password} onChange={setPassword} />
        </div>
        <div>
          <label htmlFor="confirm-password" className="label">Ripeti la password</label>
          <PasswordField id="confirm-password" autoComplete="new-password" minLength={8} value={confirm} onChange={setConfirm} />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button className="btn-primary" disabled={pending || !password || !confirm}>
            {pending ? "Salvataggio…" : hasPassword ? "Cambia password" : "Imposta password"}
          </button>
          {msg && <p role={msg.ok ? "status" : "alert"} className={`text-[14px] ${msg.ok ? "text-codice" : "text-ceralacca"}`}>{msg.text}</p>}
        </div>
      </form>
    </section>
  );
}

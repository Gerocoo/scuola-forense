"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Divider, GoogleButton } from "@/components/auth/GoogleButton";
import { AuthNotice, PasswordField } from "@/components/auth/PasswordField";

type Mode = "password" | "link";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function loginWithPassword() {
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (!error) {
      router.replace(next);
      router.refresh();
      return;
    }
    if (error.message.toLowerCase().includes("not confirmed")) {
      setUnconfirmed(true);
      setError("Devi ancora confermare l'indirizzo email: apri il link che ti abbiamo mandato.");
    } else if (error.status === 429) {
      setError("Troppi tentativi. Aspetta qualche minuto e riprova.");
    } else {
      setError("Email o password non corrette.");
    }
  }

  async function sendLink() {
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callback(), shouldCreateUser: false },
    });
    if (error) {
      setError(
        error.status === 429
          ? "Hai già chiesto un link da poco. Aspetta un minuto e riprova."
          : error.message.toLowerCase().includes("signups not allowed") || error.message.toLowerCase().includes("not found")
            ? "Non c'è nessun account con questa email. Registrati prima."
            : "Invio non riuscito. Riprova tra poco.",
      );
      return;
    }
    setNotice(`Ti abbiamo mandato un link di accesso a ${email.trim()}. Aprilo da questo dispositivo: entri senza password. Se non lo trovi, guarda nello spam.`);
  }

  async function resendConfirmation() {
    setLoading(true);
    const { error } = await createClient().auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: callback() } });
    setLoading(false);
    setError(null);
    setUnconfirmed(false);
    if (error) setError("Non riusciamo a reinviare adesso. Riprova tra qualche minuto.");
    else setNotice("Ti abbiamo rimandato l'email di conferma. Apri il link e poi accedi.");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    setUnconfirmed(false);
    if (mode === "password") await loginWithPassword();
    else await sendLink();
    setLoading(false);
  }

  return (
    <>
      <GoogleButton next={next} />
      <Divider />

      {/* scelta del modo di accesso con email */}
      <div role="tablist" aria-label="Accesso con email" className="mb-5 grid grid-cols-2 rounded-full bg-paper p-1 text-[14px] font-medium">
        {(
          [
            ["password", "Email e password"],
            ["link", "Link via email"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
              setNotice(null);
            }}
            className={`rounded-full px-3 py-2 transition-[background-color,color,box-shadow] duration-200 ${
              mode === m ? "bg-surface text-ink shadow-[0_1px_3px_rgb(29_29_31/0.12)]" : "text-slate hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" autoComplete="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        {mode === "password" ? (
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="password" className="label">Password</label>
              <Link href="/password-dimenticata" className="text-sm text-slate hover:text-ink">Password dimenticata?</Link>
            </div>
            <PasswordField id="password" autoComplete="current-password" value={password} onChange={setPassword} />
          </div>
        ) : (
          <p className="text-[14px] leading-relaxed text-slate">
            Ti mandiamo un link: lo apri dalla posta e sei dentro, senza ricordare nessuna password.
          </p>
        )}

        {error && (
          <AuthNotice tone="error">
            {error}
            {unconfirmed && (
              <>
                {" "}
                <button type="button" onClick={resendConfirmation} className="font-semibold underline underline-offset-2" disabled={loading}>
                  Rimanda l&apos;email di conferma
                </button>
              </>
            )}
          </AuthNotice>
        )}
        {notice && <AuthNotice tone="ok">{notice}</AuthNotice>}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading || !email || (mode === "password" && !password)}
        >
          {loading ? (mode === "password" ? "Accesso in corso…" : "Invio in corso…") : mode === "password" ? "Accedi" : "Mandami il link"}
        </button>
      </form>
      <p className="mt-8 text-[15px] text-slate">
        Non hai un account?{" "}
        <Link href={`/registrati?next=${encodeURIComponent(next)}`} className="link">Registrati con la tua email</Link>
      </p>
    </>
  );
}

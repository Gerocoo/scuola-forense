"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Divider, GoogleButton } from "@/components/auth/GoogleButton";
import { AuthNotice, PasswordField } from "@/components/auth/PasswordField";

export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [resent, setResent] = useState<string | null>(null);

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function resend() {
    setResent(null);
    const { error } = await createClient().auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: callback() } });
    setResent(error ? "Non riusciamo a reinviare adesso: riprova tra qualche minuto." : "Email inviata di nuovo.");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("La password deve avere almeno 8 caratteri.");
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: callback(),
      },
    });
    setLoading(false);
    if (error) {
      const m = error.message.toLowerCase();
      setError(
        m.includes("already")
          ? "Esiste già un account con questa email. Accedi o reimposta la password."
          : error.status === 429 || m.includes("rate limit")
            ? "Troppe registrazioni in poco tempo. Riprova tra qualche minuto."
            : m.includes("password")
              ? "Password troppo debole: usa almeno 8 caratteri, con lettere e numeri."
              : "Registrazione non riuscita. Controlla i dati e riprova.",
      );
      return;
    }
    // Se la conferma email è disattivata, la sessione è già attiva.
    if (data.session) {
      router.replace(next);
      router.refresh();
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="panel p-6">
        <h2 className="text-lg font-semibold">Controlla la tua email</h2>
        <p className="mt-2 leading-relaxed text-slate">
          Abbiamo inviato un link di conferma a <strong className="text-ink">{email}</strong>. Aprilo per attivare l&apos;account.
          Se non lo trovi, guarda nella cartella spam.
        </p>
        <button type="button" onClick={resend} className="btn-secondary btn-sm mt-4">Non è arrivata? Invia di nuovo</button>
        {resent && <p className="mt-3 text-[14px] text-slate">{resent}</p>}
      </div>
    );
  }

  return (
    <>
      <GoogleButton next={next} />
      <Divider />
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="label">Nome e cognome</label>
          <input id="name" autoComplete="name" required className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" autoComplete="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <PasswordField id="password" autoComplete="new-password" minLength={8} value={password} onChange={setPassword} />
          <p className="hint">Almeno 8 caratteri.</p>
        </div>
        <label className="flex items-start gap-3 text-sm text-slate">
          <input type="checkbox" className="mt-0.5 size-4 accent-codice" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required />
          <span>
            Ho letto l&apos;<Link href="/privacy" className="link" target="_blank">informativa privacy</Link> e i{" "}
            <Link href="/termini" className="link" target="_blank">termini di vendita</Link>.
          </span>
        </label>
        {error && <AuthNotice tone="error">{error}</AuthNotice>}
        <button type="submit" className="btn-primary w-full" disabled={loading || !accepted || !name || !email || !password}>
          {loading ? "Creazione account…" : "Crea account"}
        </button>
      </form>
      <p className="mt-8 text-[15px] text-slate">
        Hai già un account? <Link href={`/accedi?next=${encodeURIComponent(next)}`} className="link">Accedi</Link>
      </p>
    </>
  );
}

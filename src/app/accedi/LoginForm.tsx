"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Divider, GoogleButton } from "@/components/auth/GoogleButton";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(
        error.message.includes("Email not confirmed")
          ? "Conferma prima l'indirizzo email: trovi il link nella posta in arrivo."
          : "Email o password non corrette.",
      );
      setLoading(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <>
      <GoogleButton next={next} />
      <Divider />
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" autoComplete="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="label">Password</label>
            <Link href="/password-dimenticata" className="text-sm text-slate hover:text-ink">Password dimenticata?</Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-ceralacca">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading || !email || !password}>
          {loading ? "Accesso in corso…" : "Accedi"}
        </button>
      </form>
      <p className="mt-8 text-[15px] text-slate">
        Non hai un account?{" "}
        <Link href={`/registrati?next=${encodeURIComponent(next)}`} className="link">Registrati</Link>
      </p>
    </>
  );
}

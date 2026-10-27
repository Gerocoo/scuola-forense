"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { createClient } from "@/lib/supabase/client";

export default function PasswordDimenticataPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reimposta-password`,
    });
    setLoading(false);
    if (error) setError("Invio non riuscito. Riprova tra qualche minuto.");
    else setSent(true);
  }

  return (
    <AuthShell title="Reimposta la password" subtitle="Ti inviamo un link per sceglierne una nuova.">
      {sent ? (
        <div className="panel p-6">
          <p className="leading-relaxed text-slate">
            Se esiste un account con <strong className="text-ink">{email}</strong>, riceverai a breve un&apos;email con il link.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" required autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-ceralacca">{error}</p>}
          <button className="btn-primary w-full" disabled={loading || !email}>
            {loading ? "Invio…" : "Invia il link"}
          </button>
        </form>
      )}
      <p className="mt-8 text-[15px]"><Link href="/accedi" className="link">Torna all&apos;accesso</Link></p>
    </AuthShell>
  );
}

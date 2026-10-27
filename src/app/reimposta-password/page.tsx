"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { createClient } from "@/lib/supabase/client";

export default function ReimpostaPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("La password deve avere almeno 8 caratteri.");
    if (password !== confirm) return setError("Le due password non coincidono.");
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("Il link è scaduto. Richiedine uno nuovo dalla pagina di accesso.");
      return;
    }
    router.replace("/area");
    router.refresh();
  }

  return (
    <AuthShell title="Scegli una nuova password">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="pw" className="label">Nuova password</label>
          <input id="pw" type="password" autoComplete="new-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label htmlFor="pw2" className="label">Ripeti la password</label>
          <input id="pw2" type="password" autoComplete="new-password" className="field" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-ceralacca">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Salvataggio…" : "Salva la password"}</button>
      </form>
    </AuthShell>
  );
}

"use client";

import { useState, useTransition } from "react";
import { setRole } from "@/app/docente/actions";
import type { Role } from "@/lib/types";

export function RoleSelect({ userId, role }: { userId: string; role: Role }) {
  const [value, setValue] = useState(role);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <select
        aria-label="Ruolo"
        className="field w-auto py-1.5 text-sm"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Role;
          if (next === "admin" && !confirm("Gli amministratori gestiscono prezzi, iscrizioni e ruoli. Confermi?")) return;
          const prev = value;
          setValue(next);
          setError(null);
          start(async () => {
            const res = await setRole(userId, next);
            if (!res.ok) {
              setValue(prev);
              setError(res.error);
            }
          });
        }}
      >
        <option value="student">Discente</option>
        <option value="teacher">Docente</option>
        <option value="admin">Amministratore</option>
      </select>
      {error && <span role="alert" className="text-sm text-ceralacca">{error}</span>}
    </div>
  );
}

"use client";

import { useState } from "react";

/** Campo password con pulsante per mostrarla o nasconderla. */
export function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        className="field pr-20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-2 my-auto h-8 rounded-full px-3 text-[14px] font-medium text-slate hover:bg-paper hover:text-ink"
        aria-label={visible ? "Nascondi password" : "Mostra password"}
      >
        {visible ? "Nascondi" : "Mostra"}
      </button>
    </div>
  );
}

/** Messaggio di stato riutilizzabile nei moduli di accesso. */
export function AuthNotice({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-[12px] px-4 py-3 text-[14px] leading-relaxed ${tone === "ok" ? "bg-codice-soft text-codice" : "bg-ceralacca-soft text-ceralacca"}`}
    >
      {children}
    </p>
  );
}

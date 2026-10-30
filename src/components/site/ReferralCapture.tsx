"use client";

import { useEffect } from "react";

/** Ricorda per 30 giorni il codice amico arrivato con il link (?amico=CODICE). */
export function ReferralCapture() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("amico");
    if (code && /^[A-Z0-9]{4,20}$/i.test(code)) {
      document.cookie = `amico=${code.toUpperCase()}; path=/; max-age=${30 * 86400}; samesite=lax`;
    }
  }, []);
  return null;
}

"use client";

import { useEffect } from "react";

/** Registra il service worker: il sito diventa installabile e può ricevere notifiche. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || location.hostname === "localhost") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

"use client";

import { useEffect, useState } from "react";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function keyBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "loading" | "unsupported" | "ios-install" | "off" | "on" | "denied";

/** Attiva o disattiva le notifiche sul dispositivo in uso, con istruzioni per installare l'app. */
export function PushSettings() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
      if (!KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState(ios && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })();
  }, []);

  async function enable() {
    setBusy(true);
    setErr(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY!) });
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      if (!res.ok) throw new Error();
      setState("on");
    } catch {
      setErr("Non è stato possibile attivare le notifiche su questo dispositivo.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold">Notifiche sul telefono</h2>
      <p className="mt-1 text-[15px] text-slate">Ricevi un avviso per nuove tracce, correzioni, messaggi e promemoria, anche a sito chiuso.</p>
      <div className="mt-4">
        {state === "loading" && <p className="text-[14px] text-mute">Controllo del dispositivo…</p>}
        {state === "on" && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-codice-soft px-3 py-1 text-[14px] font-medium text-codice">Attive su questo dispositivo</span>
            <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={disable}>Disattiva</button>
          </div>
        )}
        {state === "off" && (
          <button type="button" className="btn-primary" disabled={busy} onClick={enable}>{busy ? "Attivazione…" : "Attiva le notifiche"}</button>
        )}
        {state === "denied" && (
          <p className="text-[14px] text-ceralacca">Le notifiche sono bloccate per questo sito: riattivale dalle impostazioni del browser e ricarica la pagina.</p>
        )}
        {state === "ios-install" && (
          <p className="text-[14px] leading-relaxed text-slate">
            Su iPhone prima installa l&apos;app: in Safari tocca <strong className="text-ink">Condividi</strong> ›{" "}
            <strong className="text-ink">Aggiungi alla schermata Home</strong>, poi apri Pronao dall&apos;icona e torna qui.
          </p>
        )}
        {state === "unsupported" && <p className="text-[14px] text-mute">Questo browser non supporta le notifiche.</p>}
        {err && <p className="mt-2 text-[14px] text-ceralacca">{err}</p>}
      </div>
      <p className="mt-4 border-t border-line-soft pt-3 text-[14px] text-slate">
        <strong className="text-ink">Installa Pronao come app:</strong> su Android, dal menu di Chrome scegli &laquo;Installa app&raquo;; su iPhone, in Safari,
        Condividi › Aggiungi alla schermata Home.
      </p>
    </section>
  );
}

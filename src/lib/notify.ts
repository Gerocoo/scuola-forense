import "server-only";
import { SITE } from "@/content/site";

/** Mittente: EMAIL_FROM nel formato `Nome <indirizzo>`. */
function sender() {
  const raw = process.env.EMAIL_FROM || `${SITE.brand} <onboarding@resend.dev>`;
  const m = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim() || SITE.brand, email: m[2].trim() } : { name: SITE.brand, email: raw.trim() };
}

/**
 * Email di servizio della piattaforma (nuova traccia, correzione, messaggi, promemoria).
 * Usa Brevo se c'è BREVO_API_KEY, altrimenti Resend se c'è RESEND_API_KEY; senza chiavi non invia nulla.
 * Gli errori di invio non bloccano mai l'azione dell'utente.
 */
export async function notify({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!to) return;
  const brevo = process.env.BREVO_API_KEY;
  const resend = process.env.RESEND_API_KEY;
  if (!brevo && !resend) return;
  const from = sender();
  try {
    const res = brevo
      ? await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": brevo, "Content-Type": "application/json", accept: "application/json" },
          body: JSON.stringify({ sender: from, to: [{ email: to }], subject, htmlContent: html }),
        })
      : await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: `${from.name} <${from.email}>`, to: [to], subject, html }),
        });
    if (!res.ok) console.error("[notify] invio fallito", res.status, await res.text());
  } catch (e) {
    console.error("[notify] errore", e);
  }
}

export function emailConfigured() {
  return !!(process.env.BREVO_API_KEY || process.env.RESEND_API_KEY);
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export { esc as escapeHtml };

export function emailLayout(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html lang="it"><body style="margin:0;background:#f5f3ee">
  <div style="background:#f5f3ee;padding:32px 16px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1d1d1f">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;padding:36px 32px">
      <p style="margin:0 0 24px;font-family:Georgia,serif;font-size:18px;letter-spacing:0.16em;text-transform:uppercase;color:#1d5747">${esc(SITE.brand)}</p>
      <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25">${esc(title)}</h1>
      <div style="font-size:16px;line-height:1.6;color:#424245">${bodyHtml}</div>
      ${
        cta
          ? `<a href="${cta.href}" style="display:inline-block;margin-top:24px;background:#1d5747;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:13px 26px;border-radius:999px">${esc(cta.label)}</a>`
          : ""
      }
      <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#86868b">Ricevi questa email perché sei iscritto alla piattaforma.<br>${esc(SITE.name)}</p>
    </div>
  </div></body></html>`;
}

import "server-only";
import { SITE } from "@/content/site";

/**
 * Invio email tramite Resend (https://resend.com).
 * Se RESEND_API_KEY non è impostata non invia nulla: la piattaforma funziona lo stesso.
 * Gli errori di invio non bloccano mai l'azione dell'utente.
 */
export async function notify({ to, subject, html }: { to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? `${SITE.name} <onboarding@resend.dev>`,
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) console.error("[notify] invio fallito", res.status, await res.text());
  } catch (e) {
    console.error("[notify] errore", e);
  }
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export { esc as escapeHtml };

export function emailLayout(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html lang="it"><body style="margin:0;background:#EEF1F4;font-family:Helvetica,Arial,sans-serif;color:#17212F">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:10px;padding:32px">
        <tr><td style="font-size:14px;color:#1D5747;font-weight:600;padding-bottom:20px">${esc(SITE.name)}</td></tr>
        <tr><td style="font-size:22px;font-weight:600;line-height:1.3;padding-bottom:12px">${esc(title)}</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#3F4A5C">${bodyHtml}</td></tr>
        ${
          cta
            ? `<tr><td style="padding-top:24px"><a href="${cta.href}" style="display:inline-block;background:#1D5747;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:15px">${esc(cta.label)}</a></td></tr>`
            : ""
        }
      </table>
      <p style="font-size:12px;color:#6B7585;margin-top:16px">Ricevi questa email perché sei iscritto alla piattaforma di ${esc(SITE.name)}.</p>
    </td></tr>
  </table></body></html>`;
}

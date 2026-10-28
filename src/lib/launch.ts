import "server-only";
import { SITE, TEAM } from "@/content/site";

export type Check = { group: string; label: string; ok: boolean; hint: string };

/** Stato della configurazione per il lancio: cosa è pronto e cosa manca, senza mostrare i valori segreti. */
export function launchChecks(): Check[] {
  const env = (k: string) => !!process.env[k]?.trim();
  const site = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
  const stripe = process.env.STRIPE_SECRET_KEY || "";
  return [
    { group: "Pagamenti", label: "Stripe collegato", ok: env("STRIPE_SECRET_KEY"), hint: "Variabile STRIPE_SECRET_KEY su Vercel." },
    { group: "Pagamenti", label: "Pagamenti reali (non di prova)", ok: stripe.startsWith("sk_live_"), hint: "Per incassare davvero serve la chiave sk_live_ e il webhook in modalità live." },
    { group: "Pagamenti", label: "Webhook Stripe", ok: env("STRIPE_WEBHOOK_SECRET"), hint: "Senza webhook l'iscrizione non si attiva dopo il pagamento." },
    { group: "Pagamenti", label: "Fatture automatiche", ok: env("STRIPE_SECRET_KEY"), hint: "Attive nel pagamento: Stripe invia la fattura con codice fiscale o partita IVA." },
    { group: "Pagamenti", label: "Pagamento a rate mostrato", ok: process.env.PAGAMENTO_RATE === "1", hint: "Attiva Klarna/PayPal in Stripe, poi metti PAGAMENTO_RATE=1." },
    { group: "Email e notifiche", label: "Email della piattaforma", ok: env("BREVO_API_KEY") || env("RESEND_API_KEY"), hint: "BREVO_API_KEY ed EMAIL_FROM su Vercel." },
    { group: "Email e notifiche", label: "Mittente impostato", ok: env("EMAIL_FROM"), hint: "EMAIL_FROM, ad esempio: Pronao <segreteria@dominio.it>." },
    { group: "Email e notifiche", label: "Promemoria automatici", ok: env("CRON_SECRET"), hint: "CRON_SECRET: promemoria degli incontri e delle correzioni in scadenza." },
    { group: "Email e notifiche", label: "Notifiche push", ok: env("VAPID_PRIVATE_KEY") && env("NEXT_PUBLIC_VAPID_PUBLIC_KEY"), hint: "Chiavi VAPID su Vercel." },
    { group: "Accesso e Google", label: "Accesso con Google e canale YouTube", ok: env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET"), hint: "GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET." },
    { group: "Accesso e Google", label: "Cifratura del collegamento YouTube", ok: env("INTEGRATIONS_SECRET"), hint: "INTEGRATIONS_SECRET." },
    { group: "Accesso e Google", label: "Sito verificato su Google", ok: env("GOOGLE_SITE_VERIFICATION"), hint: "Serve per la verifica dell'app Google." },
    { group: "Correzione", label: "Conversione dei file Word", ok: env("CLOUDCONVERT_API_KEY"), hint: "CLOUDCONVERT_API_KEY: senza, si correggono solo i PDF." },
    { group: "Sito e contenuti", label: "Dominio della scuola", ok: !!site && !/vercel\.app|localhost/.test(site), hint: "Collega il dominio su Vercel e aggiorna SITE_URL, Supabase e Google." },
    { group: "Sito e contenuti", label: "Contatti della scuola", ok: !/esempio|00000/.test(`${SITE.email} ${SITE.vat} ${SITE.address}`), hint: "Email, indirizzo e partita IVA veri in src/content/site.ts." },
    { group: "Sito e contenuti", label: "Docenti in vetrina", ok: TEAM.length > 0 && !TEAM.some((t) => /Nome Cognome/.test(t.name)), hint: "Nomi e bio reali dei docenti." },
    { group: "Sito e contenuti", label: "Privacy e termini definitivi", ok: process.env.TESTI_LEGALI_DEFINITIVI === "1", hint: "Fai rivedere privacy e termini da un consulente, poi metti TESTI_LEGALI_DEFINITIVI=1." },
  ];
}

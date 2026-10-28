import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fattura elettronica con Fatture in Cloud (API v2): crea la fattura e la invia allo SDI.
 * Variabili: FIC_ACCESS_TOKEN (token manuale), FIC_COMPANY_ID,
 * facoltative FIC_VAT_ID (aliquota IVA; 0 = 22% di default), FIC_PAYMENT_ACCOUNT_ID (conto di incasso),
 * FIC_SEND_SDI=0 per creare le fatture senza inviarle (le invii a mano da Fatture in Cloud).
 */

const API = "https://api-v2.fattureincloud.it";

export type Billing = {
  name: string; // nome e cognome o ragione sociale
  tax_code?: string; // codice fiscale
  vat_number?: string; // partita IVA
  address?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  country?: string; // ISO 2 lettere
  email?: string;
  sdi?: string; // codice destinatario (7 caratteri)
  pec?: string;
};

export function invoicingConfigured() {
  return !!(process.env.FIC_ACCESS_TOKEN && process.env.FIC_COMPANY_ID);
}

const PAYMENT_CODE: Record<string, string> = {
  stripe: "MP08", // carta di pagamento
  bonifico: "MP05",
  contanti: "MP01",
  pos: "MP08",
  altro: "MP05",
};

const COUNTRY: Record<string, string> = { IT: "Italia", SM: "San Marino", CH: "Svizzera", FR: "Francia", DE: "Germania", ES: "Spagna", AT: "Austria", BE: "Belgio" };

async function fic(path: string, body: unknown) {
  const res = await fetch(`${API}/c/${process.env.FIC_COMPANY_ID}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.FIC_ACCESS_TOKEN}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      json?.error?.validation_result
        ? Object.entries(json.error.validation_result as Record<string, string[]>).map(([k, v]) => `${k}: ${[v].flat().join(", ")}`).join("; ")
        : json?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return json;
}

export function billingProblems(b: Billing | null | undefined) {
  if (!b) return "Mancano i dati di fatturazione.";
  const miss: string[] = [];
  if (!b.name?.trim()) miss.push("intestatario");
  if (!b.tax_code?.trim() && !b.vat_number?.trim()) miss.push("codice fiscale o partita IVA");
  if (!b.address?.trim()) miss.push("indirizzo");
  if (!b.postal_code?.trim()) miss.push("CAP");
  if (!b.city?.trim()) miss.push("città");
  return miss.length ? `Mancano: ${miss.join(", ")}.` : null;
}

/** Emette (una sola volta) la fattura per un'iscrizione pagata. Non lancia errori: li registra sull'iscrizione. */
export async function issueInvoice(enrollmentId: string, opts: { retry?: boolean } = {}) {
  const admin = createAdminClient();
  const { data: e } = await admin
    .from("enrollments")
    .select("id, status, amount_cents, payment_method, paid_at, billing, invoice_status, package:packages(title, period_label)")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (!e || e.status !== "active" || !e.amount_cents || e.payment_method === "gratuito") return { ok: false, reason: "nothing" as const };
  if (!invoicingConfigured()) {
    if (!e.invoice_status) await admin.from("enrollments").update({ invoice_status: "skipped", invoice_error: "Fatturazione automatica non configurata" }).eq("id", e.id);
    return { ok: false, reason: "not_configured" as const };
  }

  // prenota l'emissione: evita fatture doppie se webhook e pagina di conferma arrivano insieme
  const allowed = opts.retry ? ["error", "skipped"] : [];
  let claim = admin.from("enrollments").update({ invoice_status: "pending", invoice_error: null }).eq("id", e.id);
  claim = allowed.length ? claim.or(`invoice_status.is.null,invoice_status.in.(${allowed.join(",")})`) : claim.is("invoice_status", null);
  const { data: claimed } = await claim.select("id").maybeSingle();
  if (!claimed) return { ok: false, reason: "already" as const };

  const b = e.billing as Billing | null;
  const problem = billingProblems(b);
  if (problem) {
    await admin.from("enrollments").update({ invoice_status: "error", invoice_error: problem }).eq("id", e.id);
    return { ok: false, reason: "data" as const };
  }

  const pkg = (Array.isArray(e.package) ? e.package[0] : e.package) as { title: string; period_label: string } | null;
  const date = (e.paid_at ?? new Date().toISOString()).slice(0, 10);
  const amount = e.amount_cents / 100;
  const country = (b!.country || "IT").toUpperCase();
  const isCompany = !!b!.vat_number?.trim();

  try {
    const created = await fic("/issued_documents", {
      data: {
        type: "invoice",
        date,
        e_invoice: true,
        use_gross_prices: true,
        ei_data: { payment_method: PAYMENT_CODE[e.payment_method ?? "stripe"] ?? "MP08" },
        entity: {
          name: b!.name.trim(),
          tax_code: b!.tax_code?.trim().toUpperCase() || undefined,
          vat_number: b!.vat_number?.trim().replace(/^IT/i, "") || undefined,
          address_street: b!.address?.trim(),
          address_postal_code: b!.postal_code?.trim(),
          address_city: b!.city?.trim(),
          address_province: b!.province?.trim().toUpperCase().slice(0, 2) || undefined,
          country: COUNTRY[country] ?? country,
          email: b!.email || undefined,
          certified_email: b!.pec?.trim() || undefined,
          ei_code: (b!.sdi?.trim().toUpperCase() || (country === "IT" ? "0000000" : "XXXXXXX")).slice(0, 7),
          type: isCompany ? "company" : "person",
        },
        items_list: [
          {
            name: pkg ? `${pkg.title}${pkg.period_label ? ` (${pkg.period_label})` : ""}` : "Corso di preparazione all'esame di avvocato",
            qty: 1,
            gross_price: amount,
            vat: { id: Number(process.env.FIC_VAT_ID ?? 0) },
          },
        ],
        payments_list: [
          {
            amount,
            due_date: date,
            paid_date: date,
            status: "paid",
            ...(process.env.FIC_PAYMENT_ACCOUNT_ID ? { payment_account: { id: Number(process.env.FIC_PAYMENT_ACCOUNT_ID) } } : {}),
          },
        ],
      },
    });
    const doc = created?.data as { id: number; number?: number; numeration?: string } | undefined;
    if (!doc?.id) throw new Error("Risposta di Fatture in Cloud senza documento");
    const number = `${doc.number ?? ""}${doc.numeration ?? ""}` || null;
    await admin
      .from("enrollments")
      .update({ invoice_status: "issued", invoice_id: String(doc.id), invoice_number: number, invoice_at: new Date().toISOString(), invoice_error: null })
      .eq("id", e.id);

    if (process.env.FIC_SEND_SDI !== "0") {
      try {
        await fic(`/issued_documents/${doc.id}/e_invoice/send`, { data: {} });
        await admin.from("enrollments").update({ invoice_status: "sent" }).eq("id", e.id);
      } catch (err) {
        await admin
          .from("enrollments")
          .update({ invoice_error: `Fattura creata ma non inviata allo SDI: ${err instanceof Error ? err.message : "errore"}. Inviala da Fatture in Cloud.` })
          .eq("id", e.id);
      }
    }
    return { ok: true as const };
  } catch (err) {
    console.error("[fattura]", err);
    await admin
      .from("enrollments")
      .update({ invoice_status: "error", invoice_error: (err instanceof Error ? err.message : "Errore sconosciuto").slice(0, 500) })
      .eq("id", e.id);
    return { ok: false, reason: "error" as const };
  }
}

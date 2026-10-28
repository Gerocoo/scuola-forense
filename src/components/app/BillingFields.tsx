"use client";

export type BillingData = {
  name?: string;
  tax_code?: string;
  vat_number?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  country?: string;
  email?: string;
  sdi?: string;
  pec?: string;
};

/** Campi dei dati di fatturazione (prefisso b_ nel modulo). */
export function BillingFields({ initial, idPrefix = "b" }: { initial?: BillingData | null; idPrefix?: string }) {
  const f = (k: keyof BillingData, label: string, opts: { span?: string; placeholder?: string; max?: number } = {}) => (
    <div className={opts.span ?? ""}>
      <label className="label" htmlFor={`${idPrefix}-${k}`}>{label}</label>
      <input id={`${idPrefix}-${k}`} name={`b_${k}`} defaultValue={initial?.[k] ?? (k === "country" ? "IT" : "")} maxLength={opts.max} placeholder={opts.placeholder} className="field" />
    </div>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      {f("name", "Intestatario", { span: "sm:col-span-6", placeholder: "Nome e cognome o ragione sociale" })}
      {f("tax_code", "Codice fiscale", { span: "sm:col-span-3", max: 16 })}
      {f("vat_number", "Partita IVA", { span: "sm:col-span-3", placeholder: "solo professionisti e aziende" })}
      {f("address", "Indirizzo", { span: "sm:col-span-6" })}
      {f("postal_code", "CAP", { span: "sm:col-span-2", max: 10 })}
      {f("city", "Città", { span: "sm:col-span-3" })}
      {f("province", "Prov.", { span: "sm:col-span-1", max: 2 })}
      {f("sdi", "Codice SDI", { span: "sm:col-span-2", max: 7, placeholder: "facoltativo" })}
      {f("pec", "PEC", { span: "sm:col-span-4", placeholder: "facoltativa" })}
      <input type="hidden" name="b_country" value={initial?.country ?? "IT"} />
    </div>
  );
}

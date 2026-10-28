import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { requireAdmin } from "@/lib/auth";
import { dateLong, euro } from "@/lib/format";
import { MarkPaid, METHOD_LABEL } from "@/app/docente/discenti/[id]/EnrollmentAdmin";
import { InvoiceControls } from "./InvoiceControls";
import { invoicingConfigured } from "@/lib/invoices";
import type { BillingData } from "@/components/app/BillingFields";

export const metadata = { title: "Pagamenti" };

type Row = {
  id: string;
  user_id: string;
  status: string;
  amount_cents: number;
  created_at: string;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_note: string | null;
  billing: BillingData | null;
  invoice_status: string | null;
  invoice_number: string | null;
  invoice_error: string | null;
  student: { full_name: string | null; email: string } | null;
  package: { title: string } | null;
};

const DAY = 86400000;

export default async function PagamentiPage() {
  const { supabase } = await requireAdmin();
  const select =
    "id, user_id, status, amount_cents, created_at, paid_at, payment_method, payment_reference, payment_note, billing, invoice_status, invoice_number, invoice_error, student:profiles!enrollments_user_id_fkey(full_name, email), package:packages(title)";

  const [{ data: pending }, { data: recent }] = await Promise.all([
    supabase.from("enrollments").select(select).eq("status", "pending").order("created_at").returns<Row[]>(),
    supabase
      .from("enrollments")
      .select(select)
      .neq("status", "pending")
      .gt("amount_cents", 0)
      .order("paid_at", { ascending: false, nullsFirst: false })
      .limit(80)
      .returns<Row[]>(),
  ]);

  const waiting = pending ?? [];
  const total = waiting.reduce((s, e) => s + e.amount_cents, 0);
  const now = Date.now();

  return (
    <>
      <PageHeader
        title="Pagamenti"
        description="Iscrizioni gestite dalla segreteria. Quando il bonifico arriva, segnalo come pagato: il discente riceve l'email e accede subito al corso."
      />

      <div className="space-y-8">
        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-baseline justify-between gap-2 p-5 sm:p-6">
            <h2 className="text-[19px] font-semibold">In attesa di pagamento</h2>
            <span className="text-[15px] text-slate">
              {waiting.length} {waiting.length === 1 ? "iscrizione" : "iscrizioni"} · {euro(total)} da incassare
            </span>
          </div>
          {waiting.length === 0 ? (
            <p className="border-t border-line-soft px-5 py-6 text-[15px] text-slate sm:px-6">
              Nessun bonifico in sospeso. Per registrare un&apos;iscrizione dalla segreteria apri la scheda del discente in{" "}
              <Link href="/docente/discenti" className="font-medium text-codice hover:underline">Discenti</Link>.
            </p>
          ) : (
            <ul className="divide-y divide-line-soft border-t border-line-soft">
              {waiting.map((e) => {
                const days = Math.floor((now - new Date(e.created_at).getTime()) / DAY);
                return (
                  <li key={e.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
                    <div className="min-w-0">
                      <Link href={`/docente/discenti/${e.user_id}`} className="font-medium hover:underline">
                        {e.student?.full_name || e.student?.email}
                      </Link>
                      <p className="text-[14px] text-slate">
                        {e.package?.title} · {euro(e.amount_cents)} · {METHOD_LABEL[e.payment_method ?? ""] ?? "Bonifico"}
                      </p>
                      <p className={`text-[13px] ${days >= 7 ? "font-medium text-ceralacca" : "text-mute"}`}>
                        Registrata il {dateLong(e.created_at)}
                        {days >= 1 ? ` · ${days} ${days === 1 ? "giorno" : "giorni"} fa` : ""}
                        {e.payment_note ? ` · ${e.payment_note}` : ""}
                      </p>
                    </div>
                    <div className="sm:w-72">
                      <MarkPaid enrollmentId={e.id} amountCents={e.amount_cents} compact />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel overflow-hidden">
          <div className="p-5 sm:p-6">
            <h2 className="text-[19px] font-semibold">Incassi e fatture</h2>
            <p className="mt-1 text-[15px] text-slate">
              {invoicingConfigured()
                ? "Le fatture elettroniche partono da sole verso Fatture in Cloud e lo SDI. Se una non va a buon fine, completa i dati e premi Riprova."
                : "Fatturazione automatica non attiva: collega Fatture in Cloud (FIC_ACCESS_TOKEN e FIC_COMPANY_ID su Vercel) per emettere le fatture elettroniche."}
            </p>
          </div>
          {(recent ?? []).length === 0 ? (
            <p className="border-t border-line-soft px-5 py-6 text-[15px] text-slate sm:px-6">Ancora nessun incasso.</p>
          ) : (
            <div className="overflow-x-auto border-t border-line-soft">
              <table className="w-full min-w-[820px] text-left text-[14px]">
                <thead className="bg-paper text-[13px] text-mute">
                  <tr>
                    <th className="px-5 py-2.5 font-medium sm:px-6">Data</th>
                    <th className="px-3 py-2.5 font-medium">Discente</th>
                    <th className="px-3 py-2.5 font-medium">Corso</th>
                    <th className="px-3 py-2.5 font-medium">Metodo</th>
                    <th className="px-3 py-2.5 font-medium">Riferimento</th>
                    <th className="px-3 py-2.5 font-medium">Fattura</th>
                    <th className="px-5 py-2.5 text-right font-medium sm:px-6">Importo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {(recent ?? []).map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap px-5 py-2.5 sm:px-6">{dateLong(e.paid_at ?? e.created_at)}</td>
                      <td className="px-3 py-2.5">
                        <Link href={`/docente/discenti/${e.user_id}`} className="hover:underline">{e.student?.full_name || e.student?.email}</Link>
                      </td>
                      <td className="px-3 py-2.5">{e.package?.title}</td>
                      <td className="px-3 py-2.5">{METHOD_LABEL[e.payment_method ?? ""] ?? "—"}</td>
                      <td className="px-3 py-2.5 text-mute">{e.payment_reference ?? "—"}</td>
                      <td className="px-3 py-2.5 align-top">
                        <InvoiceControls
                          enrollmentId={e.id}
                          status={e.invoice_status}
                          number={e.invoice_number}
                          error={e.invoice_error}
                          billing={e.billing}
                          paid={e.status === "active"}
                        />
                      </td>
                      <td className={`whitespace-nowrap px-5 py-2.5 text-right font-medium sm:px-6 ${e.status === "refunded" ? "text-ceralacca line-through" : ""}`}>
                        {euro(e.amount_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { requireAdmin } from "@/lib/auth";
import { currentPrice, euro } from "@/lib/format";
import type { Package } from "@/lib/types";

export const metadata = { title: "Corsi in vendita" };

export default async function PacchettiPage() {
  const { supabase } = await requireAdmin();
  const [{ data: packages }, { data: enr }] = await Promise.all([
    supabase.from("packages").select("*").order("sort").returns<Package[]>(),
    supabase.from("enrollments").select("package_id, amount_cents, status"),
  ]);

  const stats = (id: string) => {
    const rows = (enr ?? []).filter((e) => e.package_id === id && e.status !== "refunded");
    return { count: rows.length, total: rows.reduce((s, r) => s + (r.amount_cents ?? 0), 0) };
  };

  return (
    <>
      <PageHeader
        title="Corsi in vendita"
        description="Prezzi, promozioni e testi delle schede corso mostrate in vetrina."
        actions={<Link href="/docente/pacchetti/nuovo" className="btn-primary">Nuovo corso</Link>}
      />
      <div className="overflow-x-auto rounded-[var(--radius-panel)] bg-surface shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[720px] text-left text-[15px]">
          <thead className="border-b border-line text-sm text-mute">
            <tr>
              <th className="px-5 py-3 font-medium">Corso</th>
              <th className="px-5 py-3 font-medium">Prezzo attuale</th>
              <th className="px-5 py-3 text-right font-medium">Iscritti</th>
              <th className="px-5 py-3 text-right font-medium">Incassato</th>
              <th className="px-5 py-3 font-medium">Vetrina</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {(packages ?? []).map((p) => {
              const price = currentPrice(p);
              const s = stats(p.id);
              return (
                <tr key={p.id} className="hover:bg-paper">
                  <td className="px-5 py-3">
                    <Link href={`/docente/pacchetti/${p.id}`} className="font-medium hover:text-codice">{p.title}</Link>
                    <span className="block text-sm text-mute">{p.period_label}</span>
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    {euro(price.amount)}
                    {price.promoActive && <span className="ml-2 text-sm text-ceralacca">in promozione</span>}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{s.count}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{euro(s.total)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${p.active ? "bg-codice-soft text-codice" : "bg-line-soft text-slate"}`}>
                      {p.active ? "In vendita" : "Nascosto"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

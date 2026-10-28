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
      <ul className="grid gap-3 md:grid-cols-2">
        {(packages ?? []).map((p) => {
          const price = currentPrice(p);
          const st = stats(p.id);
          return (
            <li key={p.id}>
              <Link href={`/docente/pacchetti/${p.id}`} className="panel lift flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-codice">{p.period_label || "Corso"}</p>
                    <p className="text-[18px] font-semibold leading-snug">{p.title}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-medium ${p.active ? "bg-codice-soft text-codice" : "bg-line-soft text-slate"}`}>
                    {p.active ? "In vendita" : "Nascosto"}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-[12px] bg-paper px-3 py-2">
                    <dt className="text-[12px] text-mute">Prezzo</dt>
                    <dd className="text-[15px] font-semibold tabular-nums">{euro(price.amount)}</dd>
                    {price.promoActive && <dd className="text-[12px] text-ceralacca">in promozione</dd>}
                  </div>
                  <div className="rounded-[12px] bg-paper px-3 py-2">
                    <dt className="text-[12px] text-mute">Iscritti</dt>
                    <dd className="text-[15px] font-semibold tabular-nums">{st.count}</dd>
                  </div>
                  <div className="rounded-[12px] bg-paper px-3 py-2">
                    <dt className="text-[12px] text-mute">Incassato</dt>
                    <dd className="truncate text-[15px] font-semibold tabular-nums">{euro(st.total)}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

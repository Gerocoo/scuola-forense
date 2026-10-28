import { PageHeader } from "@/components/app/AppShell";
import { requireAdmin } from "@/lib/auth";
import { dateShort } from "@/lib/format";

export const metadata = { title: "Contatti" };

export default async function ContattiPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("leads")
    .select("id, email, name, source, user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<{ id: string; email: string; name: string; source: string; user_id: string | null; created_at: string }[]>();
  const rows = data ?? [];
  const converted = rows.filter((r) => r.user_id).length;

  return (
    <>
      <PageHeader
        title="Contatti"
        description={`Chi ha chiesto la prova gratuita: ${rows.length} contatti, ${converted} hanno creato l'account.`}
        actions={rows.length ? <a href="/docente/contatti/csv" className="btn-secondary">Scarica in Excel (CSV)</a> : undefined}
      />
      {rows.length ? (
        <ul className="panel divide-y divide-line-soft overflow-hidden">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.name || r.email}</p>
                <p className="truncate text-[14px] text-mute">
                  {r.email} · {dateShort(r.created_at)}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-medium ${r.user_id ? "bg-codice-soft text-codice" : "bg-ambra-soft text-ambra"}`}>
                {r.user_id ? "Account creato" : "Solo email"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="panel p-6 text-[15px] text-slate">Ancora nessun contatto. Condividi la pagina /prova-gratuita.</p>
      )}
    </>
  );
}

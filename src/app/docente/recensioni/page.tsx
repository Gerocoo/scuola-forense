import { PageHeader } from "@/components/app/AppShell";
import { ModerateButtons } from "./ModerateButtons";
import { requireStaff } from "@/lib/auth";
import { dateShort } from "@/lib/format";

export const metadata = { title: "Recensioni" };

export default async function RecensioniPage() {
  const { supabase } = await requireStaff();
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, body, approved, created_at, user:profiles(full_name, email)")
    .order("approved")
    .order("created_at", { ascending: false })
    .returns<{ id: string; rating: number; body: string; approved: boolean; created_at: string; user: { full_name: string | null; email: string } | null }[]>();
  const pending = (data ?? []).filter((r) => !r.approved).length;
  return (
    <>
      <PageHeader title="Recensioni" description={`Le recensioni dei discenti compaiono in vetrina solo dopo l'approvazione. ${pending ? `${pending} da verificare.` : ""}`} />
      {(data ?? []).length ? (
        <ul className="space-y-3">
          {(data ?? []).map((r) => (
            <li key={r.id} className={`panel p-5 ${r.approved ? "" : "ring-2 ring-ambra/30"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  {r.user?.full_name || r.user?.email} <span className="ml-1 text-ambra">{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></span>
                </p>
                <span className="text-[13px] text-mute">{dateShort(r.created_at)} · {r.approved ? "Pubblicata" : "Da verificare"}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap font-serif text-[16px] italic leading-relaxed">&ldquo;{r.body}&rdquo;</p>
              <div className="mt-3">
                <ModerateButtons id={r.id} approved={r.approved} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="panel p-6 text-[15px] text-slate">Ancora nessuna recensione. I discenti possono lasciarla da «I miei corsi» dopo aver frequentato un corso.</p>
      )}
    </>
  );
}

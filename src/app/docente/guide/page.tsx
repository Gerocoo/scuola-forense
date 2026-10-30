import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { PostForm } from "./PostForm";
import { requireStaff } from "@/lib/auth";
import { dateShort } from "@/lib/format";

export const metadata = { title: "Guide" };

export default async function GuideDocente() {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("posts").select("id, title, slug, published, updated_at").order("updated_at", { ascending: false });
  return (
    <>
      <PageHeader
        title="Guide"
        description="Articoli per il sito: portano visite da Google. Idee: come si scrive un parere, l'atto di appello, i criteri di correzione, gli errori più frequenti."
      />
      {(data ?? []).length > 0 && (
        <ul className="mb-8 divide-y divide-line-soft rounded-[var(--radius-panel)] bg-surface shadow-[var(--shadow-card)]">
          {(data ?? []).map((p: { id: string; title: string; slug: string; published: boolean; updated_at: string }) => (
            <li key={p.id}>
              <Link href={`/docente/guide/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-paper">
                <span className="min-w-0 truncate font-medium">{p.title}</span>
                <span className="flex shrink-0 items-center gap-3 text-[13px] text-mute">
                  {dateShort(p.updated_at)}
                  <span className={`rounded-full px-2 py-0.5 font-medium ${p.published ? "bg-codice-soft text-codice" : "bg-line-soft text-slate"}`}>{p.published ? "Pubblicata" : "Bozza"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <h2 className="mb-3 text-[19px] font-semibold">Nuova guida</h2>
      <div className="max-w-3xl">
        <PostForm />
      </div>
    </>
  );
}

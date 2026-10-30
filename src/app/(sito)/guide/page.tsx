import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateLong } from "@/lib/format";

export const metadata: Metadata = {
  title: "Guide all'esame di avvocato",
  description: "Come si scrive un parere e un atto, criteri di correzione, calendario e consigli dei docenti per l'esame di abilitazione forense.",
};
export const revalidate = 300;

export default async function GuidePage() {
  const { data } = await createAdminClient()
    .from("posts")
    .select("slug, title, excerpt, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(100);
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-[14px] font-semibold uppercase tracking-wide text-codice">Guide</p>
      <h1 className="mt-2 text-[36px] font-semibold leading-tight sm:text-[46px]">Prepararsi all&apos;esame di avvocato</h1>
      <p className="mt-4 text-[18px] leading-relaxed text-slate">Metodo, tecnica degli atti e dei pareri, criteri di correzione: le indicazioni dei nostri docenti.</p>
      {(data ?? []).length ? (
        <ul className="mt-10 space-y-4">
          {(data ?? []).map((p) => (
            <li key={p.slug}>
              <Link href={`/guide/${p.slug}`} className="panel lift block p-6">
                <p className="text-[13px] text-mute">{dateLong(p.published_at)}</p>
                <h2 className="mt-1 text-[21px] font-semibold leading-snug">{p.title}</h2>
                {p.excerpt && <p className="mt-2 text-[16px] leading-relaxed text-slate">{p.excerpt}</p>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="panel mt-10 p-6 text-[16px] text-slate">Le prime guide sono in arrivo.</p>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { RichText } from "@/components/site/RichText";
import { dateLong } from "@/lib/format";
import { SITE } from "@/content/site";

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 300;

async function load(slug: string) {
  const { data } = await createAdminClient()
    .from("posts")
    .select("title, excerpt, body, published_at, updated_at, author:profiles(full_name)")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  return data as { title: string; excerpt: string; body: string; published_at: string | null; updated_at: string; author: { full_name: string | null } | null } | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return { title: "Guida" };
  return { title: p.title, description: p.excerpt || undefined, openGraph: { title: p.title, description: p.excerpt || undefined, type: "article" } };
}

export default async function GuidaPage({ params }: Props) {
  const p = await load((await params).slug);
  if (!p) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.excerpt,
    datePublished: p.published_at,
    dateModified: p.updated_at,
    author: p.author?.full_name ? { "@type": "Person", name: p.author.full_name } : { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.name },
  };
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/guide" className="text-[15px] font-medium text-codice hover:underline">← Tutte le guide</Link>
      <h1 className="mt-4 text-[34px] font-semibold leading-tight sm:text-[44px]">{p.title}</h1>
      <p className="mt-3 text-[14px] text-mute">
        {p.author?.full_name ? `${p.author.full_name} · ` : ""}
        {dateLong(p.published_at)}
      </p>
      {p.excerpt && <p className="mt-6 text-[19px] leading-relaxed text-slate">{p.excerpt}</p>}
      <div className="mt-8">
        <RichText text={p.body} />
      </div>
      <aside className="panel mt-12 flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[16px]">Vuoi metterti alla prova? Svolgi una traccia e ricevi la correzione di un docente.</p>
        <Link href="/prova-gratuita" className="btn-primary shrink-0">Prova gratis</Link>
      </aside>
    </article>
  );
}

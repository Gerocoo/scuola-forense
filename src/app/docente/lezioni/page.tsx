import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";
import { requireStaff } from "@/lib/auth";
import { dateShort, dateTime } from "@/lib/format";
import type { Lesson, Package } from "@/lib/types";

export const metadata = { title: "Lezioni" };

export default async function LezioniDocente() {
  const { supabase } = await requireStaff();
  const [{ data: lessons }, { data: packages }] = await Promise.all([
    supabase.from("lessons").select("*").order("sort").order("created_at", { ascending: false }).returns<Lesson[]>(),
    supabase.from("packages").select("id, title").returns<Pick<Package, "id" | "title">[]>(),
  ]);
  const pkgName = (ids: string[]) => ids.map((i) => packages?.find((p) => p.id === i)?.title).filter(Boolean).join(", ");

  const live = (lessons ?? []).filter((l) => l.kind === "in_presenza").sort((a, b) => (b.scheduled_at ?? "").localeCompare(a.scheduled_at ?? ""));
  const recorded = (lessons ?? []).filter((l) => l.kind === "registrata");

  const Row = ({ l }: { l: Lesson }) => (
    <li>
      <Link href={`/docente/lezioni/${l.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-paper">
        <span className="min-w-0">
          <span className="block font-medium">{l.title}</span>
          <span className="text-sm text-mute">
            {l.kind === "in_presenza" ? dateTime(l.scheduled_at) : `Pubblicata il ${dateShort(l.created_at)}`}
            {pkgName(l.package_ids) && `, ${pkgName(l.package_ids)}`}
          </span>
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${l.published ? "bg-codice-soft text-codice" : "bg-line-soft text-slate"}`}>
          {l.published ? "Visibile" : "Bozza"}
        </span>
      </Link>
    </li>
  );

  return (
    <>
      <PageHeader
        title="Lezioni"
        description="Le lezioni sono visibili solo ai discenti iscritti ai corsi selezionati, e solo quando le pubblichi."
        actions={
          <>
            <Link href="/docente/lezioni/nuova?tipo=in_presenza" className="btn-secondary">Nuovo incontro in presenza</Link>
            <Link href="/docente/lezioni/nuova" className="btn-primary">Nuova lezione registrata</Link>
          </>
        }
      />
      {!lessons?.length ? (
        <EmptyState title="Ancora nessuna lezione" body="Aggiungi una mini lezione registrata con il link al video, oppure fissa il prossimo incontro in presenza." />
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="text-lg font-semibold">In presenza</h2>
            {live.length ? (
              <ul className="mt-3 divide-y divide-line-soft rounded-[var(--radius-panel)] border border-line bg-surface">
                {live.map((l) => <Row key={l.id} l={l} />)}
              </ul>
            ) : (
              <p className="mt-3 text-[15px] text-slate">Nessun incontro.</p>
            )}
          </section>
          <section>
            <h2 className="text-lg font-semibold">Registrate</h2>
            {recorded.length ? (
              <ul className="mt-3 divide-y divide-line-soft rounded-[var(--radius-panel)] border border-line bg-surface">
                {recorded.map((l) => <Row key={l.id} l={l} />)}
              </ul>
            ) : (
              <p className="mt-3 text-[15px] text-slate">Nessuna lezione registrata.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}

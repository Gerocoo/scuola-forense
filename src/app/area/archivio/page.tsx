import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { TrackArchive, UnlockButton } from "@/components/app/TrackArchive";
import { requireUser } from "@/lib/auth";
import { loadArchive } from "@/lib/archive";

export const metadata = { title: "Archivio tracce" };

type Props = { searchParams: Promise<{ materia?: string; tipo?: string; anno?: string; errore?: string; consenso?: string }> };

export default async function ArchivioPage({ searchParams }: Props) {
  const { errore, consenso, ...filters } = await searchParams;
  const { supabase } = await requireUser();
  const { tracks, years, access, total, freeCount, price } = await loadArchive(supabase, filters);
  return (
    <>
      <PageHeader
        title="Archivio tracce"
        description="Le tracce d'esame degli anni passati. Allenati in autonomia: scegli una traccia e svolgila nei tempi della prova."
      />
      {errore && (
        <p role="alert" className="mb-5 rounded-[14px] bg-ceralacca-soft px-4 py-3 text-[15px] text-ceralacca">
          Il pagamento non è partito. Riprova tra qualche minuto o scrivi alla segreteria.
        </p>
      )}
      {consenso && (
        <p role="alert" className="mb-5 rounded-[14px] bg-ambra-soft px-4 py-3 text-[15px] text-ink">
          Per procedere conferma la richiesta di accesso immediato ai contenuti.
        </p>
      )}
      {!access && (
        <section className="panel mb-6 overflow-hidden">
          <div className="flex flex-col gap-4 bg-codice-deep p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-wide text-white/70">
                {freeCount} {freeCount === 1 ? "traccia gratuita" : "tracce gratuite"} su {total}
              </p>
              <h2 className="mt-1 text-[20px] font-semibold leading-snug">Sblocca tutte le tracce degli anni passati</h2>
              <p className="mt-1 text-[15px] text-white/80">
                Pareri e atti di civile, penale e amministrativo, con le nuove sessioni aggiunte ogni anno. L&apos;archivio è incluso in tutti i corsi.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <UnlockButton price={price} tone="dark" className="btn-primary w-full bg-white text-codice-deep hover:bg-white/90" />
              <Link href="/#corsi" className="btn-ghost text-white hover:bg-white/10">Vedi i corsi</Link>
            </div>
          </div>
        </section>
      )}
      <TrackArchive tracks={tracks} base="/area/archivio" filters={filters} years={years} price={price} />
    </>
  );
}

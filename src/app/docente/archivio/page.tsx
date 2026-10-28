import { PageHeader } from "@/components/app/AppShell";
import { TrackArchive } from "@/components/app/TrackArchive";
import { DeleteTrack, ToggleFree, TrackForm } from "./ArchiveAdmin";
import { requireStaff } from "@/lib/auth";
import { loadArchive } from "@/lib/archive";

export const metadata = { title: "Archivio tracce" };

type Props = { searchParams: Promise<{ materia?: string; tipo?: string; anno?: string }> };

export default async function ArchivioDocente({ searchParams }: Props) {
  const filters = await searchParams;
  const { supabase } = await requireStaff();
  const { tracks, years, total, freeCount } = await loadArchive(supabase, filters);
  return (
    <>
      <PageHeader
        title="Archivio tracce"
        description={`${total} tracce, di cui ${freeCount} gratuite per tutti gli utenti registrati. Le altre sono incluse nei corsi o acquistabili con l'archivio completo (prezzo in Corsi in vendita).`}
      />
      <details className="panel mb-8 p-5 sm:p-6" open={tracks.length === 0}>
        <summary className="cursor-pointer text-[17px] font-semibold">Aggiungi una traccia</summary>
        <div className="mt-4">
          <TrackForm />
        </div>
      </details>
      <TrackArchive
        tracks={tracks}
        base="/docente/archivio"
        filters={filters}
        years={years}
        renderAction={(t) => (
          <span className="flex flex-wrap items-center gap-3">
            <ToggleFree id={t.id} free={t.free} />
            <DeleteTrack id={t.id} />
          </span>
        )}
      />
    </>
  );
}

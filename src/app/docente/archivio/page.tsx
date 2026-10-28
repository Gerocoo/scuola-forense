import { PageHeader } from "@/components/app/AppShell";
import { TrackArchive, loadTracks } from "@/components/app/TrackArchive";
import { DeleteTrack, TrackForm } from "./ArchiveAdmin";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "Archivio tracce" };

type Props = { searchParams: Promise<{ materia?: string; tipo?: string; anno?: string }> };

export default async function ArchivioDocente({ searchParams }: Props) {
  const filters = await searchParams;
  const { supabase } = await requireStaff();
  const { tracks, years } = await loadTracks(supabase, filters);
  return (
    <>
      <PageHeader title="Archivio tracce" description="Le tracce degli anni passati, consultabili da tutti gli iscritti per allenarsi in autonomia." />
      <details className="panel mb-8 p-5 sm:p-6" open={tracks.length === 0}>
        <summary className="cursor-pointer text-[17px] font-semibold">Aggiungi una traccia</summary>
        <div className="mt-4">
          <TrackForm />
        </div>
      </details>
      <TrackArchive tracks={tracks} base="/docente/archivio" filters={filters} years={years} renderAction={(t) => <DeleteTrack id={t.id} />} />
    </>
  );
}

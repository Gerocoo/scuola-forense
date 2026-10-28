import { PageHeader } from "@/components/app/AppShell";
import { TrackArchive, loadTracks } from "@/components/app/TrackArchive";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Archivio tracce" };

type Props = { searchParams: Promise<{ materia?: string; tipo?: string; anno?: string }> };

export default async function ArchivioPage({ searchParams }: Props) {
  const f = await searchParams;
  const { supabase } = await requireUser();
  const filters = f;
  const { tracks, years } = await loadTracks(supabase, filters);
  return (
    <>
      <PageHeader
        title="Archivio tracce"
        description="Le tracce d'esame degli anni passati. Allenati in autonomia: scegli una traccia e svolgila nei tempi della prova."
      />
      <TrackArchive tracks={tracks} base="/area/archivio" filters={filters} years={years} />
    </>
  );
}

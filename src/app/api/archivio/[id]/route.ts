import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** File di una traccia d'archivio: la riga si legge con le regole dell'utente (iscritti e staff). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Non trovato", { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/accedi", request.url));
  const { data: t } = await supabase.from("past_tracks").select("file").eq("id", id).maybeSingle<{ file: { path: string; name: string } | null }>();
  if (!t?.file) return new NextResponse("Non disponibile", { status: 404 });
  const inline = new URL(request.url).searchParams.get("apri") === "1";
  const { data } = await createAdminClient().storage.from("materiali").createSignedUrl(t.file.path, 60, inline ? undefined : { download: t.file.name });
  if (!data) return new NextResponse("File non disponibile", { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}

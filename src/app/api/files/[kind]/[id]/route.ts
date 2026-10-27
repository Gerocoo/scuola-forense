import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const TABLE = { esercitazione: "assignment_files", lezione: "lesson_files" } as const;

/**
 * Download protetto.
 * 1) legge la riga del file con il client dell'utente: se le RLS non la mostrano, 404;
 * 2) solo allora genera un URL firmato valido 60 secondi e reindirizza.
 */
export async function GET(request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const table = TABLE[kind as keyof typeof TABLE];
  if (!table || !/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Non trovato", { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/accedi", request.url));

  const { data: file } = await supabase.from(table).select("storage_path, file_name").eq("id", id).maybeSingle();
  if (!file) return new NextResponse("File non trovato o non accessibile", { status: 404 });

  const inline = new URL(request.url).searchParams.get("apri") === "1";
  const { data, error } = await createAdminClient()
    .storage.from("materiali")
    .createSignedUrl(file.storage_path, 60, inline ? undefined : { download: file.file_name });

  if (error || !data) return new NextResponse("File non disponibile", { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}

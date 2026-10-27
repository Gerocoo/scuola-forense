import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "materiali";
const CONVERTIBLE = /\.(docx?|odt|rtf|txt)$/i;

function isPdf(name: string, mime: string | null) {
  return mime === "application/pdf" || /\.pdf$/i.test(name);
}

/** Converte un documento Word/ODT/RTF in PDF con CloudConvert (API sincrona). */
async function convertToPdf(sourceUrl: string, fileName: string): Promise<ArrayBuffer> {
  const key = process.env.CLOUDCONVERT_API_KEY;
  if (!key) throw new Error("non-configurato");
  const res = await fetch("https://sync.api.cloudconvert.com/v2/jobs", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tasks: {
        "import-1": { operation: "import/url", url: sourceUrl, filename: fileName },
        "convert-1": { operation: "convert", input: "import-1", output_format: "pdf" },
        "export-1": { operation: "export/url", input: "convert-1" },
      },
    }),
  });
  const job = await res.json().catch(() => null);
  if (!res.ok || !job?.data) {
    console.error("[pdf] conversione non riuscita", res.status, JSON.stringify(job)?.slice(0, 500));
    throw new Error("conversione");
  }
  type Task = { name: string; status: string; result?: { files?: { url: string }[] } };
  const exported = (job.data.tasks as Task[]).find((t) => t.name === "export-1");
  const url = exported?.result?.files?.[0]?.url;
  if (!url) throw new Error("conversione");
  const pdf = await fetch(url);
  if (!pdf.ok) throw new Error("conversione");
  return pdf.arrayBuffer();
}

/**
 * Restituisce l'elaborato in PDF per la correzione sul documento.
 * Il file si legge con il client dell'utente (le regole di accesso valgono come per il download);
 * i Word vengono convertiti una volta sola e il PDF resta salvato accanto all'originale.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Accesso richiesto" }, { status: 401 });

  const { data: file } = await supabase
    .from("assignment_files")
    .select("id, storage_path, file_name, mime_type, pdf_path")
    .eq("id", id)
    .maybeSingle<{ id: string; storage_path: string; file_name: string; mime_type: string | null; pdf_path: string | null }>();
  if (!file) return NextResponse.json({ error: "File non trovato" }, { status: 404 });

  const admin = createAdminClient();
  let path = isPdf(file.file_name, file.mime_type) ? file.storage_path : file.pdf_path;

  if (!path) {
    if (!CONVERTIBLE.test(file.file_name)) {
      return NextResponse.json({ error: "Questo tipo di file non si può aprire nel correttore. Scaricalo e correggilo a parte." }, { status: 415 });
    }
    const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(file.storage_path, 600);
    if (!signed) return NextResponse.json({ error: "File non disponibile" }, { status: 500 });
    try {
      const bytes = await convertToPdf(signed.signedUrl, file.file_name);
      path = `pdf/${file.id}.pdf`;
      const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;
      await admin.from("assignment_files").update({ pdf_path: path }).eq("id", file.id);
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "non-configurato"
          ? "La conversione dei file Word non è ancora attiva: manca la chiave CloudConvert nelle impostazioni del sito."
          : "Non è stato possibile convertire il documento in PDF. Riprova tra poco o scaricalo e correggilo a parte.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  const { data: blob, error } = await admin.storage.from(BUCKET).download(path);
  if (error || !blob) return NextResponse.json({ error: "File non disponibile" }, { status: 500 });
  return new NextResponse(blob, {
    headers: { "Content-Type": "application/pdf", "Cache-Control": "private, max-age=300" },
  });
}

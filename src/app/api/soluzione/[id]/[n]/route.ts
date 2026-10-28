import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Download dei file della correzione collettiva.
 * Consentito allo staff e ai discenti che hanno ricevuto l'esercizio, dopo la scadenza e a correzione pubblicata.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Non trovato", { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/accedi", request.url));

  const admin = createAdminClient();
  const [{ data: ce }, { data: me }, { data: mine }] = await Promise.all([
    admin.from("course_exercises").select("solution_files, due_at, collective_published").eq("id", id).maybeSingle(),
    admin.from("profiles").select("role, is_super").eq("id", user.id).maybeSingle(),
    admin.from("assignments").select("id").eq("batch_id", id).eq("student_id", user.id).maybeSingle(),
  ]);
  if (!ce) return new NextResponse("Non trovato", { status: 404 });
  const staff = me?.role === "teacher" || me?.role === "admin" || me?.is_super;
  const visible = ce.collective_published && (!ce.due_at || new Date(ce.due_at) < new Date());
  if (!staff && !(mine && visible)) return new NextResponse("Non disponibile", { status: 403 });

  const file = ((ce.solution_files ?? []) as { path: string; name: string }[])[Number(n)];
  if (!file) return new NextResponse("Non trovato", { status: 404 });
  const { data } = await admin.storage.from("materiali").createSignedUrl(file.path, 60, { download: file.name });
  if (!data) return new NextResponse("File non disponibile", { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { icsFile } from "@/lib/calendar";
import { siteUrl } from "@/lib/stripe";
import { SITE } from "@/content/site";

export const dynamic = "force-dynamic";

/**
 * /api/calendario/<id>  → un singolo incontro
 * /api/calendario/tutti → tutti i prossimi incontri visibili all'utente
 * Le RLS decidono cosa l'utente può vedere.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/accedi", request.url));

  let query = supabase
    .from("lessons")
    .select("id, title, summary, scheduled_at, duration_min, location, meeting_url, created_at")
    .eq("kind", "in_presenza")
    .eq("published", true)
    .not("scheduled_at", "is", null);

  if (id === "tutti") query = query.gte("scheduled_at", new Date(Date.now() - 30 * 86400000).toISOString());
  else if (/^[0-9a-f-]{36}$/i.test(id)) query = query.eq("id", id);
  else return new NextResponse("Non trovato", { status: 404 });

  const { data } = await query.order("scheduled_at");
  if (!data?.length) return new NextResponse("Incontro non trovato", { status: 404 });

  const body = icsFile(data, {
    calName: `Lezioni, ${SITE.shortName}`,
    pageUrl: (lid) => `${siteUrl()}/area/lezioni/${lid}`,
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${id === "tutti" ? "lezioni" : "incontro"}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}

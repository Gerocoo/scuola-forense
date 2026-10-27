import { NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { listVideos } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Elenco dei video del canale collegato, per il selettore nel modulo lezione. */
export async function GET(request: Request) {
  const { profile } = await getSession();
  if (!isStaff(profile)) return NextResponse.json({ error: "non autorizzato" }, { status: 401 });

  const page = new URL(request.url).searchParams.get("page") ?? undefined;
  try {
    const result = await listVideos(page);
    if (!result) return NextResponse.json({ error: "non-collegato" }, { status: 409 });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error("[youtube/videos]", e);
    return NextResponse.json({ error: "scaduto" }, { status: 502 });
  }
}

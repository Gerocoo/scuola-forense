import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVideo } from "@/lib/bunny";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook di Bunny Stream (Stream › libreria › Webhook URL):
 *   https://www.tuodominio.it/api/bunny/webhook?secret=<BUNNY_WEBHOOK_SECRET>
 * Il contenuto ricevuto non viene creduto sulla parola: lo stato si rilegge dall'API di Bunny.
 */
export async function POST(req: Request) {
  const secret = process.env.BUNNY_WEBHOOK_SECRET;
  if (!secret || new URL(req.url).searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "non autorizzato" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { VideoGuid?: string } | null;
  const guid = body?.VideoGuid;
  if (!guid || !/^[0-9a-f-]{36}$/i.test(guid)) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  const { data: lesson } = await admin.from("lessons").select("id, duration_min").eq("bunny_video_id", guid).maybeSingle();
  if (!lesson) return NextResponse.json({ ok: true });

  const v = await getVideo(guid).catch(() => null);
  if (v) {
    await admin
      .from("lessons")
      .update({ video_status: v.status, duration_min: lesson.duration_min ?? v.durationMin })
      .eq("id", lesson.id);
  }
  return NextResponse.json({ ok: true });
}

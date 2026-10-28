import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Testo dell'ultima notifica, letto dal service worker quando arriva un push. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const fallback = { title: "Pronao", body: "Hai una novità nella tua area.", url: "/area" };
  if (!user) return NextResponse.json(fallback, { headers: { "Cache-Control": "no-store" } });
  const { data } = await supabase.from("push_last").select("payload").eq("user_id", user.id).maybeSingle();
  return NextResponse.json(data?.payload ?? fallback, { headers: { "Cache-Control": "no-store" } });
}

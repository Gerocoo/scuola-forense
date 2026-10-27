import { NextResponse, type NextRequest } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCode, myChannel, seal } from "@/lib/youtube";
import { siteUrl } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ritorno da Google: salva il collegamento al canale (token cifrato). */
export async function GET(request: NextRequest) {
  const back = (esito: string) => {
    const res = NextResponse.redirect(new URL(`/docente/impostazioni?youtube=${esito}`, request.url));
    res.cookies.delete({ name: "yt_oauth_state", path: "/api/youtube" });
    return res;
  };

  const { user, profile } = await getSession();
  if (!user || !isStaff(profile)) return NextResponse.redirect(new URL("/accedi", request.url));

  const sp = request.nextUrl.searchParams;
  if (sp.get("error")) return back("annullato");
  const code = sp.get("code");
  const state = sp.get("state");
  if (!code || !state || state !== request.cookies.get("yt_oauth_state")?.value) return back("errore");

  try {
    const tokens = await exchangeCode(code, `${siteUrl()}/api/youtube/callback`);
    if (!tokens.refresh_token) return back("errore");
    const channel = await myChannel(tokens.access_token!);
    if (!channel) return back("nessun-canale");

    const { error } = await createAdminClient().from("integrations").upsert({
      provider: "youtube",
      account_id: channel.id,
      account_name: channel.title,
      account_image: channel.image,
      extra: { uploads: channel.uploads },
      secret: seal(tokens.refresh_token),
      connected_by: user.id,
      connected_at: new Date().toISOString(),
    });
    if (error) throw error;
    return back("ok");
  } catch (e) {
    console.error("[youtube/callback]", e);
    return back("errore");
  }
}

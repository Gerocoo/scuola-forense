import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getSession, isStaff } from "@/lib/auth";
import { authUrl, youtubeConfigured } from "@/lib/youtube";
import { siteUrl } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Avvia il collegamento: porta il docente alla pagina di consenso di Google. */
export async function GET(request: Request) {
  const { profile } = await getSession();
  if (!isStaff(profile)) return NextResponse.redirect(new URL("/accedi", request.url));
  if (!youtubeConfigured()) return NextResponse.redirect(new URL("/docente/impostazioni?youtube=non-configurato", request.url));

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authUrl(`${siteUrl()}/api/youtube/callback`, state));
  res.cookies.set("yt_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/youtube", maxAge: 600 });
  return res;
}

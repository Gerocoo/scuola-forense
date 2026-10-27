import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Verifica Google Search Console con il metodo "File HTML": GOOGLE_SITE_VERIFICATION_FILE = nome del file (es. google1a2b3c.html)
  const gfile = process.env.GOOGLE_SITE_VERIFICATION_FILE?.trim();
  if (gfile && request.nextUrl.pathname === `/${gfile}`) {
    return new NextResponse(`google-site-verification: ${gfile}`, { headers: { "content-type": "text/html; charset=utf-8" } });
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    // Tutto tranne file statici, immagini e webhook Stripe (che deve ricevere il corpo grezzo).
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

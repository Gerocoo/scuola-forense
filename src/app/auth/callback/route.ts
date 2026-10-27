import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

/** Ritorno da Google, conferma email e link di reimpostazione password (flusso PKCE). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // foto del profilo Google: la copiamo nel profilo se manca (es. account creato prima con email e password)
      const meta = data.user?.user_metadata ?? {};
      const avatar = (meta.avatar_url as string | undefined) || (meta.picture as string | undefined);
      if (data.user && avatar) {
        await supabase.from("profiles").update({ avatar_url: avatar }).eq("id", data.user.id).is("avatar_url", null);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback]", error.message);
  }

  return NextResponse.redirect(`${origin}/accedi?errore=link`);
}

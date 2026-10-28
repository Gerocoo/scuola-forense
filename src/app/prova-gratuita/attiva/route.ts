import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Attiva il corso di prova per l'utente collegato e lo porta alle esercitazioni. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const origin = new URL(request.url).origin;
  if (!user) return NextResponse.redirect(`${origin}/accedi?next=/prova-gratuita/attiva`);

  const admin = createAdminClient();
  const { data: pkg } = await admin.from("packages").select("id").eq("slug", "prova-gratuita").maybeSingle();
  if (!pkg) return NextResponse.redirect(`${origin}/prova-gratuita`);

  const { data: existing } = await admin.from("enrollments").select("id").eq("user_id", user.id).eq("package_id", pkg.id).maybeSingle();
  if (!existing) {
    await admin.from("enrollments").insert({
      user_id: user.id,
      package_id: pkg.id,
      status: "active",
      amount_cents: 0,
      ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    await admin
      .from("leads")
      .upsert({ email: (user.email ?? "").toLowerCase(), name: (user.user_metadata?.full_name as string) ?? "", source: "prova-gratuita", user_id: user.id }, { onConflict: "email,source" });
  }
  return NextResponse.redirect(`${origin}/area/esercitazioni?prova=1`);
}

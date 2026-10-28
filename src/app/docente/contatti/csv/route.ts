import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("leads").select("name, email, source, user_id, created_at").order("created_at", { ascending: false });
  if (error) return new NextResponse("Non autorizzato", { status: 403 });
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = ["Nome;Email;Origine;Account;Data", ...(data ?? []).map((r) => [r.name, r.email, r.source, r.user_id ? "sì" : "no", new Date(r.created_at).toLocaleDateString("it-IT")].map(esc).join(";"))];
  return new NextResponse("﻿" + lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="contatti.csv"' },
  });
}

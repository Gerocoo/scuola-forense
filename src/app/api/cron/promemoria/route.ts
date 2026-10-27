import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookedStudents, enrolledStudents, inBatches } from "@/lib/recipients";
import { emailLayout, escapeHtml, notify } from "@/lib/notify";
import { googleCalendarUrl } from "@/lib/calendar";
import { dateTime } from "@/lib/format";
import { siteUrl } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Promemoria del giorno prima per gli incontri in presenza.
 * Lanciato ogni mattina da Vercel Cron (vercel.json) con l'intestazione
 * "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "non autorizzato" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const { data: lessons } = await admin
    .from("lessons")
    .select("id, title, summary, scheduled_at, duration_min, location, meeting_url, package_ids, booking_enabled")
    .eq("kind", "in_presenza")
    .eq("published", true)
    .is("reminder_sent_at", null)
    .gte("scheduled_at", new Date(now + 12 * 3600000).toISOString())
    .lte("scheduled_at", new Date(now + 36 * 3600000).toISOString());

  const report: { lesson: string; sent: number }[] = [];

  for (const l of lessons ?? []) {
    // segna subito come inviato: se la funzione si interrompe non si rischiano email doppie
    const { data: claimed } = await admin
      .from("lessons")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", l.id)
      .is("reminder_sent_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const recipients = l.booking_enabled ? await bookedStudents(l.id) : await enrolledStudents(l.package_ids ?? []);
    const page = `${siteUrl()}/area/lezioni/${l.id}`;
    const gcal = googleCalendarUrl(l, page);

    await inBatches(recipients, 5, (r) =>
      notify({
        to: r.email,
        subject: `Domani: ${l.title}`,
        html: emailLayout(
          "Ci vediamo domani",
          `<p>Ti ricordiamo l'incontro <strong>${escapeHtml(l.title)}</strong>.</p>
           <p><strong>${dateTime(l.scheduled_at)}</strong>${l.location ? `<br>${escapeHtml(l.location)}` : ""}</p>
           ${l.meeting_url ? `<p>Se non puoi venire in aula, segui la diretta: <a href="${l.meeting_url}">${escapeHtml(l.meeting_url)}</a></p>` : ""}
           ${gcal ? `<p><a href="${gcal}">Aggiungi a Google Calendar</a></p>` : ""}`,
          { label: "Vedi i dettagli", href: page },
        ),
      }),
    );
    report.push({ lesson: l.title, sent: recipients.length });
  }

  return NextResponse.json({ ok: true, report });
}

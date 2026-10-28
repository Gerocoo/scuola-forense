import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookedStudents, enrolledStudents, inBatches } from "@/lib/recipients";
import { emailLayout, escapeHtml, notify } from "@/lib/notify";
import { googleCalendarUrl } from "@/lib/calendar";
import { dateTime } from "@/lib/format";
import { siteUrl } from "@/lib/stripe";
import { courseCommitments, romeMonth, urgency } from "@/lib/commitments";
import { euro } from "@/lib/format";

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

  /* ---- correzioni in attesa da 5 giorni: promemoria al docente (impegno: entro 7 giorni) ---- */
  const { data: late } = await admin
    .from("assignments")
    .select("id, title, teacher_id, student_id, submitted_at")
    .eq("status", "consegnato")
    .is("correction_reminder_at", null)
    .lte("submitted_at", new Date(now - 5 * 86400000).toISOString())
    .limit(500);

  let teachersReminded = 0;
  if (late?.length) {
    const ids = [...new Set(late.flatMap((a) => [a.teacher_id, a.student_id]))];
    const { data: people } = await admin.from("profiles").select("id, full_name, email").in("id", ids);
    const person = new Map((people ?? []).map((p) => [p.id, p]));
    const byTeacher = new Map<string, typeof late>();
    for (const a of late) byTeacher.set(a.teacher_id, [...(byTeacher.get(a.teacher_id) ?? []), a]);

    for (const [tid, items] of byTeacher) {
      const t = person.get(tid);
      if (!t?.email) continue;
      const rows = items
        .map((a) => {
          const deadline = new Date(new Date(a.submitted_at!).getTime() + 7 * 86400000);
          const s = person.get(a.student_id);
          return `<li style="margin-bottom:6px"><a href="${siteUrl()}/docente/esercitazioni/${a.id}">${escapeHtml(a.title)}</a> · ${escapeHtml(s?.full_name || s?.email || "discente")} · entro il ${deadline.toLocaleDateString("it-IT", { day: "numeric", month: "long" })}</li>`;
        })
        .join("");
      await notify({
        to: t.email,
        subject: items.length > 1 ? `${items.length} elaborati da correggere entro 7 giorni` : `Elaborato da correggere: ${items[0].title}`,
        html: emailLayout(
          "Correzioni in scadenza",
          `<p>Questi elaborati sono stati consegnati da almeno 5 giorni. Ai discenti è garantita la correzione entro 7 giorni dalla consegna.</p><ul style="padding-left:18px">${rows}</ul>`,
          { label: "Apri le esercitazioni", href: `${siteUrl()}/docente/esercitazioni?stato=da-correggere` },
        ),
      });
      await admin.from("assignments").update({ correction_reminder_at: new Date().toISOString() }).in("id", items.map((a) => a.id));
      teachersReminded++;
    }
  }

  /* ---- impegni mensili: materiale promesso agli iscritti ---- */
  const month = romeMonth();
  const REMIND_ON = [10, 5, 3, 2, 1]; // giorni mancanti alla fine del mese
  let commitmentEmails = 0;
  const commitments = await courseCommitments(admin);
  const firstOfMonth = month.day === 1;

  if (commitments.length && (firstOfMonth || REMIND_ON.includes(month.daysLeft))) {
    const { data: links } = await admin
      .from("package_teachers")
      .select("package_id, teacher:profiles(id, full_name, email)")
      .in("package_id", commitments.map((c) => c.packageId));
    const { data: admins } = await admin.from("profiles").select("id, full_name, email").or("role.eq.admin,is_super.eq.true");

    type Person = { id: string; full_name: string | null; email: string };
    const byTeacher = new Map<string, { t: Person; items: typeof commitments }>();
    for (const c of commitments) {
      if (!firstOfMonth && c.missing === 0) continue;
      const team = (links ?? [])
        .filter((l: { package_id: string }) => l.package_id === c.packageId)
        .map((l: { teacher: Person | Person[] | null }) => (Array.isArray(l.teacher) ? l.teacher[0] : l.teacher))
        .filter(Boolean) as Person[];
      for (const t of team.length ? team : ((admins ?? []) as Person[])) {
        const g = byTeacher.get(t.id) ?? { t, items: [] };
        g.items.push(c);
        byTeacher.set(t.id, g);
      }
    }

    const block = (c: (typeof commitments)[number]) => {
      const rows = c.items
        .map((i) => {
          const ok = i.done >= i.promised;
          return `<tr><td style="padding:4px 12px 4px 0">${escapeHtml(i.label)}</td><td style="padding:4px 0;font-weight:600;color:${ok ? "#1d5747" : "#a3301d"}">${i.done} di ${i.promised}${ok ? " ✓" : ""}</td></tr>`;
        })
        .join("");
      return `<div style="margin:0 0 18px;padding:14px 16px;border:1px solid #d9d6cf;border-radius:12px">
        <p style="margin:0 0 6px;font-weight:600"><a href="${siteUrl()}/docente/corsi/${c.packageId}" style="color:#1d1d1f">${escapeHtml(c.title)}</a></p>
        <table style="border-collapse:collapse;font-size:15px">${rows}</table></div>`;
    };

    await inBatches([...byTeacher.values()], 5, async ({ t, items }) => {
      if (!t.email) return;
      const missing = items.reduce((s, c) => s + c.missing, 0);
      const subject = firstOfMonth
        ? `Impegni di ${month.label}: il materiale da pubblicare`
        : month.daysLeft === 1
          ? `Ultimo giorno: ${missing} ${missing === 1 ? "contenuto" : "contenuti"} ancora da pubblicare`
          : `Mancano ${month.daysLeft} giorni: ${missing} ${missing === 1 ? "contenuto" : "contenuti"} da pubblicare`;
      const intro = firstOfMonth
        ? `<p>Ecco il materiale che i corsi hanno promesso agli iscritti per <strong>${month.label}</strong>. Riceverai un promemoria se a fine mese mancherà qualcosa.</p>`
        : `<p>${t.full_name ? `${escapeHtml(t.full_name.split(" ")[0])}, ` : ""}per rispettare quanto venduto agli iscritti, entro la fine di ${month.label} ${missing === 1 ? "manca ancora un contenuto" : `mancano ancora ${missing} contenuti`}. ${urgency(items[0]).tone === "late" ? "Il mese sta per chiudersi." : ""}</p>`;
      await notify({
        to: t.email,
        subject,
        html: emailLayout(firstOfMonth ? "Impegni del mese" : "Materiale da pubblicare", `${intro}${items.map(block).join("")}`, {
          label: "Apri i tuoi corsi",
          href: `${siteUrl()}/docente/corsi`,
        }),
      });
      commitmentEmails++;
    });

    /* riepilogo per la direzione negli ultimi 3 giorni: chi è in ritardo */
    const late = commitments.filter((c) => c.missing > 0);
    if (!firstOfMonth && month.daysLeft <= 3 && late.length) {
      await inBatches(((admins ?? []) as Person[]).filter((a) => a.email && !byTeacher.has(a.id)), 5, (a) =>
        notify({
          to: a.email,
          subject: `${late.length} ${late.length === 1 ? "corso" : "corsi"} indietro con il materiale di ${month.label}`,
          html: emailLayout("Impegni non ancora rispettati", `<p>Corsi con materiale promesso ancora da pubblicare a ${month.daysLeft} ${month.daysLeft === 1 ? "giorno" : "giorni"} dalla fine del mese.</p>${late.map(block).join("")}`, {
            label: "Apri i corsi",
            href: `${siteUrl()}/docente/corsi`,
          }),
        }),
      );
    }
  }

  /* ---- bonifici in attesa da oltre 7 giorni: riepilogo del lunedì alla direzione ---- */
  let transfersReminded = 0;
  const weekday = new Date().toLocaleDateString("en-GB", { weekday: "short", timeZone: "Europe/Rome" });
  if (weekday === "Mon") {
    const { data: waiting } = await admin
      .from("enrollments")
      .select("id, amount_cents, created_at, student:profiles!enrollments_user_id_fkey(full_name, email), package:packages(title)")
      .eq("status", "pending")
      .lte("created_at", new Date(now - 7 * 86400000).toISOString());
    if (waiting?.length) {
      const one = <T,>(x: unknown) => ((Array.isArray(x) ? x[0] : x) ?? null) as T | null;
      const rows = waiting
        .map((w) => {
          const st = one<{ full_name: string | null; email: string }>(w.student);
          const pk = one<{ title: string }>(w.package);
          return `<li style="margin-bottom:6px">${escapeHtml(st?.full_name || st?.email || "discente")} · ${escapeHtml(pk?.title ?? "")} · ${euro(w.amount_cents)} · dal ${new Date(w.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}</li>`;
        })
        .join("");
      const { data: heads } = await admin.from("profiles").select("email").or("role.eq.admin,is_super.eq.true");
      await inBatches((heads ?? []).filter((h) => h.email), 5, (h) =>
        notify({
          to: h.email,
          subject: `${waiting.length} ${waiting.length === 1 ? "bonifico" : "bonifici"} in attesa da più di una settimana`,
          html: emailLayout("Bonifici da verificare", `<p>Queste iscrizioni sono registrate ma il pagamento non risulta ancora arrivato. Controlla l'estratto conto e segnale come pagate.</p><ul style="padding-left:18px">${rows}</ul>`, {
            label: "Apri i pagamenti",
            href: `${siteUrl()}/docente/pagamenti`,
          }),
        }),
      );
      transfersReminded = waiting.length;
    }
  }

  return NextResponse.json({ ok: true, report, teachersReminded, commitmentEmails, transfersReminded });
}

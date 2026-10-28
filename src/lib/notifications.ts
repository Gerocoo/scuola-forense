import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import { courseCommitments, urgency } from "@/lib/commitments";
import { myCourseIds } from "@/lib/courses";

export type NoticeKind = "messaggio" | "consegna" | "correzione" | "traccia" | "incontro" | "impegno";

export type Notice = {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  href: string;
  at: string;
};

const DAY = 86_400_000;

async function names(supabase: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", [...new Set(ids)]);
  return new Map<string, string>((data ?? []).map((p: { id: string; full_name: string; email: string }) => [p.id, p.full_name || p.email]));
}

function groupMessages(rows: { counterpart: string; body: string; created_at: string }[]) {
  const map = new Map<string, { count: number; body: string; at: string }>();
  for (const r of rows) {
    const g = map.get(r.counterpart);
    if (g) g.count++;
    else map.set(r.counterpart, { count: 1, body: r.body, at: r.created_at });
  }
  return map;
}

const excerpt = (s: string) => (s.length > 90 ? `${s.slice(0, 90).trim()}…` : s);

/** Novità per docenti e amministratori: messaggi non letti, consegne da correggere, incontri dei prossimi giorni. */
export async function staffNotices(supabase: SupabaseClient, me: Pick<Profile, "id" | "role"> & { is_super?: boolean | null }): Promise<Notice[]> {
  const now = Date.now();
  const soon = new Date(now + 7 * DAY).toISOString();

  let deliveries = supabase
    .from("assignments")
    .select("id, title, student_id, submitted_at")
    .eq("status", "consegnato")
    .order("submitted_at", { ascending: false })
    .limit(15);
  if (me.role !== "admin") deliveries = deliveries.eq("teacher_id", me.id);

  const [{ data: msgs }, { data: subs }, { data: meetings }] = await Promise.all([
    supabase
      .from("messages")
      .select("student_id, body, created_at")
      .eq("teacher_id", me.id)
      .neq("sender_id", me.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    deliveries,
    supabase
      .from("lessons")
      .select("id, title, scheduled_at, location")
      .eq("kind", "in_presenza")
      .gte("scheduled_at", new Date(now).toISOString())
      .lte("scheduled_at", soon)
      .order("scheduled_at")
      .limit(5),
  ]);

  const who = await names(supabase, [
    ...(msgs ?? []).map((m: { student_id: string }) => m.student_id),
    ...(subs ?? []).map((s: { student_id: string }) => s.student_id),
  ]);

  const out: Notice[] = [];
  for (const [sid, g] of groupMessages((msgs ?? []).map((m: { student_id: string; body: string; created_at: string }) => ({ counterpart: m.student_id, body: m.body, created_at: m.created_at })))) {
    out.push({
      id: `m-${sid}-${g.at}`,
      kind: "messaggio",
      title: g.count > 1 ? `${g.count} messaggi da ${who.get(sid) ?? "un discente"}` : `Messaggio da ${who.get(sid) ?? "un discente"}`,
      body: excerpt(g.body),
      href: `/docente/messaggi/${sid}`,
      at: g.at,
    });
  }
  for (const s of (subs ?? []) as { id: string; title: string; student_id: string; submitted_at: string | null }[]) {
    out.push({
      id: `c-${s.id}`,
      kind: "consegna",
      title:
        s.submitted_at && now - new Date(s.submitted_at).getTime() > 5 * DAY
          ? `Da correggere entro ${new Date(new Date(s.submitted_at).getTime() + 7 * DAY).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}`
          : `${who.get(s.student_id) ?? "Un discente"} ha consegnato`,
      body: s.title,
      href: `/docente/esercitazioni/${s.id}`,
      at: s.submitted_at ?? new Date(now).toISOString(),
    });
  }
  for (const l of (meetings ?? []) as { id: string; title: string; scheduled_at: string; location: string | null }[]) {
    out.push({
      id: `i-${l.id}`,
      kind: "incontro",
      title: "Incontro in arrivo",
      body: `${l.title}${l.location ? ` · ${l.location}` : ""}`,
      href: `/docente/lezioni/${l.id}`,
      at: l.scheduled_at,
    });
  }
  // impegni mensili: negli ultimi 10 giorni del mese il promemoria torna "nuovo" ogni giorno finché il materiale manca
  try {
    const commitments = await courseCommitments(supabase, await myCourseIds(supabase, me));
    const today = new Date();
    today.setUTCHours(6, 0, 0, 0);
    for (const c of commitments) {
      if (c.missing === 0 || c.daysLeft > 10) continue;
      const missing = c.items.filter((i) => i.done < i.promised).map((i) => `${i.label.toLowerCase()} ${i.done}/${i.promised}`);
      out.push({
        id: `c-${c.packageId}-${today.toISOString().slice(0, 10)}`,
        kind: "impegno",
        title: `${c.title}: materiale da pubblicare`,
        body: `${urgency(c).text}. Mancano: ${missing.join(", ")}.`,
        href: `/docente/corsi/${c.packageId}`,
        at: today.toISOString(),
      });
    }
  } catch {
    /* gli impegni non devono mai bloccare la campanella */
  }

  return out.sort((a, b) => (a.kind === "impegno" ? 0 : 1) - (b.kind === "impegno" ? 0 : 1) || (a.kind === "incontro" ? 1 : 0) - (b.kind === "incontro" ? 1 : 0) || b.at.localeCompare(a.at));
}

/** Novità per il discente: messaggi, correzioni, nuove tracce, incontri dei prossimi giorni. */
export async function studentNotices(supabase: SupabaseClient, me: Pick<Profile, "id">): Promise<Notice[]> {
  const now = Date.now();
  const since = new Date(now - 21 * DAY).toISOString();
  const soon = new Date(now + 7 * DAY).toISOString();

  const [{ data: msgs }, { data: corrected }, { data: fresh }, { data: meetings }] = await Promise.all([
    supabase
      .from("messages")
      .select("teacher_id, body, created_at")
      .eq("student_id", me.id)
      .neq("sender_id", me.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("assignments")
      .select("id, title, corrected_at")
      .eq("student_id", me.id)
      .eq("status", "corretto")
      .gte("corrected_at", since)
      .order("corrected_at", { ascending: false })
      .limit(10),
    supabase
      .from("assignments")
      .select("id, title, created_at, due_at")
      .eq("student_id", me.id)
      .eq("status", "assegnato")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("lessons")
      .select("id, title, scheduled_at, location")
      .eq("kind", "in_presenza")
      .eq("published", true)
      .gte("scheduled_at", new Date(now).toISOString())
      .lte("scheduled_at", soon)
      .order("scheduled_at")
      .limit(5),
  ]);

  const who = await names(supabase, (msgs ?? []).map((m: { teacher_id: string }) => m.teacher_id));
  const out: Notice[] = [];
  for (const [tid, g] of groupMessages((msgs ?? []).map((m: { teacher_id: string; body: string; created_at: string }) => ({ counterpart: m.teacher_id, body: m.body, created_at: m.created_at })))) {
    out.push({
      id: `m-${tid}-${g.at}`,
      kind: "messaggio",
      title: g.count > 1 ? `${g.count} messaggi da ${who.get(tid) ?? "un docente"}` : `Messaggio da ${who.get(tid) ?? "un docente"}`,
      body: excerpt(g.body),
      href: `/area/messaggi/${tid}`,
      at: g.at,
    });
  }
  for (const a of (corrected ?? []) as { id: string; title: string; corrected_at: string }[]) {
    out.push({ id: `k-${a.id}`, kind: "correzione", title: "Correzione disponibile", body: a.title, href: `/area/esercitazioni/${a.id}`, at: a.corrected_at });
  }
  for (const a of (fresh ?? []) as { id: string; title: string; created_at: string }[]) {
    out.push({ id: `t-${a.id}`, kind: "traccia", title: "Nuova traccia da svolgere", body: a.title, href: `/area/esercitazioni/${a.id}`, at: a.created_at });
  }
  for (const l of (meetings ?? []) as { id: string; title: string; scheduled_at: string; location: string | null }[]) {
    out.push({
      id: `i-${l.id}`,
      kind: "incontro",
      title: "Incontro in arrivo",
      body: `${l.title}${l.location ? ` · ${l.location}` : ""}`,
      href: `/area/lezioni/${l.id}`,
      at: l.scheduled_at,
    });
  }
  return out.sort((a, b) => (a.kind === "incontro" ? 1 : 0) - (b.kind === "incontro" ? 1 : 0) || b.at.localeCompare(a.at));
}

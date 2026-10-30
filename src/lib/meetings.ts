import type { SupabaseClient } from "@supabase/supabase-js";
import { googleCalendarUrl } from "@/lib/calendar";
import { siteUrl } from "@/lib/stripe";
import type { MeetingView } from "@/components/app/Meetings";

type Row = Omit<MeetingView, "otherName" | "otherId" | "calendarUrl"> & {
  student_id: string;
  teacher_id: string;
  student: { full_name: string | null; email: string } | null;
  teacher: { full_name: string | null; email: string } | null;
};

const MODE = { video: "Videochiamata", presenza: "In sede", telefono: "Telefono" } as const;

/** Colloqui dell'utente: da gestire, in programma, passati o annullati. */
export async function loadMeetings(supabase: SupabaseClient, meId: string, side: "student" | "teacher", all = false) {
  let q = supabase
    .from("meetings")
    .select(
      "id, topic, note, status, starts_at, duration_min, mode, place, proposed_by, kind, student_id, teacher_id, student:profiles!meetings_student_id_fkey(full_name, email), teacher:profiles!meetings_teacher_id_fkey(full_name, email)",
    )
    .order("starts_at", { ascending: true, nullsFirst: true })
    .limit(300);
  if (!all) q = q.eq(side === "student" ? "student_id" : "teacher_id", meId);
  const { data } = await q.returns<Row[]>();
  const base = siteUrl();
  const list: MeetingView[] = (data ?? []).map((r) => {
    const other = side === "student" ? r.teacher : r.student;
    const otherName = other?.full_name || other?.email || "";
    return {
      id: r.id,
      topic: r.topic,
      note: r.note,
      status: r.status,
      starts_at: r.starts_at,
      duration_min: r.duration_min,
      mode: r.mode,
      place: r.place,
      proposed_by: r.proposed_by,
      kind: r.kind ?? "colloquio",
      otherName: all && side === "teacher" && r.teacher_id !== meId ? `${otherName} (docente: ${r.teacher?.full_name || r.teacher?.email})` : otherName,
      otherId: side === "student" ? r.teacher_id : r.student_id,
      calendarUrl: googleCalendarUrl(
        {
          title: `${r.kind === "lezione" ? "Lezione privata" : r.kind === "revisione" ? "Revisione elaborato" : "Colloquio"}: ${r.topic}`,
          summary: `Colloquio con ${otherName}`,
          scheduled_at: r.starts_at,
          duration_min: r.duration_min,
          location: r.mode === "presenza" ? r.place : MODE[r.mode],
          meeting_url: r.mode === "video" && /^https?:/.test(r.place) ? r.place : null,
        },
        `${base}/${side === "student" ? "area" : "docente"}/colloqui`,
      ),
    };
  });
  const now = Date.now();
  const actionable = (m: MeetingView) =>
    m.status === "proposed" ? m.proposed_by !== meId : m.status === "requested" && side === "teacher";
  const toHandle = list.filter((m) => m.status !== "cancelled" && actionable(m) && (!m.starts_at || new Date(m.starts_at).getTime() > now - 3600000));
  const upcoming = list.filter((m) => !toHandle.includes(m) && m.status !== "cancelled" && (!m.starts_at || new Date(m.starts_at).getTime() > now - 3600000));
  const past = list
    .filter((m) => !toHandle.includes(m) && !upcoming.includes(m))
    .sort((a, b) => (b.starts_at ?? "").localeCompare(a.starts_at ?? ""));
  return { toHandle, upcoming, past };
}

/** Numero di colloqui che aspettano una mia risposta (per il menu). */
export async function meetingsToHandle(supabase: SupabaseClient, meId: string, side: "student" | "teacher") {
  const col = side === "student" ? "student_id" : "teacher_id";
  const soon = new Date(Date.now() - 3600000).toISOString();
  const [{ count: proposed }, { count: requested }] = await Promise.all([
    supabase.from("meetings").select("id", { count: "exact", head: true }).eq(col, meId).eq("status", "proposed").neq("proposed_by", meId).gte("starts_at", soon),
    side === "teacher"
      ? supabase.from("meetings").select("id", { count: "exact", head: true }).eq(col, meId).eq("status", "requested")
      : Promise.resolve({ count: 0 }),
  ]);
  return (proposed ?? 0) + (requested ?? 0);
}

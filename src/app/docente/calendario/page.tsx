import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { MonthCalendar, monthRange, parseMonth, type CalendarEvent } from "@/components/app/MonthCalendar";
import { requireStaff } from "@/lib/auth";
import { myCourseIds } from "@/lib/courses";
import type { Lesson } from "@/lib/types";

export const metadata = { title: "Calendario" };

type Props = { searchParams: Promise<{ mese?: string }> };

export default async function CalendarioDocente({ searchParams }: Props) {
  const { y, m } = parseMonth((await searchParams).mese);
  const { from, to } = monthRange(y, m);
  const { supabase, profile } = await requireStaff();

  let query = supabase
    .from("lessons")
    .select("id, title, scheduled_at, location, published, booking_enabled, capacity")
    .eq("kind", "in_presenza")
    .gte("scheduled_at", from)
    .lt("scheduled_at", to);
  // il docente vede gli incontri dei suoi corsi e quelli creati da lui; l'amministratore tutti
  if (profile.role !== "admin") {
    const ids = await myCourseIds(supabase, profile);
    query = query.or(ids.length ? `teacher_id.eq.${profile.id},package_ids.ov.{${ids.join(",")}}` : `teacher_id.eq.${profile.id}`);
  }
  const { data: lessons } = await query.returns<Pick<Lesson, "id" | "title" | "scheduled_at" | "location" | "published" | "booking_enabled" | "capacity">[]>();

  const ids = (lessons ?? []).map((l) => l.id);
  const { data: bookings } = ids.length
    ? await supabase.from("lesson_bookings").select("lesson_id").in("lesson_id", ids).eq("status", "confermato").returns<{ lesson_id: string }[]>()
    : { data: [] as { lesson_id: string }[] };
  const count = (id: string) => (bookings ?? []).filter((b) => b.lesson_id === id).length;

  const events: CalendarEvent[] = (lessons ?? []).map((l) => ({
    id: l.id,
    date: l.scheduled_at!,
    title: l.published ? l.title : `${l.title} (bozza)`,
    href: `/docente/lezioni/${l.id}`,
    tone: l.published ? "lezione" : "bozza",
    note: [l.location, l.booking_enabled ? `${count(l.id)}${l.capacity ? `/${l.capacity}` : ""} prenotati` : ""].filter(Boolean).join(", "),
  }));

  return (
    <>
      <PageHeader
        title="Calendario"
        description={profile.role === "admin" ? "Gli incontri in presenza di tutti i corsi. Le bozze non sono visibili ai discenti." : "Gli incontri in presenza dei tuoi corsi. Le bozze non sono visibili ai discenti."}
        actions={<Link href="/docente/lezioni/nuova?tipo=in_presenza" className="btn-primary">Nuovo incontro</Link>}
      />
      <MonthCalendar y={y} m={m} events={events} basePath="/docente/calendario" />
    </>
  );
}

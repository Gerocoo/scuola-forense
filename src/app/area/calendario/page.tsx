import { PageHeader } from "@/components/app/AppShell";
import { MonthCalendar, monthRange, parseMonth, type CalendarEvent } from "@/components/app/MonthCalendar";
import { requireUser } from "@/lib/auth";
import type { Assignment, Lesson } from "@/lib/types";

export const metadata = { title: "Calendario" };

type Props = { searchParams: Promise<{ mese?: string }> };

export default async function CalendarioDiscente({ searchParams }: Props) {
  const { y, m } = parseMonth((await searchParams).mese);
  const { from, to } = monthRange(y, m);
  const { supabase, user } = await requireUser();

  const [{ data: lessons }, { data: deadlines }, { data: bookings }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title, scheduled_at, location, booking_enabled")
      .eq("kind", "in_presenza")
      .gte("scheduled_at", from)
      .lt("scheduled_at", to)
      .returns<Pick<Lesson, "id" | "title" | "scheduled_at" | "location" | "booking_enabled">[]>(),
    supabase
      .from("assignments")
      .select("id, title, due_at, status")
      .eq("student_id", user.id)
      .eq("status", "assegnato")
      .gte("due_at", from)
      .lt("due_at", to)
      .returns<Pick<Assignment, "id" | "title" | "due_at" | "status">[]>(),
    supabase.from("lesson_bookings").select("lesson_id").eq("user_id", user.id).eq("status", "confermato").returns<{ lesson_id: string }[]>(),
  ]);

  const booked = new Set((bookings ?? []).map((b) => b.lesson_id));

  const events: CalendarEvent[] = [
    ...(lessons ?? []).map((l) => ({
      id: l.id,
      date: l.scheduled_at!,
      title: l.title,
      href: `/area/lezioni/${l.id}`,
      tone: "lezione" as const,
      note: [l.location, l.booking_enabled ? (booked.has(l.id) ? "Posto prenotato" : "Da prenotare") : ""].filter(Boolean).join(", "),
    })),
    ...(deadlines ?? []).map((a) => ({
      id: a.id,
      date: a.due_at!,
      title: `Consegna: ${a.title}`,
      href: `/area/esercitazioni/${a.id}`,
      tone: "scadenza" as const,
    })),
  ];

  return (
    <>
      <PageHeader
        title="Calendario"
        description="Incontri in presenza e scadenze delle tue tracce."
        actions={
          <a href="/api/calendario/tutti" className="btn-secondary">Scarica tutti gli incontri (.ics)</a>
        }
      />
      <MonthCalendar y={y} m={m} events={events} basePath="/area/calendario" />
      <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate">
        <span><span aria-hidden className="mr-1.5 inline-block size-2.5 rounded-sm bg-codice align-middle" />Incontro in presenza</span>
        <span><span aria-hidden className="mr-1.5 inline-block size-2.5 rounded-sm bg-ceralacca-soft align-middle ring-1 ring-ceralacca/40" />Scadenza di consegna</span>
      </p>
    </>
  );
}

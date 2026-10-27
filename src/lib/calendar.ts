import type { Lesson } from "./types";

const DEFAULT_MIN = 120;

function endOf(l: Pick<Lesson, "scheduled_at" | "duration_min">) {
  return new Date(new Date(l.scheduled_at!).getTime() + (l.duration_min ?? DEFAULT_MIN) * 60000);
}

/** 20270301T170000Z */
function stamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(l: Pick<Lesson, "title" | "summary" | "scheduled_at" | "duration_min" | "location" | "meeting_url">, pageUrl: string) {
  if (!l.scheduled_at) return null;
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: l.title,
    dates: `${stamp(new Date(l.scheduled_at))}/${stamp(endOf(l))}`,
    details: [l.summary, l.meeting_url ? `Diretta: ${l.meeting_url}` : "", `Dettagli: ${pageUrl}`].filter(Boolean).join("\n\n"),
    location: l.location ?? "",
    ctz: "Europe/Rome",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Righe .ics piegate a 75 caratteri come richiede lo standard. */
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

export function icsFile(
  lessons: Pick<Lesson, "id" | "title" | "summary" | "scheduled_at" | "duration_min" | "location" | "meeting_url" | "created_at">[],
  opts: { calName: string; pageUrl: (id: string) => string },
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Margine Scuola Forense//Lezioni//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(opts.calName)}`,
    "X-WR-TIMEZONE:Europe/Rome",
  ];
  for (const l of lessons) {
    if (!l.scheduled_at) continue;
    const url = opts.pageUrl(l.id);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${l.id}@margine-scuola-forense`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(new Date(l.scheduled_at))}`,
      `DTEND:${stamp(endOf(l))}`,
      `SUMMARY:${esc(l.title)}`,
      `DESCRIPTION:${esc([l.summary, l.meeting_url ? `Diretta: ${l.meeting_url}` : "", url].filter(Boolean).join("\n\n"))}`,
      ...(l.location ? [`LOCATION:${esc(l.location)}`] : []),
      `URL:${url}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(l.title)}`,
      "TRIGGER:-PT1H",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

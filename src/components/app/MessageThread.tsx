import Link from "next/link";
import { dateTime } from "@/lib/format";
import type { Message } from "@/lib/types";

/** Conversazione asincrona: i messaggi più vecchi in alto, come una corrispondenza. */
export function MessageThread({
  messages,
  meId,
  otherName,
  assignmentHref,
  assignmentTitles,
}: {
  messages: Message[];
  meId: string;
  otherName: string;
  assignmentHref: (id: string) => string;
  assignmentTitles: Record<string, string>;
}) {
  if (!messages.length) {
    return (
      <p className="rounded-[10px] border border-dashed border-line px-5 py-8 text-center text-[15px] text-slate">
        Nessun messaggio con {otherName}. Scrivi qui sotto: riceverà una notifica via email.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {messages.map((m) => {
        const mine = m.sender_id === meId;
        return (
          <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <article
              className={`max-w-[min(620px,90%)] rounded-[12px] px-4 py-3 ${
                mine ? "bg-codice text-white" : "border border-line bg-surface text-ink"
              }`}
            >
              <header className={`mb-1 flex flex-wrap items-baseline gap-x-2 text-sm ${mine ? "text-white/75" : "text-mute"}`}>
                <span className="font-medium">{mine ? "Tu" : otherName}</span>
                <time dateTime={m.created_at}>{dateTime(m.created_at)}</time>
              </header>
              {m.assignment_id && assignmentTitles[m.assignment_id] && (
                <Link
                  href={assignmentHref(m.assignment_id)}
                  className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-sm ${
                    mine ? "bg-white/15 text-white" : "bg-codice-soft text-codice"
                  }`}
                >
                  Riguarda: {assignmentTitles[m.assignment_id]}
                </Link>
              )}
              <p className="whitespace-pre-wrap break-words text-[16px] leading-relaxed">{m.body}</p>
              {mine && (
                <p className="mt-1 text-right text-xs text-white/60">{m.read_at ? "Letto" : "Non ancora letto"}</p>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}

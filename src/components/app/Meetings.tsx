"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { acceptMeeting, cancelMeeting, proposeMeeting, requestMeeting, scheduleMeeting } from "@/app/actions/meetings";

export type MeetingView = {
  id: string;
  topic: string;
  note: string;
  status: "requested" | "proposed" | "confirmed" | "cancelled";
  starts_at: string | null;
  duration_min: number;
  mode: "video" | "presenza" | "telefono";
  place: string;
  proposed_by: string | null;
  otherName: string;
  otherId: string;
  calendarUrl: string | null;
};

const MODE_LABEL = { video: "Videochiamata", presenza: "In sede", telefono: "Telefono" } as const;

const when = (iso: string) =>
  new Date(iso).toLocaleString("it-IT", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

/** Valore minimo per i campi data/ora: adesso, ora di Roma. */
function nowLocal() {
  return new Date().toLocaleString("sv-SE", { timeZone: "Europe/Rome" }).slice(0, 16).replace(" ", "T");
}

function Msg({ m }: { m: { ok: boolean; text: string } | null }) {
  if (!m) return null;
  return <p role={m.ok ? "status" : "alert"} className={`text-[14px] ${m.ok ? "text-codice" : "text-ceralacca"}`}>{m.text}</p>;
}

/** Stato del colloquio dal punto di vista di chi guarda. */
export function meetingState(m: MeetingView, meId: string, staff: boolean) {
  if (m.status === "cancelled") return { label: "Annullato", tone: "mute", mine: false } as const;
  if (m.status === "confirmed") return { label: "Confermato", tone: "ok", mine: false } as const;
  if (m.status === "requested") return staff ? ({ label: "Da fissare", tone: "act", mine: true } as const) : ({ label: "In attesa del docente", tone: "wait", mine: false } as const);
  return m.proposed_by === meId
    ? ({ label: "In attesa di risposta", tone: "wait", mine: false } as const)
    : ({ label: "Da confermare", tone: "act", mine: true } as const);
}

function ProposeForm({ id, staff, m, onDone }: { id: string; staff: boolean; m: MeetingView; onDone: () => void }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [mode, setMode] = useState(m.mode);
  return (
    <form
      className="mt-3 space-y-3 rounded-[14px] border border-line bg-paper/60 p-3.5"
      action={(fd) =>
        start(async () => {
          const res = await proposeMeeting(id, fd);
          setMsg(res.ok ? { ok: true, text: res.message ?? "Fatto." } : { ok: false, text: res.error });
          if (res.ok) {
            onDone();
            router.refresh();
          }
        })
      }
    >
      <div className={`grid gap-3 ${staff ? "sm:grid-cols-3" : ""}`}>
        <div className={staff ? "sm:col-span-2" : ""}>
          <label className="label" htmlFor={`st-${id}`}>{m.status === "requested" ? "Data e ora" : "Nuovo orario"}</label>
          <input id={`st-${id}`} name="starts_at" type="datetime-local" required min={nowLocal()} className="field" />
        </div>
        {staff && (
          <div>
            <label className="label" htmlFor={`du-${id}`}>Durata (min)</label>
            <input id={`du-${id}`} name="duration_min" type="number" min={10} max={180} defaultValue={m.duration_min} className="field" />
          </div>
        )}
      </div>
      {staff && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor={`mo-${id}`}>Modalità</label>
            <select id={`mo-${id}`} name="mode" value={mode} onChange={(e) => setMode(e.target.value as MeetingView["mode"])} className="field">
              <option value="video">Videochiamata</option>
              <option value="presenza">In sede</option>
              <option value="telefono">Telefono</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor={`pl-${id}`}>{mode === "video" ? "Link della videochiamata" : mode === "presenza" ? "Luogo" : "Numero o indicazioni"}</label>
            <input id={`pl-${id}`} name="place" defaultValue={m.place} className="field" placeholder={mode === "video" ? "https://meet.google.com/…" : ""} />
          </div>
        </div>
      )}
      <div>
        <label className="label" htmlFor={`no-${id}`}>Messaggio (facoltativo)</label>
        <input id={`no-${id}`} name="note" className="field" placeholder={staff ? "" : "Es. quel giorno lavoro fino alle 18"} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary btn-sm" disabled={pending}>{pending ? "Invio…" : "Invia l'orario"}</button>
        <button type="button" className="text-[14px] text-mute" onClick={onDone}>Annulla</button>
        <Msg m={msg} />
      </div>
    </form>
  );
}

export function MeetingCard({ m, meId, staff }: { m: MeetingView; meId: string; staff: boolean }) {
  const router = useRouter();
  const [propose, setPropose] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const st = meetingState(m, meId, staff);
  const past = m.starts_at ? new Date(m.starts_at).getTime() < Date.now() : false;
  const isLink = /^https?:\/\//i.test(m.place);

  const chip =
    st.tone === "ok"
      ? "bg-codice-soft text-codice"
      : st.tone === "act"
        ? "bg-ceralacca-soft text-ceralacca"
        : st.tone === "wait"
          ? "bg-ambra-soft text-ambra"
          : "bg-line-soft text-mute";

  return (
    <li className={`panel p-4 sm:p-5 ${m.status === "cancelled" ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] text-mute">{staff ? "Con" : "Docente:"} {m.otherName}</p>
          <h3 className="text-[17px] font-semibold leading-snug">{m.topic}</h3>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ${chip}`}>
          {st.tone === "act" && <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-ceralacca" />}
          {st.label}
        </span>
      </div>

      {m.starts_at ? (
        <p className={`mt-2 text-[16px] font-medium capitalize ${m.status === "cancelled" ? "line-through" : ""}`}>
          {when(m.starts_at)}
          <span className="font-normal normal-case text-slate"> · {m.duration_min} min · {MODE_LABEL[m.mode]}</span>
        </p>
      ) : (
        <p className="mt-2 text-[15px] text-slate">Orario da definire</p>
      )}
      {m.place && m.status !== "cancelled" && (
        <p className="mt-1 break-words text-[15px]">
          {isLink ? (
            <a href={m.place} target="_blank" rel="noopener" className="font-medium text-codice hover:underline">
              {m.mode === "video" ? "Collegamento alla videochiamata" : m.place}
            </a>
          ) : (
            m.place
          )}
        </p>
      )}
      {m.note && <p className="mt-2 whitespace-pre-wrap text-[15px] text-slate">{m.note}</p>}

      {m.status !== "cancelled" && !(m.status === "confirmed" && past) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {m.status === "proposed" && st.mine && (
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await acceptMeeting(m.id);
                  setMsg(res.ok ? { ok: true, text: res.message ?? "Fatto." } : { ok: false, text: res.error });
                  router.refresh();
                })
              }
            >
              Conferma
            </button>
          )}
          {!propose && (
            <button type="button" className={st.mine && m.status !== "proposed" ? "btn-primary btn-sm" : "btn-secondary btn-sm"} onClick={() => setPropose(true)}>
              {m.status === "requested" && staff ? "Fissa l'orario" : m.status === "requested" ? "Indica un orario" : "Proponi un altro orario"}
            </button>
          )}
          {m.status === "confirmed" && m.calendarUrl && (
            <a href={m.calendarUrl} target="_blank" rel="noopener" className="btn-ghost btn-sm">Aggiungi al calendario</a>
          )}
          <button
            type="button"
            className="btn-ghost btn-sm text-mute hover:text-ceralacca"
            disabled={pending}
            onClick={() => {
              const reason = prompt("Vuoi annullare il colloquio? Puoi indicare il motivo (facoltativo).");
              if (reason === null) return;
              start(async () => {
                const res = await cancelMeeting(m.id, reason);
                setMsg(res.ok ? { ok: true, text: res.message ?? "Fatto." } : { ok: false, text: res.error });
                router.refresh();
              });
            }}
          >
            Annulla colloquio
          </button>
          <Msg m={msg} />
        </div>
      )}
      {propose && <ProposeForm id={m.id} staff={staff} m={m} onDone={() => setPropose(false)} />}
    </li>
  );
}

export function MeetingRequestForm({ teachers }: { teachers: { id: string; name: string }[] }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      ref={form}
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          const res = await requestMeeting(fd);
          setMsg(res.ok ? { ok: true, text: res.message ?? "Fatto." } : { ok: false, text: res.error });
          if (res.ok) form.current?.reset();
          router.refresh();
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="teacher_id">Docente</label>
          <select id="teacher_id" name="teacher_id" required defaultValue="" className="field">
            <option value="" disabled>Scegli</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="mode">Preferisci</label>
          <select id="mode" name="mode" defaultValue="video" className="field">
            <option value="video">Videochiamata</option>
            <option value="presenza">In sede</option>
            <option value="telefono">Telefono</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="topic">Di cosa vuoi parlare</label>
        <input id="topic" name="topic" required maxLength={300} className="field" placeholder="Es. dubbi sulla correzione dell'atto penale" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="starts_at">Orario che preferisci (facoltativo)</label>
          <input id="starts_at" name="starts_at" type="datetime-local" min={nowLocal()} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="note">Disponibilità o note</label>
          <input id="note" name="note" className="field" placeholder="Es. libero il martedì dopo le 17" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Invio…" : "Chiedi il colloquio"}</button>
        <Msg m={msg} />
      </div>
    </form>
  );
}

export function MeetingScheduleForm({ students, defaultStudent }: { students: { id: string; name: string }[]; defaultStudent?: string }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [mode, setMode] = useState("video");
  const [pending, start] = useTransition();
  return (
    <form
      ref={form}
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          const res = await scheduleMeeting(fd);
          setMsg(res.ok ? { ok: true, text: res.message ?? "Fatto." } : { ok: false, text: res.error });
          if (res.ok) form.current?.reset();
          router.refresh();
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="student_id">Discente</label>
          <select id="student_id" name="student_id" required defaultValue={defaultStudent ?? ""} className="field">
            <option value="" disabled>Scegli</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="topic-s">Argomento</label>
          <input id="topic-s" name="topic" required maxLength={300} className="field" placeholder="Es. andamento delle esercitazioni" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="starts_at-s">Data e ora</label>
          <input id="starts_at-s" name="starts_at" type="datetime-local" required min={nowLocal()} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="duration_min">Durata (min)</label>
          <input id="duration_min" name="duration_min" type="number" min={10} max={180} defaultValue={30} className="field" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="mode-s">Modalità</label>
          <select id="mode-s" name="mode" value={mode} onChange={(e) => setMode(e.target.value)} className="field">
            <option value="video">Videochiamata</option>
            <option value="presenza">In sede</option>
            <option value="telefono">Telefono</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="place">{mode === "video" ? "Link della videochiamata" : mode === "presenza" ? "Luogo" : "Numero o indicazioni"}</label>
          <input id="place" name="place" className="field" placeholder={mode === "video" ? "https://meet.google.com/…" : ""} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="note-s">Messaggio per il discente (facoltativo)</label>
        <input id="note-s" name="note" className="field" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Invio…" : "Proponi il colloquio"}</button>
        <Msg m={msg} />
      </div>
      <p className="text-[14px] text-mute">Il discente riceve l&apos;avviso nei messaggi e può confermare o proporre un altro orario.</p>
    </form>
  );
}

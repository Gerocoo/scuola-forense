import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { requireSuper } from "@/lib/auth";

export const metadata = { title: "Registro attività" };

type Row = {
  id: number;
  at: string;
  actor_id: string | null;
  actor_email: string | null;
  action: "insert" | "update" | "delete" | "login";
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
};

const AREAS: Record<string, { label: string; tables: string[] }> = {
  accessi: { label: "Accessi", tables: ["auth"] },
  utenti: { label: "Utenti e ruoli", tables: ["profiles", "teacher_invites"] },
  corsi: { label: "Corsi e iscrizioni", tables: ["packages", "enrollments", "package_teachers"] },
  lezioni: { label: "Lezioni e incontri", tables: ["lessons", "lesson_files", "lesson_bookings"] },
  esercitazioni: { label: "Esercitazioni e correzioni", tables: ["assignments", "assignment_files", "assignment_reviews", "course_exercises"] },
  messaggi: { label: "Messaggi", tables: ["messages"] },
  impostazioni: { label: "Impostazioni", tables: ["integrations"] },
};

const SUBJECT: Record<string, string> = {
  auth: "Accesso",
  profiles: "Utente",
  teacher_invites: "Invito docente",
  packages: "Corso",
  enrollments: "Iscrizione",
  package_teachers: "Docente del corso",
  lessons: "Lezione",
  lesson_files: "Materiale della lezione",
  lesson_bookings: "Prenotazione",
  assignments: "Esercitazione",
  assignment_files: "File di esercitazione",
  assignment_reviews: "Correzione",
  course_exercises: "Esercizio di corso",
  messages: "Messaggio",
  integrations: "Collegamento YouTube",
};

const VERB = { insert: "creato", update: "modificato", delete: "eliminato", login: "effettuato" } as const;
const TONE = {
  insert: "bg-codice-soft text-codice",
  update: "bg-paper text-slate",
  delete: "bg-ceralacca-soft text-ceralacca",
  login: "bg-line-soft text-slate",
} as const;

const FIELD: Record<string, string> = {
  role: "ruolo",
  status: "stato",
  email: "email",
  full_name: "nome",
  title: "titolo",
  published: "pubblicazione",
  scheduled_at: "data",
  price_cents: "prezzo",
  promo_price_cents: "prezzo promozionale",
  active: "in vendita",
  ends_at: "scadenza",
  due_at: "scadenza",
  grade: "giudizio",
  video_url: "video",
  package_ids: "corsi",
};

function label(r: Row) {
  const d = (r.new_data ?? r.old_data ?? {}) as Record<string, unknown>;
  const pick = (k: string) => (typeof d[k] === "string" && d[k] ? String(d[k]) : null);
  return pick("title") ?? pick("full_name") ?? pick("email") ?? pick("file_name") ?? pick("account_name") ?? pick("grade") ?? null;
}

function changes(r: Row) {
  if (r.action !== "update" || !r.old_data || !r.new_data) return [];
  const skip = new Set(["updated_at", "created_at", "id", "reminder_sent_at", "correction_reminder_at"]);
  return Object.keys(r.new_data)
    .filter((k) => !skip.has(k) && JSON.stringify(r.old_data![k]) !== JSON.stringify(r.new_data![k]))
    .slice(0, 4)
    .map((k) => {
      const show = (v: unknown) => (v === null || v === undefined || v === "" ? "vuoto" : typeof v === "boolean" ? (v ? "sì" : "no") : String(v).slice(0, 40));
      return `${FIELD[k] ?? k}: ${show(r.old_data![k])} → ${show(r.new_data![k])}`;
    });
}

type Props = { searchParams: Promise<{ area?: string; azione?: string; chi?: string; pagina?: string }> };

const PAGE = 100;

export default async function RegistroPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { supabase } = await requireSuper();
  const page = Math.max(0, Number(sp.pagina) || 0);

  let q = supabase.from("audit_log").select("*").order("at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
  if (sp.area && AREAS[sp.area]) q = q.in("table_name", AREAS[sp.area].tables);
  if (sp.azione && ["insert", "update", "delete", "login"].includes(sp.azione)) q = q.eq("action", sp.azione);
  if (sp.chi) q = q.ilike("actor_email", `%${sp.chi.replace(/[%_,()]/g, "")}%`);
  const { data, error } = await q.returns<Row[]>();

  const link = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const m = { area: sp.area, azione: sp.azione, chi: sp.chi, ...o };
    for (const [k, v] of Object.entries(m)) if (v) p.set(k, v);
    const s = p.toString();
    return `/docente/registro${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Registro attività"
        description="Ogni operazione sulla piattaforma: chi l'ha fatta, quando e cosa è cambiato. Visibile solo a te."
      />

      <form action="/docente/registro" className="panel mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label htmlFor="area" className="label">Area</label>
          <select id="area" name="area" defaultValue={sp.area ?? ""} className="field w-auto py-2">
            <option value="">Tutto</option>
            {Object.entries(AREAS).map(([k, a]) => (
              <option key={k} value={k}>{a.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="azione" className="label">Operazione</label>
          <select id="azione" name="azione" defaultValue={sp.azione ?? ""} className="field w-auto py-2">
            <option value="">Tutte</option>
            <option value="insert">Creazioni</option>
            <option value="update">Modifiche</option>
            <option value="delete">Eliminazioni</option>
            <option value="login">Accessi</option>
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label htmlFor="chi" className="label">Utente (email)</label>
          <input id="chi" name="chi" defaultValue={sp.chi ?? ""} placeholder="nome@esempio.it" className="field py-2" />
        </div>
        <button className="btn-primary btn-sm">Filtra</button>
        {(sp.area || sp.azione || sp.chi) && (
          <Link href="/docente/registro" className="btn-ghost btn-sm">Azzera</Link>
        )}
      </form>

      {error ? (
        <p className="panel p-6 text-[15px] text-ceralacca">Il registro non è ancora attivo sul database.</p>
      ) : data?.length ? (
        <div className="panel overflow-hidden">
          <ul className="divide-y divide-line-soft">
            {data.map((r) => {
              const what = label(r);
              const diff = changes(r);
              return (
                <li key={r.id} className="grid gap-x-4 gap-y-1 px-5 py-3.5 sm:grid-cols-[150px_1fr]">
                  <time className="text-[13px] text-mute tabular-nums" dateTime={r.at}>
                    {new Date(r.at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })}
                  </time>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[14px]">
                      <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${TONE[r.action]}`}>
                        {r.action === "login" ? "Accesso" : `${SUBJECT[r.table_name] ?? r.table_name} ${VERB[r.action]}`}
                      </span>
                      {what && <span className="truncate font-medium">{what}</span>}
                    </p>
                    <p className="mt-0.5 text-[13px] text-slate">
                      {r.action === "login"
                        ? `${r.actor_email ?? "utente"}${r.new_data?.provider ? ` · con ${r.new_data.provider === "google" ? "Google" : "email"}` : ""}`
                        : r.actor_email
                          ? `da ${r.actor_email}`
                          : "dal sistema (pagamento, automatismo o pannello tecnico)"}
                    </p>
                    {diff.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-[12px] text-mute">
                        {diff.map((c) => (
                          <li key={c} className="truncate">{c}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="panel p-6 text-[15px] text-slate">Nessuna attività registrata con questi filtri.</p>
      )}

      <div className="mt-5 flex justify-between">
        {page > 0 ? <Link href={link({ pagina: String(page - 1) })} className="btn-secondary btn-sm">Più recenti</Link> : <span />}
        {data && data.length === PAGE && <Link href={link({ pagina: String(page + 1) })} className="btn-secondary btn-sm">Meno recenti</Link>}
      </div>
    </>
  );
}

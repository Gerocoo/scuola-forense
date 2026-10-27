import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/app/Avatar";
import { StatusBadge } from "@/components/app/StatusBadge";
import { EnrollmentAdd, EnrollmentStatus } from "./EnrollmentAdmin";
import { ChangeEmailForm, DeleteUserButton } from "@/app/docente/utenti/AccountAdmin";
import { requireStaff } from "@/lib/auth";
import { loadPath } from "@/lib/progress";
import { dateLong, dateShort, euro, KIND_LABEL } from "@/lib/format";
import type { Assignment, Enrollment, Package, Profile } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

function Ring({ value, size = 64 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line-soft)" strokeWidth="6" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-codice)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * Math.min(100, Math.max(0, value))) / 100}
      />
    </svg>
  );
}

export default async function DiscentePage({ params }: Props) {
  const { id } = await params;
  const { supabase, profile: me } = await requireStaff();
  const isAdmin = me.role === "admin";

  const { data: s } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!s) notFound();

  const [{ data: enrollments }, { data: assignments }, { data: packages }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("*, package:packages(title, period_label, slug)")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .returns<Enrollment[]>(),
    supabase.from("assignments").select("*").eq("student_id", id).order("created_at", { ascending: false }).returns<Assignment[]>(),
    isAdmin
      ? supabase.from("packages").select("id, title, period_label").order("sort").returns<Pick<Package, "id" | "title" | "period_label">[]>()
      : Promise.resolve({ data: [] as Pick<Package, "id" | "title" | "period_label">[] }),
  ]);

  const now = new Date().toISOString();
  const path = await loadPath(supabase, id);
  const done = path.filter((p) => p.completed).length;
  const pathPct = path.length ? Math.round((done / path.length) * 100) : 0;
  const list = assignments ?? [];
  const toCorrect = list.filter((a) => a.status === "consegnato" || a.status === "in_correzione").length;
  const toDeliver = list.filter((a) => a.status === "assegnato").length;
  const corrected = list.filter((a) => a.status === "corretto").length;
  const activeEnr = (enrollments ?? []).filter((e) => e.status === "active" && (!e.ends_at || e.ends_at > now));

  return (
    <>
      <Link href="/docente/discenti" className="mb-5 inline-flex items-center gap-1 text-[15px] font-medium text-codice hover:underline">
        <svg aria-hidden viewBox="0 0 16 16" className="size-3.5"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Discenti
      </Link>

      {/* ---------- scheda d'intestazione ---------- */}
      <section className="panel relative overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-codice-soft/70 to-transparent" />
        <div className="relative flex flex-wrap items-center gap-6">
          <Avatar name={s.full_name} email={s.email} url={s.avatar_url} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[30px] font-semibold leading-tight tracking-[-0.03em] sm:text-[36px]">{s.full_name || s.email}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-slate">
              <a href={`mailto:${s.email}`} className="hover:text-ink">{s.email}</a>
              {s.phone && <a href={`tel:${s.phone}`} className="hover:text-ink">{s.phone}</a>}
              <span className="text-mute">Iscritto alla piattaforma dal {dateLong(s.created_at)}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/docente/messaggi/${s.id}`} className="btn-secondary">Scrivi</Link>
            <Link href={`/docente/esercitazioni/nuova?discente=${s.id}`} className="btn-primary">Assegna una traccia</Link>
          </div>
        </div>

        {/* numeri chiave */}
        <dl className="relative mt-8 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-[18px] bg-paper p-4">
            <div className="relative grid place-items-center">
              <Ring value={pathPct} />
              <span className="absolute text-[14px] font-semibold tabular-nums">{pathPct}%</span>
            </div>
            <div>
              <dt className="text-[13px] text-mute">Percorso</dt>
              <dd className="text-[17px] font-semibold">
                {path.length ? `${done} di ${path.length} lezioni` : "Nessuna lezione"}
              </dd>
            </div>
          </div>
          <div className="rounded-[18px] bg-paper p-4">
            <dt className="text-[13px] text-mute">Esercitazioni</dt>
            <dd className="mt-1 text-[17px] font-semibold">{list.length ? `${corrected} corrette su ${list.length}` : "Nessuna"}</dd>
            <dd className="mt-2 flex flex-wrap gap-1.5 text-[12px] font-medium">
              {toCorrect > 0 && <span className="rounded-full bg-ambra-soft px-2 py-0.5 text-ambra">{toCorrect} da correggere</span>}
              {toDeliver > 0 && <span className="rounded-full bg-line-soft px-2 py-0.5 text-slate">{toDeliver} da consegnare</span>}
            </dd>
          </div>
          <div className="rounded-[18px] bg-paper p-4">
            <dt className="text-[13px] text-mute">Corso</dt>
            <dd className="mt-1 truncate text-[17px] font-semibold">{activeEnr[0]?.package?.title ?? "Nessun corso attivo"}</dd>
            {activeEnr[0]?.ends_at && <dd className="mt-1 text-[13px] text-slate">Accesso fino al {dateLong(activeEnr[0].ends_at)}</dd>}
          </div>
        </dl>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* ---------- colonna principale ---------- */}
        <div className="min-w-0 space-y-8">
          <section>
            <h2 className="mb-3 text-[19px] font-semibold">Percorso delle lezioni</h2>
            {path.length > 0 ? (
              <ol className="panel divide-y divide-line-soft overflow-hidden">
                {path.map((p) => (
                  <li key={p.lesson.id} className="flex items-center gap-4 px-5 py-4">
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-full text-[14px] font-semibold tabular-nums ${
                        p.completed ? "bg-codice text-white" : p.unlocked ? "bg-ambra-soft text-ambra" : "bg-line-soft text-mute"
                      }`}
                    >
                      {p.completed ? (
                        <svg viewBox="0 0 16 16" className="size-4"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      ) : (
                        p.index + 1
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-medium ${p.unlocked ? "text-ink" : "text-mute"}`}>{p.lesson.title}</p>
                      <div className="mt-1.5 flex items-center gap-3">
                        {p.hasVideo ? (
                          <>
                            <span className="h-1.5 max-w-[220px] flex-1 overflow-hidden rounded-full bg-line-soft">
                              <span className="block h-full rounded-full bg-codice transition-[width]" style={{ width: `${p.percent}%` }} />
                            </span>
                            <span className="text-[13px] text-slate tabular-nums">video {p.percent}%</span>
                          </>
                        ) : (
                          <span className="text-[13px] text-mute">Senza video</span>
                        )}
                        {p.exercises.length > 0 && (
                          <span className="text-[13px] text-slate tabular-nums">· esercitazioni {p.exercisesDone}/{p.exercises.length}</span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-medium sm:inline ${
                        p.completed ? "bg-codice-soft text-codice" : p.unlocked ? "bg-ambra-soft text-ambra" : "bg-line-soft text-mute"
                      }`}
                    >
                      {p.completed ? "Completata" : p.unlocked ? "In corso" : "Bloccata"}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="panel p-6 text-[15px] text-slate">Non ci sono ancora lezioni registrate pubblicate.</p>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-[19px] font-semibold">Esercitazioni</h2>
              {list.length > 0 && <span className="text-[13px] text-mute">{list.length} in totale</span>}
            </div>
            {list.length ? (
              <ul className="panel divide-y divide-line-soft overflow-hidden">
                {list.map((a) => (
                  <li key={a.id}>
                    <Link href={`/docente/esercitazioni/${a.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-paper">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{a.title}</span>
                        <span className="text-[13px] text-mute">
                          {KIND_LABEL[a.kind]} · assegnata il {dateShort(a.created_at)}
                          {a.due_at ? ` · scadenza ${dateShort(a.due_at)}` : ""}
                        </span>
                      </span>
                      <StatusBadge status={a.status} view="teacher" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="panel flex flex-col items-center gap-3 p-8 text-center">
                <span aria-hidden className="grid size-12 place-items-center rounded-full bg-paper text-codice">
                  <svg viewBox="0 0 24 24" className="size-6"><path d="M7 3h7l5 5v13H7z M14 3v5h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                </span>
                <p className="text-[15px] text-slate">Nessuna esercitazione ancora assegnata a {s.full_name?.split(" ")[0] || "questo discente"}.</p>
                <Link href={`/docente/esercitazioni/nuova?discente=${s.id}`} className="btn-secondary btn-sm">Assegna la prima traccia</Link>
              </div>
            )}
          </section>
        </div>

        {/* ---------- colonna laterale ---------- */}
        <aside className="space-y-4">
          <section className="panel p-5">
            <h2 className="font-semibold">Iscrizioni</h2>
            {enrollments?.length ? (
              <ul className="mt-3 space-y-3">
                {enrollments.map((e) => {
                  const active = e.status === "active" && (!e.ends_at || e.ends_at > now);
                  return (
                    <li key={e.id} className="rounded-[14px] bg-paper p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-snug">{e.package?.title}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium ${
                            active ? "bg-codice-soft text-codice" : e.status === "refunded" ? "bg-ceralacca-soft text-ceralacca" : "bg-line-soft text-mute"
                          }`}
                        >
                          {active ? "Attivo" : e.status === "refunded" ? "Rimborsato" : "Scaduto"}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-slate">
                        {euro(e.amount_cents)}
                        {e.ends_at ? ` · fino al ${dateLong(e.ends_at)}` : ""}
                      </p>
                      {isAdmin && <EnrollmentStatus enrollmentId={e.id} status={e.status} />}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-[15px] text-slate">Nessun corso acquistato.</p>
            )}

            {isAdmin && (
              <details className="group mt-4 border-t border-line-soft pt-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-medium text-codice">
                  Aggiungi iscrizione manuale
                  <span aria-hidden className="text-[18px] leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="mt-3">
                  <EnrollmentAdd userId={s.id} packages={packages ?? []} />
                </div>
              </details>
            )}
          </section>

          {isAdmin && (
            <section className="panel p-5">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                  Account
                  <svg aria-hidden viewBox="0 0 16 16" className="size-4 text-mute transition-transform group-open:rotate-180"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </summary>
                <div className="mt-4 space-y-5">
                  <ChangeEmailForm userId={s.id} email={s.email} />
                  <div className="border-t border-line-soft pt-4">
                    <DeleteUserButton userId={s.id} name={s.full_name || s.email} isStaff={false} redirectTo="/docente/discenti" />
                  </div>
                </div>
              </details>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

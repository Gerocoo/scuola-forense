import { PageHeader } from "@/components/app/AppShell";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { euro } from "@/lib/format";

export const metadata = { title: "Statistiche" };

const DAY = 86400000;
const MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

function Bar({ value, max, tone = "bg-codice" }: { value: number; max: number; tone?: string }) {
  return (
    <span className="block h-2.5 overflow-hidden rounded-full bg-line-soft">
      <span className={`block h-full rounded-full ${tone}`} style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} />
    </span>
  );
}

export default async function StatistichePage() {
  await requireAdmin();
  const admin = createAdminClient();
  const now = Date.now();

  const [{ data: enr }, { data: pkgs }, { data: asg }, { data: people }, { data: leads }] = await Promise.all([
    admin.from("enrollments").select("package_id, user_id, status, amount_cents, created_at, ends_at, paid_at"),
    admin.from("packages").select("id, title, slug, seats"),
    admin.from("assignments").select("teacher_id, status, submitted_at, corrected_at"),
    admin.from("profiles").select("id, full_name, email, role").in("role", ["teacher", "admin"]),
    admin.from("leads").select("user_id"),
  ]);

  const enrollments = enr ?? [];
  const paid = enrollments
    .filter((e) => e.status !== "refunded" && e.status !== "pending" && e.amount_cents > 0)
    .map((e) => ({ ...e, created_at: e.paid_at ?? e.created_at }));
  const toCollect = enrollments.filter((e) => e.status === "pending");
  const revenue = paid.reduce((s, e) => s + e.amount_cents, 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const revenueMonth = paid.filter((e) => new Date(e.created_at).getTime() >= monthStart).reduce((s, e) => s + e.amount_cents, 0);
  const activeNow = enrollments.filter((e) => e.status === "active" && (!e.ends_at || new Date(e.ends_at).getTime() > now));
  const students = new Set(activeNow.map((e) => e.user_id)).size;

  // incassi degli ultimi 6 mesi
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    return { y: d.getFullYear(), m: d.getMonth(), total: 0 };
  });
  for (const e of paid) {
    const d = new Date(e.created_at);
    const slot = months.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
    if (slot) slot.total += e.amount_cents;
  }
  const maxMonth = Math.max(...months.map((m) => m.total), 1);

  // iscritti per corso
  const perCourse = (pkgs ?? [])
    .filter((p) => p.slug !== "prova-gratuita")
    .map((p) => ({
      ...p,
      count: activeNow.filter((e) => e.package_id === p.id).length,
      total: paid.filter((e) => e.package_id === p.id).reduce((s, e) => s + e.amount_cents, 0),
    }))
    .sort((a, b) => b.count - a.count);
  const maxCourse = Math.max(...perCourse.map((c) => c.count), 1);

  // tempi di correzione per docente
  const list = asg ?? [];
  const perTeacher = (people ?? [])
    .map((t) => {
      const mine = list.filter((a) => a.teacher_id === t.id);
      const done = mine.filter((a) => a.status === "corretto" && a.submitted_at && a.corrected_at);
      const days = done.map((a) => (new Date(a.corrected_at!).getTime() - new Date(a.submitted_at!).getTime()) / DAY);
      const avg = days.length ? days.reduce((s, d) => s + d, 0) / days.length : null;
      const pending = mine.filter((a) => a.status === "consegnato" || a.status === "in_correzione");
      const late = pending.filter((a) => a.submitted_at && now - new Date(a.submitted_at).getTime() > 7 * DAY).length;
      const onTime = days.length ? Math.round((days.filter((d) => d <= 7).length / days.length) * 100) : null;
      return { id: t.id, name: t.full_name || t.email, corrected: done.length, avg, pending: pending.length, late, onTime };
    })
    .filter((t) => t.corrected || t.pending)
    .sort((a, b) => b.late - a.late || b.pending - a.pending);

  const trial = leads ?? [];
  const trialUsers = new Set(trial.map((l) => l.user_id).filter(Boolean) as string[]);
  const converted = new Set(paid.filter((e) => trialUsers.has(e.user_id)).map((e) => e.user_id)).size;

  const Kpi = ({ label, value, note }: { label: string; value: string; note?: string }) => (
    <div className="panel p-5">
      <p className="text-[14px] text-mute">{label}</p>
      <p className="mt-1 text-[30px] font-semibold tracking-[-0.02em] tabular-nums">{value}</p>
      {note && <p className="text-[13px] text-slate">{note}</p>}
    </div>
  );

  return (
    <>
      <PageHeader title="Statistiche" description="Incassi, iscritti e tempi di correzione. I dati si aggiornano a ogni apertura della pagina." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Incassato in totale" value={euro(revenue)} note={`${paid.length} pagamenti`} />
        <Kpi label="Questo mese" value={euro(revenueMonth)} note={toCollect.length ? `${euro(toCollect.reduce((a, e) => a + e.amount_cents, 0))} in attesa di bonifico` : undefined} />
        <Kpi label="Discenti con corso attivo" value={String(students)} />
        <Kpi label="Prova gratuita" value={`${trial.length}`} note={`${trialUsers.size} account, ${converted} hanno poi acquistato`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold">Incassi degli ultimi 6 mesi</h2>
          <div className="mt-5 flex h-44 items-end gap-3">
            {months.map((m) => (
              <div key={`${m.y}-${m.m}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[12px] font-medium tabular-nums text-slate">{m.total ? euro(m.total).replace(",00", "") : ""}</span>
                <span className="w-full rounded-t-[6px] bg-codice" style={{ height: `${Math.max(2, (m.total / maxMonth) * 100)}%` }} />
                <span className="text-[13px] text-mute">{MONTHS[m.m]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold">Iscritti per corso</h2>
          <ul className="mt-4 space-y-3">
            {perCourse.map((c) => (
              <li key={c.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-[15px]">
                  <span className="truncate font-medium">{c.title}</span>
                  <span className="shrink-0 tabular-nums text-slate">
                    {c.count}
                    {c.seats ? `/${c.seats}` : ""} · {euro(c.total)}
                  </span>
                </div>
                <Bar value={c.count} max={c.seats || maxCourse} />
              </li>
            ))}
            {!perCourse.length && <li className="text-[15px] text-slate">Nessun corso.</li>}
          </ul>
        </section>
      </div>

      <section className="panel mt-6 overflow-hidden">
        <div className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold">Correzioni per docente</h2>
          <p className="mt-1 text-[14px] text-mute">Ai discenti è promessa la correzione entro 7 giorni dalla consegna.</p>
        </div>
        {perTeacher.length ? (
          <ul className="divide-y divide-line-soft border-t border-line-soft">
            {perTeacher.map((t) => (
              <li key={t.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.name}</p>
                  <p className="text-[14px] text-slate">
                    {t.corrected} corretti
                    {t.avg !== null && ` · in media ${t.avg < 1 ? "meno di un giorno" : `${t.avg.toFixed(1).replace(".", ",")} giorni`}`}
                    {t.onTime !== null && ` · ${t.onTime}% entro 7 giorni`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[13px] font-medium ${t.pending ? "bg-ambra-soft text-ambra" : "bg-paper text-mute"}`}>{t.pending} da correggere</span>
                  <span className={`rounded-full px-2.5 py-1 text-[13px] font-medium ${t.late ? "bg-ceralacca text-white" : "bg-paper text-mute"}`}>{t.late} oltre 7 giorni</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-line-soft p-5 text-[15px] text-slate">Ancora nessuna correzione.</p>
        )}
      </section>
    </>
  );
}

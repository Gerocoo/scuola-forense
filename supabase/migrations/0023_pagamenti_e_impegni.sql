-- Iscrizioni "in attesa di pagamento" (bonifico) e impegni mensili dei corsi.
-- Nota: il nuovo valore dell'enum va aggiunto in un passaggio separato dal resto.
alter type enrollment_status add value if not exists 'pending';

alter table public.enrollments add column if not exists payment_method text check (payment_method in ('stripe', 'bonifico', 'contanti', 'pos', 'gratuito', 'altro'));
alter table public.enrollments add column if not exists payment_reference text;
alter table public.enrollments add column if not exists paid_at timestamptz;
alter table public.enrollments add column if not exists payment_note text;
alter table public.enrollments add column if not exists recorded_by uuid references public.profiles(id) on delete set null;
update public.enrollments set payment_method = case when stripe_session_id is not null then 'stripe' when amount_cents = 0 then 'gratuito' else 'altro' end,
  paid_at = coalesce(paid_at, created_at)
where payment_method is null;

alter table public.packages add column if not exists promise_recorded_month smallint check (promise_recorded_month between 0 and 50);
alter table public.packages add column if not exists promise_live_month smallint check (promise_live_month between 0 and 20);
alter table public.packages add column if not exists promise_exercises_month smallint check (promise_exercises_month between 0 and 50);
update public.packages set promise_recorded_month = 3, promise_live_month = 1
where slug <> 'prova-gratuita' and promise_recorded_month is null and promise_live_month is null;

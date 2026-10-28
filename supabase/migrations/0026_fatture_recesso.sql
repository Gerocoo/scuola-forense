-- Fattura elettronica (Fatture in Cloud → SDI) e rinuncia al recesso per i contenuti digitali.
alter table public.enrollments add column if not exists billing jsonb;
alter table public.enrollments add column if not exists invoice_status text check (invoice_status in ('pending', 'sent', 'issued', 'error', 'skipped'));
alter table public.enrollments add column if not exists invoice_id text;
alter table public.enrollments add column if not exists invoice_number text;
alter table public.enrollments add column if not exists invoice_error text;
alter table public.enrollments add column if not exists invoice_at timestamptz;
alter table public.enrollments add column if not exists withdrawal_waiver_at timestamptz;

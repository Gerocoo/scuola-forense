-- =====================================================================
--  0005: percorso a tappe, progresso di visione, esercitazioni legate alle lezioni
-- =====================================================================

-- Se true, la lezione si apre solo dopo aver completato la precedente
alter table public.lessons
  add column if not exists sequential boolean not null default true;

-- Esercitazione collegata a una lezione registrata (necessaria per sbloccare la successiva)
alter table public.assignments
  add column if not exists lesson_id uuid references public.lessons(id) on delete set null;
create index if not exists assignments_lesson_idx on public.assignments(lesson_id, student_id);

-- Progresso: il video è diviso in 100 tratti; "1" = tratto guardato davvero
create table if not exists public.lesson_progress (
  lesson_id         uuid not null references public.lessons(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  buckets           text not null default repeat('0', 100) check (buckets ~ '^[01]{100}$'),
  percent           integer not null default 0 check (percent between 0 and 100),
  position_seconds  integer not null default 0,
  duration_seconds  integer,
  completed_at      timestamptz,
  updated_at        timestamptz not null default now(),
  primary key (lesson_id, user_id)
);

alter table public.lesson_progress enable row level security;

drop policy if exists "progresso: lettura" on public.lesson_progress;
create policy "progresso: lettura" on public.lesson_progress for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists "progresso: inserimento proprio" on public.lesson_progress;
create policy "progresso: inserimento proprio" on public.lesson_progress for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.lessons l where l.id = lesson_id));

drop policy if exists "progresso: modifica proprio" on public.lesson_progress;
create policy "progresso: modifica proprio" on public.lesson_progress for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "progresso: gestione staff" on public.lesson_progress;
create policy "progresso: gestione staff" on public.lesson_progress for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

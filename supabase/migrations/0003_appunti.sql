-- =====================================================================
--  0003: appunti personali del discente su ogni lezione
-- =====================================================================
create table if not exists public.lesson_notes (
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null default '' check (char_length(body) <= 50000),
  updated_at  timestamptz not null default now(),
  primary key (lesson_id, user_id)
);

alter table public.lesson_notes enable row level security;

-- Ognuno vede e modifica solo i propri appunti, e solo su lezioni che può vedere
drop policy if exists "appunti: lettura propri" on public.lesson_notes;
create policy "appunti: lettura propri" on public.lesson_notes for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "appunti: inserimento propri" on public.lesson_notes;
create policy "appunti: inserimento propri" on public.lesson_notes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.lessons l where l.id = lesson_id));

drop policy if exists "appunti: modifica propri" on public.lesson_notes;
create policy "appunti: modifica propri" on public.lesson_notes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "appunti: eliminazione propri" on public.lesson_notes;
create policy "appunti: eliminazione propri" on public.lesson_notes for delete to authenticated
  using (user_id = auth.uid());

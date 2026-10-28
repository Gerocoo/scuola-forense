-- Preparazione all'orale: quiz (deontologia, ordinamento, previdenza) e simulazioni d'orale prenotabili.

create table if not exists public.quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  topic       text not null check (topic in ('deontologia', 'ordinamento', 'previdenza')),
  question    text not null,
  options     text[] not null check (cardinality(options) between 2 and 5),
  correct     smallint not null check (correct >= 0 and correct < 5),
  explanation text not null default '',
  active      boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.quiz_questions enable row level security;
create policy "quiz: lettura iscritti e staff" on public.quiz_questions for select to authenticated
  using (public.is_staff() or (active and public.has_active_enrollment()));
create policy "quiz: gestione staff" on public.quiz_questions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create table if not exists public.quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  topic      text,
  score      smallint not null,
  total      smallint not null,
  created_at timestamptz not null default now()
);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts(user_id, created_at desc);
alter table public.quiz_attempts enable row level security;
create policy "tentativi: propri" on public.quiz_attempts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tentativi: lettura staff" on public.quiz_attempts for select to authenticated using (public.is_staff());

create table if not exists public.oral_slots (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references public.profiles(id) on delete cascade,
  starts_at    timestamptz not null,
  duration_min smallint not null default 30 check (duration_min between 10 and 180),
  meeting_url  text,
  note         text not null default '',
  booked_by    uuid references public.profiles(id) on delete set null,
  booked_at    timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists oral_slots_time_idx on public.oral_slots(starts_at);
alter table public.oral_slots enable row level security;
create policy "orale: lettura" on public.oral_slots for select to authenticated
  using (public.is_staff() or booked_by = auth.uid() or (booked_by is null and public.has_active_enrollment()));
create policy "orale: gestione staff" on public.oral_slots for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create or replace function public.book_oral_slot(sid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_active_enrollment() then
    raise exception 'Serve un corso attivo per prenotare';
  end if;
  if (select count(*) from public.oral_slots where booked_by = auth.uid() and starts_at > now()) >= 2 then
    raise exception 'Hai già due simulazioni in programma';
  end if;
  update public.oral_slots set booked_by = auth.uid(), booked_at = now()
   where id = sid and booked_by is null and starts_at > now() + interval '1 hour';
  if not found then
    raise exception 'Questo orario non è più disponibile';
  end if;
end $$;

create or replace function public.cancel_oral_slot(sid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.oral_slots set booked_by = null, booked_at = null
   where id = sid and booked_by = auth.uid() and starts_at > now() + interval '2 hours';
  if not found then
    raise exception 'Non è più possibile annullare: mancano meno di due ore';
  end if;
end $$;

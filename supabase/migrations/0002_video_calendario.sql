-- =====================================================================
--  0002: video caricati su Bunny Stream, prenotazioni, promemoria
-- =====================================================================

-- Video: vale per le lezioni registrate e per le registrazioni degli incontri in presenza
alter table public.lessons
  add column if not exists bunny_video_id   text,
  add column if not exists video_status     text not null default 'none'
    check (video_status in ('none', 'uploading', 'processing', 'ready', 'error')),
  add column if not exists capacity         integer check (capacity is null or capacity > 0),
  add column if not exists booking_enabled  boolean not null default false,
  add column if not exists reminder_sent_at timestamptz;

create index if not exists lessons_scheduled_idx on public.lessons(scheduled_at) where kind = 'in_presenza';

-- ---------------------------------------------------------------------
-- Prenotazioni del posto agli incontri in presenza
-- ---------------------------------------------------------------------
create table if not exists public.lesson_bookings (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'confermato' check (status in ('confermato', 'annullato')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (lesson_id, user_id)
);

create index if not exists lesson_bookings_lesson_idx on public.lesson_bookings(lesson_id, status);

alter table public.lesson_bookings enable row level security;

drop policy if exists "prenotazioni: lettura" on public.lesson_bookings;
create policy "prenotazioni: lettura" on public.lesson_bookings for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
drop policy if exists "prenotazioni: gestione staff" on public.lesson_bookings;
create policy "prenotazioni: gestione staff" on public.lesson_bookings for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
-- i discenti prenotano e annullano solo tramite le funzioni qui sotto

-- Posti occupati (visibile a chi vede la lezione)
create or replace function public.lesson_seats_taken(lid uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.lesson_bookings where lesson_id = lid and status = 'confermato'
$$;

create or replace function public.book_lesson(lid uuid)
returns text language plpgsql security definer set search_path = public as $$
declare l public.lessons;
declare taken integer;
begin
  select * into l from public.lessons where id = lid for update;
  if l.id is null or not l.published or l.kind <> 'in_presenza' then
    raise exception 'Incontro non trovato';
  end if;
  if not (l.package_ids && public.my_package_ids()) then
    raise exception 'Questo incontro è riservato agli iscritti di un altro corso';
  end if;
  if not l.booking_enabled then
    raise exception 'Per questo incontro non serve prenotare';
  end if;
  if l.scheduled_at is not null and l.scheduled_at < now() then
    raise exception 'L''incontro è già passato';
  end if;
  if exists (select 1 from public.lesson_bookings where lesson_id = lid and user_id = auth.uid() and status = 'confermato') then
    return 'gia_prenotato';
  end if;
  select count(*) into taken from public.lesson_bookings where lesson_id = lid and status = 'confermato';
  if l.capacity is not null and taken >= l.capacity then
    raise exception 'Posti esauriti';
  end if;
  insert into public.lesson_bookings (lesson_id, user_id, status)
  values (lid, auth.uid(), 'confermato')
  on conflict (lesson_id, user_id) do update set status = 'confermato', updated_at = now();
  return 'prenotato';
end $$;

create or replace function public.cancel_booking(lid uuid)
returns void language sql security definer set search_path = public as $$
  update public.lesson_bookings
     set status = 'annullato', updated_at = now()
   where lesson_id = lid and user_id = auth.uid()
$$;

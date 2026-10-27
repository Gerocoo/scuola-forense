-- =====================================================================
--  INSTALLAZIONE COMPLETA: copia TUTTO questo file nell'SQL Editor di
--  Supabase e premi Run. Si può rieseguire senza danni.
--  (contiene 0001_schema.sql + 0002_video_calendario.sql + 0003_appunti.sql + 0004_integrazioni.sql + seed.sql)
-- =====================================================================

-- =====================================================================
--  Scuola di Alta Formazione Forense — schema database (Supabase/Postgres)
--  Eseguire nell'SQL Editor di Supabase (o con `supabase db push`).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tipi
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('student', 'teacher', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type enrollment_status as enum ('active', 'expired', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lesson_kind as enum ('registrata', 'in_presenza');
exception when duplicate_object then null; end $$;

do $$ begin
  create type assignment_kind as enum ('parere', 'atto', 'esercizio', 'documento');
exception when duplicate_object then null; end $$;

do $$ begin
  create type assignment_status as enum ('assegnato', 'consegnato', 'in_correzione', 'corretto');
exception when duplicate_object then null; end $$;

do $$ begin
  create type file_role as enum ('traccia', 'svolgimento', 'correzione');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Profili (1:1 con auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  avatar_url  text,
  phone       text,
  role        user_role not null default 'student',
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);

-- ---------------------------------------------------------------------
-- Pacchetti in vendita
-- ---------------------------------------------------------------------
create table if not exists public.packages (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  title              text not null,
  tagline            text not null default '',
  description        text not null default '',
  period_label       text not null default '',          -- es. "Marzo – maggio 2027"
  starts_on          date,
  ends_on            date,
  access_until       date,                              -- fine accesso all'area riservata
  price_cents        integer not null check (price_cents >= 0),
  promo_price_cents  integer check (promo_price_cents >= 0),
  promo_label        text,                              -- es. "Prezzo lancio fino al 30 novembre"
  promo_until        timestamptz,
  features           text[] not null default '{}',
  highlight          boolean not null default false,
  seats              integer,                           -- posti disponibili (opzionale)
  active             boolean not null default true,
  sort               integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Iscrizioni (create SOLO dal webhook Stripe con service role)
-- ---------------------------------------------------------------------
create table if not exists public.enrollments (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles(id) on delete cascade,
  package_id             uuid not null references public.packages(id) on delete restrict,
  status                 enrollment_status not null default 'active',
  amount_cents           integer not null default 0,
  currency               text not null default 'eur',
  stripe_session_id      text unique,
  stripe_payment_intent  text,
  starts_at              timestamptz not null default now(),
  ends_at                timestamptz,
  created_at             timestamptz not null default now()
);

create index if not exists enrollments_user_idx on public.enrollments(user_id);
create index if not exists enrollments_pi_idx on public.enrollments(stripe_payment_intent);

-- ---------------------------------------------------------------------
-- Lezioni (registrate o in presenza)
-- ---------------------------------------------------------------------
create table if not exists public.lessons (
  id            uuid primary key default gen_random_uuid(),
  kind          lesson_kind not null default 'registrata',
  title         text not null,
  summary       text not null default '',
  video_url     text,                     -- Vimeo/YouTube non in elenco, Bunny, ecc.
  scheduled_at  timestamptz,              -- per le lezioni in presenza
  location      text,
  meeting_url   text,                     -- eventuale diretta streaming
  duration_min  integer,
  package_ids   uuid[] not null default '{}',
  published     boolean not null default false,
  teacher_id    uuid references public.profiles(id) on delete set null,
  sort          integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists lessons_packages_idx on public.lessons using gin(package_ids);

create table if not exists public.lesson_files (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  storage_path  text not null,
  file_name     text not null,
  size_bytes    bigint not null default 0,
  mime_type     text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Esercitazioni assegnate a un singolo discente
-- ---------------------------------------------------------------------
create table if not exists public.assignments (
  id             uuid primary key default gen_random_uuid(),
  batch_id       uuid not null default gen_random_uuid(),   -- stessa traccia inviata a più discenti
  teacher_id     uuid not null references public.profiles(id) on delete restrict,
  student_id     uuid not null references public.profiles(id) on delete cascade,
  kind           assignment_kind not null default 'parere',
  title          text not null,
  instructions   text not null default '',
  due_at         timestamptz,
  status         assignment_status not null default 'assegnato',
  submitted_at   timestamptz,
  corrected_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists assignments_student_idx on public.assignments(student_id, status);
create index if not exists assignments_teacher_idx on public.assignments(teacher_id, status);

-- Giudizio e note: tabella separata, visibile al discente solo a correzione pubblicata
create table if not exists public.assignment_reviews (
  assignment_id  uuid primary key references public.assignments(id) on delete cascade,
  feedback       text not null default '',
  grade          text,                    -- es. "Sufficiente", "7/10"
  updated_at     timestamptz not null default now()
);

create table if not exists public.assignment_files (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.assignments(id) on delete cascade,
  role           file_role not null,
  uploaded_by    uuid not null references public.profiles(id) on delete cascade,
  storage_path   text not null,
  file_name      text not null,
  size_bytes     bigint not null default 0,
  mime_type      text,
  created_at     timestamptz not null default now()
);

create index if not exists assignment_files_assignment_idx on public.assignment_files(assignment_id, role);

-- ---------------------------------------------------------------------
-- Messaggistica asincrona docente ↔ discente
-- ---------------------------------------------------------------------
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  teacher_id    uuid not null references public.profiles(id) on delete cascade,
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  body          text not null check (char_length(body) between 1 and 8000),
  read_at       timestamptz,
  created_at    timestamptz not null default now(),
  check (sender_id = student_id or sender_id = teacher_id)
);

create index if not exists messages_thread_idx on public.messages(student_id, teacher_id, created_at desc);

-- =====================================================================
-- Funzioni di supporto (security definer: leggono senza passare dalle RLS)
-- =====================================================================
create or replace function public.current_role_name()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher','admin'))
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.is_teacher(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and role in ('teacher','admin'))
$$;

create or replace function public.my_package_ids()
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(package_id), '{}')
  from public.enrollments
  where user_id = auth.uid()
    and status = 'active'
    and (ends_at is null or ends_at > now())
$$;

create or replace function public.has_active_enrollment()
returns boolean language sql stable security definer set search_path = public as $$
  select cardinality(public.my_package_ids()) > 0
$$;

create or replace function public.can_access_assignment(aid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.assignments a
    where a.id = aid and (a.student_id = auth.uid() or public.is_staff())
  )
$$;

-- Nuovo utente → profilo (dati Google o form di registrazione)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nessuno può cambiarsi il ruolo da solo (solo admin o service role)
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Solo un amministratore può modificare il ruolo';
  end if;
  if new.email is distinct from old.email and auth.uid() is not null and not public.is_admin() then
    new.email := old.email;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists packages_touch on public.packages;
create trigger packages_touch before update on public.packages
  for each row execute function public.touch_updated_at();
drop trigger if exists lessons_touch on public.lessons;
create trigger lessons_touch before update on public.lessons
  for each row execute function public.touch_updated_at();
drop trigger if exists assignments_touch on public.assignments;
create trigger assignments_touch before update on public.assignments
  for each row execute function public.touch_updated_at();

-- Il discente consegna: controlla proprietà, stato e presenza di almeno un file
create or replace function public.submit_assignment(aid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a public.assignments;
begin
  select * into a from public.assignments where id = aid for update;
  if a.id is null or a.student_id <> auth.uid() then
    raise exception 'Esercitazione non trovata';
  end if;
  if a.status not in ('assegnato', 'consegnato') then
    raise exception 'L''esercitazione è già in correzione';
  end if;
  if not exists (select 1 from public.assignment_files where assignment_id = aid and role = 'svolgimento') then
    raise exception 'Carica almeno un file prima di consegnare';
  end if;
  update public.assignments set status = 'consegnato', submitted_at = now() where id = aid;
end $$;

-- Segna come letti i messaggi ricevuti in una conversazione
create or replace function public.mark_thread_read(p_student uuid, p_teacher uuid)
returns void language sql security definer set search_path = public as $$
  update public.messages
     set read_at = now()
   where student_id = p_student
     and teacher_id = p_teacher
     and read_at is null
     and sender_id <> auth.uid()
     and auth.uid() in (p_student, p_teacher)
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles            enable row level security;
alter table public.packages            enable row level security;
alter table public.enrollments         enable row level security;
alter table public.lessons             enable row level security;
alter table public.lesson_files        enable row level security;
alter table public.assignments         enable row level security;
alter table public.assignment_reviews  enable row level security;
alter table public.assignment_files    enable row level security;
alter table public.messages            enable row level security;

-- profiles
drop policy if exists "profili: lettura" on public.profiles;
create policy "profili: lettura" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff() or role in ('teacher','admin'));
drop policy if exists "profili: modifica propria" on public.profiles;
create policy "profili: modifica propria" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- packages
drop policy if exists "pacchetti: lettura pubblica" on public.packages;
create policy "pacchetti: lettura pubblica" on public.packages for select to anon, authenticated
  using (active or public.is_admin());
drop policy if exists "pacchetti: gestione admin" on public.packages;
create policy "pacchetti: gestione admin" on public.packages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- enrollments (nessun insert lato client: solo webhook con service role)
drop policy if exists "iscrizioni: lettura" on public.enrollments;
create policy "iscrizioni: lettura" on public.enrollments for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
drop policy if exists "iscrizioni: gestione admin" on public.enrollments;
create policy "iscrizioni: gestione admin" on public.enrollments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- lessons
drop policy if exists "lezioni: lettura" on public.lessons;
create policy "lezioni: lettura" on public.lessons for select to authenticated
  using (public.is_staff() or (published and package_ids && public.my_package_ids()));
drop policy if exists "lezioni: gestione staff" on public.lessons;
create policy "lezioni: gestione staff" on public.lessons for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "materiali lezione: lettura" on public.lesson_files;
create policy "materiali lezione: lettura" on public.lesson_files for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id));  -- eredita RLS di lessons
drop policy if exists "materiali lezione: gestione staff" on public.lesson_files;
create policy "materiali lezione: gestione staff" on public.lesson_files for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- assignments
drop policy if exists "esercitazioni: lettura" on public.assignments;
create policy "esercitazioni: lettura" on public.assignments for select to authenticated
  using (student_id = auth.uid() or public.is_staff());
drop policy if exists "esercitazioni: gestione staff" on public.assignments;
create policy "esercitazioni: gestione staff" on public.assignments for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- assignment_reviews: il discente vede il giudizio solo a correzione pubblicata
drop policy if exists "giudizi: lettura" on public.assignment_reviews;
create policy "giudizi: lettura" on public.assignment_reviews for select to authenticated
  using (
    public.is_staff() or exists (
      select 1 from public.assignments a
      where a.id = assignment_id and a.student_id = auth.uid() and a.status = 'corretto'
    )
  );
drop policy if exists "giudizi: gestione staff" on public.assignment_reviews;
create policy "giudizi: gestione staff" on public.assignment_reviews for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- assignment_files
drop policy if exists "file esercitazione: lettura" on public.assignment_files;
create policy "file esercitazione: lettura" on public.assignment_files for select to authenticated
  using (
    public.is_staff() or exists (
      select 1 from public.assignments a
      where a.id = assignment_id
        and a.student_id = auth.uid()
        and (role <> 'correzione' or a.status = 'corretto')
    )
  );
drop policy if exists "file esercitazione: caricamento discente" on public.assignment_files;
create policy "file esercitazione: caricamento discente" on public.assignment_files for insert to authenticated
  with check (
    role = 'svolgimento'
    and uploaded_by = auth.uid()
    and storage_path like 'svolgimenti/' || assignment_id::text || '/%'
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_id and a.student_id = auth.uid() and a.status in ('assegnato','consegnato')
    )
  );
drop policy if exists "file esercitazione: rimozione discente" on public.assignment_files;
create policy "file esercitazione: rimozione discente" on public.assignment_files for delete to authenticated
  using (
    role = 'svolgimento' and uploaded_by = auth.uid() and exists (
      select 1 from public.assignments a
      where a.id = assignment_id and a.student_id = auth.uid() and a.status in ('assegnato','consegnato')
    )
  );
drop policy if exists "file esercitazione: gestione staff" on public.assignment_files;
create policy "file esercitazione: gestione staff" on public.assignment_files for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- messages
drop policy if exists "messaggi: lettura" on public.messages;
create policy "messaggi: lettura" on public.messages for select to authenticated
  using (student_id = auth.uid() or teacher_id = auth.uid() or public.is_admin());
drop policy if exists "messaggi: invio" on public.messages;
create policy "messaggi: invio" on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid() and (
      (student_id = auth.uid() and public.is_teacher(teacher_id) and public.has_active_enrollment())
      or (teacher_id = auth.uid() and public.is_staff())
    )
  );

-- =====================================================================
-- Storage: bucket privato per tracce, svolgimenti, correzioni, materiali
--   tracce/<batch_id>/<file>
--   svolgimenti/<assignment_id>/<file>
--   correzioni/<assignment_id>/<file>
--   lezioni/<lesson_id>/<file>
-- I download passano sempre dal server (URL firmati da 60 secondi).
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('materiali', 'materiali', false, 52428800)   -- 50 MB per file
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "materiali: staff" on storage.objects;
create policy "materiali: staff" on storage.objects for all to authenticated
  using (bucket_id = 'materiali' and public.is_staff())
  with check (bucket_id = 'materiali' and public.is_staff());

drop policy if exists "materiali: discente carica svolgimento" on storage.objects;
create policy "materiali: discente carica svolgimento" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'materiali'
    and (storage.foldername(name))[1] = 'svolgimenti'
    and exists (
      select 1 from public.assignments a
      where a.id::text = (storage.foldername(name))[2]
        and a.student_id = auth.uid()
        and a.status in ('assegnato','consegnato')
    )
  );

drop policy if exists "materiali: discente rimuove svolgimento" on storage.objects;
create policy "materiali: discente rimuove svolgimento" on storage.objects for delete to authenticated
  using (
    bucket_id = 'materiali'
    and (storage.foldername(name))[1] = 'svolgimenti'
    and owner_id = auth.uid()::text
    and exists (
      select 1 from public.assignments a
      where a.id::text = (storage.foldername(name))[2]
        and a.student_id = auth.uid()
        and a.status in ('assegnato','consegnato')
    )
  );

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


-- =====================================================================
--  0004: collegamenti a servizi esterni (canale YouTube della scuola)
--  I token sono cifrati dal server e la tabella non ha policy:
--  nessun utente la legge dal browser, solo il server con la service role.
-- =====================================================================
create table if not exists public.integrations (
  provider        text primary key check (provider in ('youtube')),
  account_id      text,              -- id del canale
  account_name    text,              -- nome del canale
  account_image   text,              -- immagine del canale
  extra           jsonb not null default '{}',   -- es. playlist dei caricamenti
  secret          text not null,     -- refresh token cifrato
  connected_by    uuid references public.profiles(id) on delete set null,
  connected_at    timestamptz not null default now()
);

alter table public.integrations enable row level security;
-- nessuna policy: accesso solo dal server


-- Pacchetti di esempio: modificare testi e prezzi dal pannello "Pacchetti" o qui.
insert into public.packages
  (slug, title, tagline, description, period_label, starts_on, ends_on, access_until,
   price_cents, promo_price_cents, promo_label, promo_until, features, highlight, sort)
values
(
  'intensivo-marzo-maggio-2027',
  'Intensivo primavera',
  'Dodici settimane di scrittura guidata prima della prova.',
  'Il percorso per chi vuole arrivare alla prova scritta con un metodo collaudato: un atto o un parere a settimana, corretto a mano da un docente, e una lezione in presenza al mese per lavorare sugli errori ricorrenti.',
  'Marzo – maggio 2027',
  '2027-03-01', '2027-05-31', '2027-06-30',
  89000, 69000, 'Prezzo di lancio fino al 31 gennaio', '2027-01-31 23:59:59+01',
  array[
    '3 mini lezioni registrate al mese',
    '1 lezione in presenza al mese',
    '12 tracce tra pareri e atti',
    'Correzione personalizzata di ogni elaborato',
    'Messaggi diretti con i docenti'
  ],
  true, 1
),
(
  'annuale-2026-2027',
  'Percorso annuale',
  'Dalle basi del metodo alla simulazione d''esame.',
  'Il programma completo: parte dal ragionamento giuridico e dalla struttura del parere, passa agli atti giudiziari e chiude con simulazioni a tempo nelle condizioni della prova.',
  'Novembre 2026 – giugno 2027',
  '2026-11-15', '2027-06-15', '2027-07-31',
  149000, null, null, null,
  array[
    'Tutte le lezioni registrate dell''anno',
    '8 lezioni in presenza',
    '30 tracce con correzione personalizzata',
    '3 simulazioni d''esame a tempo',
    'Messaggi diretti con i docenti'
  ],
  false, 2
),
(
  'modulo-atti-giudiziari',
  'Modulo atti giudiziari',
  'Solo atti: civile, penale e amministrativo.',
  'Per chi ha già un metodo sul parere e vuole allenarsi sugli atti. Sei tracce, sei correzioni, due lezioni registrate per materia.',
  'Gennaio – febbraio 2027',
  '2027-01-10', '2027-02-28', '2027-03-31',
  39000, null, null, null,
  array[
    '6 lezioni registrate',
    '6 atti con correzione personalizzata',
    'Messaggi diretti con i docenti'
  ],
  false, 3
)
on conflict (slug) do nothing;

-- Dopo il primo accesso, promuovere gli account dello staff:
-- update public.profiles set role = 'admin'   where email = 'direzione@esempio.it';
-- update public.profiles set role = 'teacher' where email = 'docente@esempio.it';

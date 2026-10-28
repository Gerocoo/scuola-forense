-- =====================================================================
--  INSTALLAZIONE COMPLETA: copia TUTTO questo file nell'SQL Editor di
--  Supabase e premi Run. Si può rieseguire senza danni.
--  (contiene 0001_schema.sql + 0002_video_calendario.sql + 0003_appunti.sql + 0004_integrazioni.sql + 0005_percorso.sql + 0006_inviti_docenti.sql + 0007_gestione_account.sql + 0008_corsi_docenti.sql + 0009_promemoria_correzioni.sql + 0010_superadmin_registro.sql + 0011_inviti_con_corsi.sql + 0012_annotazioni_pdf.sql + 0013_foto_profilo.sql + 0014…0022 + seed.sql)
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


-- =====================================================================
--  0006: inviti docenti
-- =====================================================================
-- Inviti docenti: l'amministratore inserisce l'email; quando quella persona si registra
-- (con Google o con email e password) diventa automaticamente docente.

create table if not exists public.teacher_invites (
  email      text primary key check (email = lower(email)),
  role       user_role not null default 'teacher' check (role in ('teacher', 'admin')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.teacher_invites enable row level security;

drop policy if exists "inviti: solo amministratori" on public.teacher_invites;
create policy "inviti: solo amministratori" on public.teacher_invites for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Alla registrazione: se l'email era stata invitata, il profilo nasce con il ruolo indicato.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  invited user_role;
begin
  select ti.role into invited from public.teacher_invites ti where ti.email = lower(coalesce(new.email, ''));

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    coalesce(invited, 'student')
  )
  on conflict (id) do nothing;

  if invited is not null then
    delete from public.teacher_invites where email = lower(new.email);
  end if;
  return new;
end $$;


-- =====================================================================
--  0007: gestione account
-- =====================================================================
-- Prima di eliminare un docente: le sue esercitazioni, i file di correzione e le conversazioni
-- passano a un altro membro dello staff, così i discenti non perdono nulla.
create or replace function public.reassign_staff(old_id uuid, new_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and auth.uid() is not null then
    raise exception 'Solo un amministratore può farlo';
  end if;
  update public.assignments set teacher_id = new_id where teacher_id = old_id;
  update public.assignment_files set uploaded_by = new_id where uploaded_by = old_id;
  update public.messages
     set teacher_id = new_id,
         sender_id = case when sender_id = old_id then new_id else sender_id end
   where teacher_id = old_id;
end $$;

revoke all on function public.reassign_staff(uuid, uuid) from public, anon;


-- =====================================================================
--  0008: corsi, docenti del corso, esercizi di corso
-- =====================================================================
-- Docenti assegnati ai corsi ed esercizi "di corso".

create table if not exists public.package_teachers (
  package_id uuid not null references public.packages(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (package_id, teacher_id)
);
create index if not exists package_teachers_teacher_idx on public.package_teachers(teacher_id);

alter table public.package_teachers enable row level security;

drop policy if exists "docenti corso: lettura staff" on public.package_teachers;
create policy "docenti corso: lettura staff" on public.package_teachers for select to authenticated
  using (public.is_staff());

drop policy if exists "docenti corso: gestione admin" on public.package_teachers;
create policy "docenti corso: gestione admin" on public.package_teachers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Esercizio assegnato a tutto il corso
alter table public.assignments add column if not exists package_id uuid references public.packages(id) on delete set null;
create index if not exists assignments_package_idx on public.assignments(package_id, batch_id);

create or replace function public.teaches_package(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from public.package_teachers where package_id = pid and teacher_id = auth.uid())
$$;

-- Modello dell'esercizio di corso (l'id coincide con assignments.batch_id)
create table if not exists public.course_exercises (
  id           uuid primary key default gen_random_uuid(),
  package_id   uuid not null references public.packages(id) on delete cascade,
  teacher_id   uuid references public.profiles(id) on delete set null,
  kind         assignment_kind not null default 'parere',
  title        text not null,
  instructions text not null default '',
  due_at       timestamptz,
  lesson_id    uuid references public.lessons(id) on delete set null,
  files        jsonb not null default '[]',
  created_at   timestamptz not null default now()
);
create index if not exists course_exercises_package_idx on public.course_exercises(package_id, created_at desc);

alter table public.course_exercises enable row level security;

drop policy if exists "esercizi corso: lettura staff" on public.course_exercises;
create policy "esercizi corso: lettura staff" on public.course_exercises for select to authenticated
  using (public.is_staff());
drop policy if exists "esercizi corso: gestione docenti del corso" on public.course_exercises;
create policy "esercizi corso: gestione docenti del corso" on public.course_exercises for all to authenticated
  using (public.teaches_package(package_id)) with check (public.teaches_package(package_id));

-- Chi si iscrive (o viene riattivato) riceve gli esercizi del corso con i file della traccia.
create or replace function public.copy_course_assignments()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ce record;
  new_id uuid;
begin
  if new.status <> 'active' then
    return new;
  end if;

  for ce in
    select c.* from public.course_exercises c
    where c.package_id = new.package_id
      and c.teacher_id is not null
      and not exists (select 1 from public.assignments x where x.batch_id = c.id and x.student_id = new.user_id)
    order by c.created_at
  loop
    insert into public.assignments (batch_id, teacher_id, student_id, kind, title, instructions, due_at, lesson_id, package_id)
    values (ce.id, ce.teacher_id, new.user_id, ce.kind, ce.title, ce.instructions, ce.due_at, ce.lesson_id, ce.package_id)
    returning id into new_id;

    insert into public.assignment_files (assignment_id, role, uploaded_by, storage_path, file_name, size_bytes, mime_type)
    select new_id, 'traccia', ce.teacher_id, f->>'path', f->>'name', coalesce((f->>'size')::bigint, 0), nullif(f->>'type', '')
    from jsonb_array_elements(ce.files) f;
  end loop;

  return new;
end $$;

drop trigger if exists enrollments_copy_course_assignments on public.enrollments;
create trigger enrollments_copy_course_assignments
  after insert or update of status on public.enrollments
  for each row execute function public.copy_course_assignments();


-- =====================================================================
--  0009: promemoria correzioni
-- =====================================================================
-- Promemoria al docente quando una consegna aspetta la correzione da 5 giorni (impegno: entro 7).
alter table public.assignments add column if not exists correction_reminder_at timestamptz;


-- =====================================================================
--  0010: super amministratore e registro attività
-- =====================================================================
-- Super amministratore (il gestore tecnico della piattaforma) e registro delle attività.

alter table public.profiles add column if not exists is_super boolean not null default false;

-- Il super amministratore ha tutti i poteri dell'amministratore
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and (role = 'admin' or is_super))
$$;

create or replace function public.is_super()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_super)
$$;

-- Nessuno può darsi o togliere il super potere dal sito; nessuno può toccare il ruolo di un super amministratore
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if new.is_super is distinct from old.is_super then
      raise exception 'Il super amministratore si imposta solo dal database';
    end if;
    if old.is_super and new.role is distinct from old.role then
      raise exception 'Il ruolo del super amministratore non si può modificare';
    end if;
    if new.role is distinct from old.role and not public.is_admin() then
      raise exception 'Solo un amministratore può modificare il ruolo';
    end if;
    if new.email is distinct from old.email and not public.is_admin() then
      new.email := old.email;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Registro attività -------------------------------------------------------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor_id    uuid,
  actor_email text,
  action      text not null,            -- insert | update | delete | login
  table_name  text not null,
  record_id   text,
  old_data    jsonb,
  new_data    jsonb
);
create index if not exists audit_log_at_idx on public.audit_log(at desc);
create index if not exists audit_log_table_idx on public.audit_log(table_name, at desc);
create index if not exists audit_log_actor_idx on public.audit_log(actor_id, at desc);

alter table public.audit_log enable row level security;
drop policy if exists "registro: solo super" on public.audit_log;
create policy "registro: solo super" on public.audit_log for select to authenticated using (public.is_super());

create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  n jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  uid uuid := auth.uid();
begin
  -- dati da non conservare nel registro
  o := o - 'secret' - 'body' - 'buckets' - 'instructions' - 'summary' - 'feedback';
  n := n - 'secret' - 'body' - 'buckets' - 'instructions' - 'summary' - 'feedback';
  if tg_op = 'UPDATE' and o - 'updated_at' = n - 'updated_at' then
    return new;
  end if;
  insert into public.audit_log (actor_id, actor_email, action, table_name, record_id, old_data, new_data)
  values (
    uid,
    (select email from public.profiles where id = uid),
    lower(tg_op),
    tg_table_name,
    coalesce(n->>'id', o->>'id', n->>'assignment_id', o->>'assignment_id', n->>'provider', o->>'provider', n->>'package_id', o->>'package_id', n->>'lesson_id', o->>'lesson_id', n->>'email', o->>'email'),
    o,
    n
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'packages', 'enrollments', 'lessons', 'lesson_files', 'lesson_bookings',
    'assignments', 'assignment_files', 'assignment_reviews', 'course_exercises',
    'package_teachers', 'teacher_invites', 'integrations', 'messages'
  ] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    -- dei messaggi si registrano solo invio ed eliminazione (non le letture)
    execute format('create trigger audit_%1$s after insert or %2$s delete on public.%1$I for each row execute function public.audit_row()',
                   t, case when t = 'messages' then '' else 'update or' end);
  end loop;
end $$;

-- Accessi alla piattaforma
create or replace function public.audit_login()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    insert into public.audit_log (actor_id, actor_email, action, table_name, record_id, new_data)
    values (new.id, new.email, 'login', 'auth', new.id::text,
            jsonb_build_object('provider', new.raw_app_meta_data->>'provider'));
  end if;
  return new;
end $$;

drop trigger if exists audit_login on auth.users;
create trigger audit_login after update of last_sign_in_at on auth.users
  for each row execute function public.audit_login();


-- =====================================================================
--  0011: inviti docenti con corsi
-- =====================================================================
-- Invito docente con corsi già assegnati: alla registrazione entra nei corsi indicati.
alter table public.teacher_invites add column if not exists package_ids uuid[] not null default '{}';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  inv record;
begin
  select ti.role, ti.package_ids into inv from public.teacher_invites ti where ti.email = lower(coalesce(new.email, ''));

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    coalesce(inv.role, 'student')
  )
  on conflict (id) do nothing;

  if inv.role is not null then
    insert into public.package_teachers (package_id, teacher_id)
    select p.id, new.id from public.packages p where p.id = any(inv.package_ids)
    on conflict do nothing;
    delete from public.teacher_invites where email = lower(new.email);
  end if;
  return new;
end $$;


-- =====================================================================
--  0012: correzione sul documento
-- =====================================================================
-- Correzione sul documento: versione PDF dei file Word e annotazioni del docente.

alter table public.assignment_files add column if not exists pdf_path text;

create table if not exists public.assignment_annotations (
  file_id       uuid primary key references public.assignment_files(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  data          jsonb not null default '{"pages":{}}',
  updated_by    uuid references public.profiles(id) on delete set null,
  updated_at    timestamptz not null default now()
);
create index if not exists assignment_annotations_assignment_idx on public.assignment_annotations(assignment_id);

alter table public.assignment_annotations enable row level security;

drop policy if exists "annotazioni: staff" on public.assignment_annotations;
create policy "annotazioni: staff" on public.assignment_annotations for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- il discente vede le annotazioni solo a correzione pubblicata
drop policy if exists "annotazioni: discente a correzione pubblicata" on public.assignment_annotations;
create policy "annotazioni: discente a correzione pubblicata" on public.assignment_annotations for select to authenticated
  using (exists (
    select 1 from public.assignments a
    where a.id = assignment_id and a.student_id = auth.uid() and a.status = 'corretto'
  ));


-- =====================================================================
--  0013: foto profilo
-- =====================================================================
-- Foto profilo: archivio pubblico in sola lettura (i caricamenti passano dal server).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;


-- =====================================================================
--  0014_simulazioni_a_tempo.sql
-- =====================================================================
-- Simulazione d'esame a tempo: la traccia si apre a un'ora precisa e si consegna entro la durata stabilita.
-- Prima dell'apertura il discente non può leggere né la traccia né i suoi file (regola del database).

alter table public.assignments add column if not exists opens_at timestamptz;
alter table public.assignments add column if not exists timed boolean not null default false;
alter table public.course_exercises add column if not exists opens_at timestamptz;
alter table public.course_exercises add column if not exists timed boolean not null default false;

drop policy if exists "esercitazioni: lettura" on public.assignments;
create policy "esercitazioni: lettura" on public.assignments for select to authenticated
  using (public.is_staff() or (student_id = auth.uid() and (opens_at is null or opens_at <= now())));

-- Prossime simulazioni del discente (solo dati di calendario, senza testo della traccia)
create or replace function public.my_upcoming_exams()
returns table (id uuid, title text, kind assignment_kind, opens_at timestamptz, due_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.title, a.kind, a.opens_at, a.due_at
  from public.assignments a
  where a.student_id = auth.uid() and a.opens_at is not null and a.opens_at > now()
  order by a.opens_at
$$;

-- Consegna: per le simulazioni a tempo non si accettano consegne oltre la scadenza (5 minuti di tolleranza)
create or replace function public.submit_assignment(aid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a public.assignments;
begin
  select * into a from public.assignments where id = aid for update;
  if a.id is null or a.student_id <> auth.uid() then
    raise exception 'Esercitazione non trovata';
  end if;
  if a.opens_at is not null and a.opens_at > now() then
    raise exception 'La simulazione non è ancora iniziata';
  end if;
  if a.timed and a.due_at is not null and now() > a.due_at + interval '5 minutes' then
    raise exception 'Il tempo della simulazione è scaduto';
  end if;
  if a.status not in ('assegnato', 'consegnato') then
    raise exception 'L''esercitazione è già in correzione';
  end if;
  if not exists (select 1 from public.assignment_files where assignment_id = aid and role = 'svolgimento') then
    raise exception 'Carica almeno un file prima di consegnare';
  end if;
  update public.assignments set status = 'consegnato', submitted_at = now() where id = aid;
end $$;

drop policy if exists "file esercitazione: caricamento discente" on public.assignment_files;
create policy "file esercitazione: caricamento discente" on public.assignment_files for insert to authenticated
  with check (
    role = 'svolgimento'
    and uploaded_by = auth.uid()
    and storage_path like 'svolgimenti/' || assignment_id::text || '/%'
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_id and a.student_id = auth.uid() and a.status in ('assegnato','consegnato')
        and (a.opens_at is null or a.opens_at <= now())
        and (not a.timed or a.due_at is null or now() <= a.due_at + interval '5 minutes')
    )
  );

-- Copia agli iscritti successivi anche apertura e modalità a tempo
create or replace function public.copy_course_assignments()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ce record;
  new_id uuid;
begin
  if new.status <> 'active' then
    return new;
  end if;

  for ce in
    select c.* from public.course_exercises c
    where c.package_id = new.package_id
      and c.teacher_id is not null
      and not exists (select 1 from public.assignments x where x.batch_id = c.id and x.student_id = new.user_id)
    order by c.created_at
  loop
    insert into public.assignments (batch_id, teacher_id, student_id, kind, title, instructions, due_at, lesson_id, package_id, opens_at, timed)
    values (ce.id, ce.teacher_id, new.user_id, ce.kind, ce.title, ce.instructions, ce.due_at, ce.lesson_id, ce.package_id, ce.opens_at, ce.timed)
    returning id into new_id;

    insert into public.assignment_files (assignment_id, role, uploaded_by, storage_path, file_name, size_bytes, mime_type)
    select new_id, 'traccia', ce.teacher_id, f->>'path', f->>'name', coalesce((f->>'size')::bigint, 0), nullif(f->>'type', '')
    from jsonb_array_elements(ce.files) f;
  end loop;

  return new;
end $$;


-- =====================================================================
--  0015_griglia_valutazione.sql
-- =====================================================================
-- Griglia di valutazione con i criteri del nuovo esame: punteggio per criterio e totale in trentesimi.
alter table public.assignment_reviews add column if not exists scores jsonb;
alter table public.assignment_reviews add column if not exists total smallint check (total between 0 and 30);


-- =====================================================================
--  0016_correzione_collettiva.sql
-- =====================================================================
-- Correzione collettiva degli esercizi di corso: traccia svolta, errori frequenti, link alla correzione in classe.
-- Ai discenti si mostra dopo la scadenza (lettura tramite server, con controllo dell'iscrizione).
alter table public.course_exercises add column if not exists solution text not null default '';
alter table public.course_exercises add column if not exists common_errors text not null default '';
alter table public.course_exercises add column if not exists review_url text;
alter table public.course_exercises add column if not exists solution_files jsonb not null default '[]';
alter table public.course_exercises add column if not exists collective_published boolean not null default false;


-- =====================================================================
--  0017_materie.sql
-- =====================================================================
-- Percorsi per materia: materia del corso (vuota = tutte) e materia scelta dal discente per l'esame.
alter table public.packages add column if not exists subject text check (subject in ('civile', 'penale', 'amministrativo'));
alter table public.profiles add column if not exists exam_subject text check (exam_subject in ('civile', 'penale', 'amministrativo'));


-- =====================================================================
--  0018_orale.sql
-- =====================================================================
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


-- =====================================================================
--  0018b_domande_esempio.sql
-- =====================================================================
-- Domande di esempio per il quiz dell'orale (da verificare e ampliare a cura dei docenti).
insert into public.quiz_questions (topic, question, options, correct, explanation) values
('deontologia', 'Quale articolo del Codice deontologico forense disciplina il dovere di riserbo e il segreto professionale?', array['Art. 13','Art. 28','Art. 37','Art. 46'], 1, 'L''art. 28 del Codice deontologico forense riguarda riserbo e segreto professionale.'),
('deontologia', 'Il conflitto di interessi è disciplinato dal Codice deontologico forense all''articolo:', array['Art. 24','Art. 15','Art. 35','Art. 50'], 0, 'L''art. 24 disciplina il conflitto di interessi.'),
('deontologia', 'Quale articolo del Codice deontologico vieta l''accaparramento di clientela?', array['Art. 9','Art. 23','Art. 37','Art. 57'], 2, 'L''art. 37 vieta all''avvocato di acquisire rapporti di clientela con modi non conformi a correttezza e decoro.'),
('deontologia', 'Il dovere di aggiornamento professionale e di formazione continua è previsto dall''articolo:', array['Art. 15','Art. 28','Art. 42','Art. 63'], 0, 'L''art. 15 del Codice deontologico prevede il dovere di aggiornamento e formazione continua.'),
('deontologia', 'Qual è la sanzione disciplinare più grave tra quelle previste per l''avvocato?', array['Censura','Sospensione','Avvertimento','Radiazione'], 3, 'Le sanzioni sono, in ordine di gravità: avvertimento, censura, sospensione, radiazione.'),
('ordinamento', 'Qual è la legge che disciplina l''ordinamento della professione forense?', array['Legge n. 247 del 2012','Legge n. 241 del 1990','R.D.L. n. 1578 del 1933, tuttora unico riferimento','Legge n. 69 del 2009'], 0, 'La legge 31 dicembre 2012, n. 247 contiene la nuova disciplina dell''ordinamento della professione forense.'),
('ordinamento', 'Quale organo decide in primo grado sui procedimenti disciplinari a carico degli avvocati?', array['Il Consiglio dell''Ordine circondariale','Il Consiglio distrettuale di disciplina','Il Consiglio nazionale forense','La Corte d''appello'], 1, 'Con la legge n. 247/2012 il potere disciplinare è affidato ai Consigli distrettuali di disciplina.'),
('ordinamento', 'Contro le decisioni del Consiglio distrettuale di disciplina si propone ricorso:', array['Al TAR','Alla Corte di cassazione direttamente','Al Consiglio nazionale forense','Al Consiglio dell''Ordine'], 2, 'Le decisioni del Consiglio distrettuale di disciplina sono impugnabili davanti al Consiglio nazionale forense.'),
('previdenza', 'Qual è l''ente di previdenza e assistenza degli avvocati?', array['INPS, gestione separata','Cassa Nazionale di Previdenza e Assistenza Forense','INAIL','ENPAP'], 1, 'La previdenza degli avvocati è gestita dalla Cassa Nazionale di Previdenza e Assistenza Forense.'),
('previdenza', 'L''iscrizione alla Cassa Forense per l''avvocato iscritto all''albo è:', array['Facoltativa','Obbligatoria','Prevista solo oltre una soglia di reddito','Prevista solo per gli avvocati cassazionisti'], 1, 'Con la legge n. 247/2012 l''iscrizione all''albo comporta l''iscrizione obbligatoria alla Cassa Forense.');


-- =====================================================================
--  0019_prova_gratuita.sql
-- =====================================================================
-- Prova gratuita: contatti raccolti dalla pagina pubblica e corso di prova (nascosto dalla vetrina).
create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  name       text not null default '',
  source     text not null default 'prova-gratuita',
  user_id    uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists leads_email_source_idx on public.leads(lower(email), source);
alter table public.leads enable row level security;
create policy "contatti: solo amministratori" on public.leads for select to authenticated using (public.is_admin());

insert into public.packages (slug, title, tagline, description, period_label, price_cents, active, sort, features)
values ('prova-gratuita', 'Prova gratuita', 'Una traccia d''esame con correzione personale', 'Corso di prova: ricevi una traccia, la svolgi e un docente la corregge.', '30 giorni', 0, false, 999, array['Una traccia d''esame','Correzione personale del docente'])
on conflict (slug) do nothing;
create unique index if not exists leads_email_source_key on public.leads(email, source);


-- =====================================================================
--  0020_archivio_tracce.sql
-- =====================================================================
-- Archivio delle tracce d'esame degli anni passati, per materia e tipo di prova.
create table if not exists public.past_tracks (
  id         uuid primary key default gen_random_uuid(),
  year       smallint not null check (year between 1990 and 2100),
  session    text not null default '',
  subject    text not null check (subject in ('civile', 'penale', 'amministrativo')),
  kind       text not null check (kind in ('parere', 'atto')),
  title      text not null,
  body       text not null default '',
  file       jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists past_tracks_idx on public.past_tracks(subject, kind, year desc);
alter table public.past_tracks enable row level security;
create policy "archivio: lettura iscritti e staff" on public.past_tracks for select to authenticated
  using (public.is_staff() or public.has_active_enrollment());
create policy "archivio: gestione staff" on public.past_tracks for all to authenticated
  using (public.is_staff()) with check (public.is_staff());


-- =====================================================================
--  0021_notifiche_push.sql
-- =====================================================================
-- Notifiche push: dispositivi iscritti e ultima notifica da mostrare (il push arriva senza contenuto).
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
create policy "push: propri" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.push_last (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  payload jsonb not null,
  at      timestamptz not null default now()
);
alter table public.push_last enable row level security;
create policy "push: ultima notifica propria" on public.push_last for select to authenticated using (user_id = auth.uid());


-- =====================================================================
--  0022_permessi_funzioni.sql
-- =====================================================================
-- Sicurezza: azioni che richiedono l'accesso non richiamabili da anonimi; funzioni dei trigger non esposte come API.
revoke execute on function public.book_lesson(uuid) from public, anon;
revoke execute on function public.cancel_booking(uuid) from public, anon;
revoke execute on function public.book_oral_slot(uuid) from public, anon;
revoke execute on function public.cancel_oral_slot(uuid) from public, anon;
revoke execute on function public.mark_thread_read(uuid, uuid) from public, anon;
revoke execute on function public.submit_assignment(uuid) from public, anon;
revoke execute on function public.my_upcoming_exams() from public, anon;
revoke execute on function public.reassign_staff(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.audit_row() from public, anon, authenticated;
revoke execute on function public.audit_login() from public, anon, authenticated;
revoke execute on function public.copy_course_assignments() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;
grant execute on function public.audit_login() to supabase_auth_admin;
grant execute on function public.audit_row() to supabase_auth_admin;
alter function public.touch_updated_at() set search_path = public;


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

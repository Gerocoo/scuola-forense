-- Servizi a pagamento: lezioni private e correzioni a credito, simulazioni, abbonamento,
-- codici amico, recensioni, impostazioni pubbliche e guide.

-- tipo di prodotto e crediti inclusi
alter table public.packages add column if not exists product text not null default 'corso'
  check (product in ('corso', 'lezioni', 'correzioni', 'simulazione', 'abbonamento', 'accessorio'));
alter table public.packages add column if not exists credit_minutes integer not null default 0 check (credit_minutes between 0 and 6000);
alter table public.packages add column if not exists credit_corrections integer not null default 0 check (credit_corrections between 0 and 100);
alter table public.packages add column if not exists includes_oral boolean not null default false;
alter table public.packages add column if not exists includes_archive boolean not null default false;
-- durata dell'accesso dall'acquisto (es. 365 per l'abbonamento); se vuota vale "accesso fino al"
alter table public.packages add column if not exists duration_days integer check (duration_days between 1 and 1100);
update public.packages set product = 'accessorio' where slug in ('archivio-tracce', 'modulo-orale');
update public.packages set includes_archive = true where slug = 'archivio-tracce';

-- archivio completo: corsi veri (non la prova) e prodotti che lo includono
create or replace function public.has_archive_access()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from public.enrollments e join public.packages p on p.id = e.package_id
    where e.user_id = auth.uid() and e.status = 'active'
      and (e.ends_at is null or e.ends_at > now())
      and ((p.product = 'corso' and p.slug <> 'prova-gratuita') or p.includes_archive)
  )
$$;

-- registro dei crediti: acquisti (+), utilizzi (-), rimborsi (+), premi (+)
create table if not exists public.credits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          text not null check (kind in ('minutes', 'corrections')),
  amount        integer not null,
  reason        text not null check (reason in ('acquisto', 'utilizzo', 'rimborso', 'premio', 'manuale')),
  enrollment_id uuid references public.enrollments(id) on delete set null,
  meeting_id    uuid references public.meetings(id) on delete set null,
  assignment_id uuid references public.assignments(id) on delete set null,
  note          text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists credits_user_idx on public.credits(user_id, kind);
create unique index if not exists credits_purchase_once on public.credits(enrollment_id, kind) where reason = 'acquisto';
alter table public.credits enable row level security;
create policy "crediti: lettura" on public.credits for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- colloqui, lezioni private a credito e revisioni dell'elaborato
alter table public.meetings add column if not exists kind text not null default 'colloquio'
  check (kind in ('colloquio', 'lezione', 'revisione'));

-- correzioni su richiesta (fuori dai corsi)
alter table public.assignments add column if not exists on_request boolean not null default false;

-- l'abbonamento (o un prodotto che lo include) apre anche l'Orale
create or replace function public.has_oral_access()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from public.enrollments e join public.packages p on p.id = e.package_id
    where e.user_id = auth.uid() and e.status = 'active'
      and (e.ends_at is null or e.ends_at > now())
      and (p.slug = 'modulo-orale' or p.includes_oral)
  )
$$;

-- solo i corsi veri aprono messaggi, quiz e orale "di corso"
create or replace function public.has_active_enrollment()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.enrollments e join public.packages p on p.id = e.package_id
    where e.user_id = auth.uid() and e.status = 'active'
      and (e.ends_at is null or e.ends_at > now())
      and p.product in ('corso', 'abbonamento')
  )
$$;

-- codici amico
alter table public.profiles add column if not exists referral_code text unique;
create table if not exists public.referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references public.profiles(id) on delete cascade,
  referred_id   uuid not null references public.profiles(id) on delete cascade unique,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  created_at    timestamptz not null default now()
);
alter table public.referrals enable row level security;
create policy "amici: lettura" on public.referrals for select to authenticated
  using (referrer_id = auth.uid() or public.is_admin());

-- recensioni dei discenti, pubblicate dopo approvazione
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade unique,
  rating     smallint not null check (rating between 1 and 5),
  body       text not null check (char_length(body) between 20 and 1500),
  approved   boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
create policy "recensioni: lettura" on public.reviews for select to anon, authenticated
  using (approved or user_id = auth.uid() or public.is_staff());

-- impostazioni della scuola (es. percentuale di promossi), lette dal server
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;

-- guide e articoli per la vetrina
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null check (char_length(title) between 3 and 200),
  excerpt      text not null default '',
  body         text not null default '',
  published    boolean not null default false,
  published_at timestamptz,
  author_id    uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.posts enable row level security;
create policy "guide: lettura" on public.posts for select to anon, authenticated
  using (published or public.is_staff());

-- prodotti di esempio, da attivare in "Corsi in vendita" dopo aver deciso i prezzi
insert into public.packages (slug, title, tagline, description, period_label, price_cents, features, active, sort, product, credit_minutes, credit_corrections, includes_oral, includes_archive) values
  ('lezione-privata', 'Lezione privata (1 ora)', 'Un''ora in videochiamata con un docente, sul tema che scegli tu.', 'Lezione individuale con uno dei docenti della scuola: dubbi teorici, impostazione di un atto, metodo di studio.', 'Da usare quando vuoi', 6000, array['60 minuti con un docente', 'Prenoti tu l''orario', 'In videochiamata o in sede'], false, 900, 'lezioni', 60, 0, false, false),
  ('lezioni-private-5', 'Pacchetto 5 lezioni private', 'Cinque ore individuali, da usare quando servono.', 'Cinque ore di lezione individuale con i docenti della scuola, prenotabili dalla tua area.', 'Da usare quando vuoi', 27500, array['5 ore con i docenti', 'Risparmi rispetto alla lezione singola', 'Prenoti dalla tua area'], false, 901, 'lezioni', 300, 0, false, false),
  ('lezioni-private-10', 'Pacchetto 10 lezioni private', 'Dieci ore individuali per un percorso su misura.', 'Dieci ore di lezione individuale con i docenti della scuola, prenotabili dalla tua area.', 'Da usare quando vuoi', 50000, array['10 ore con i docenti', 'Il prezzo orario più basso', 'Prenoti dalla tua area'], false, 902, 'lezioni', 600, 0, false, false),
  ('revisione-elaborato', 'Revisione 1:1 dell''elaborato', 'Trenta minuti con il docente che ha corretto il tuo compito.', 'Rivedi la correzione insieme al docente: errori, impostazione e come migliorare il prossimo elaborato.', '30 minuti', 3500, array['30 minuti in videochiamata', 'Con il docente che ha corretto', 'Errori e strategia per il prossimo'], false, 903, 'lezioni', 30, 0, false, false),
  ('ultimo-miglio', 'Ultimo miglio', 'Tre settimane intensive prima della prova.', 'Pacchetto intensivo per le settimane prima dello scritto o dell''orale: lezioni individuali e correzioni prioritarie.', 'Ultime 3 settimane', 39000, array['3 ore di lezione individuale', '3 correzioni di elaborati', 'Accesso all''archivio tracce'], false, 904, 'lezioni', 180, 3, false, true),
  ('correzione-elaborato', 'Correzione di un elaborato', 'Invia il tuo atto o parere: correzione in 7 giorni.', 'Svolgi una traccia (anche dall''archivio) e inviala: un docente la corregge sul documento con la griglia della commissione, entro 7 giorni.', 'Correzione in 7 giorni', 4500, array['Correzione sul documento', 'Voto in trentesimi con la griglia della commissione', 'Entro 7 giorni'], false, 905, 'correzioni', 0, 1, false, false),
  ('correzioni-5', 'Pacchetto 5 correzioni', 'Cinque elaborati corretti dai docenti.', 'Cinque correzioni di atti o pareri, da usare quando vuoi.', 'Da usare quando vuoi', 19500, array['5 correzioni sul documento', 'Voto in trentesimi', 'Entro 7 giorni ciascuna'], false, 906, 'correzioni', 0, 5, false, false),
  ('abbonamento-annuale', 'Abbonamento annuale', 'Per chi ripete l''esame: archivio, orale e correzioni per un anno.', 'Un anno di accesso all''archivio tracce e al modulo Orale, con correzioni incluse. Pensato per chi si ripresenta all''esame.', '12 mesi', 49000, array['Archivio tracce completo', 'Modulo Orale incluso', '6 correzioni di elaborati'], false, 907, 'abbonamento', 0, 6, true, true)
on conflict (slug) do nothing;
update public.packages set duration_days = 365 where slug = 'abbonamento-annuale' and duration_days is null;

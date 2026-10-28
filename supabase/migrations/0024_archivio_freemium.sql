-- Archivio tracce: alcune gratuite per tutti gli utenti registrati, le altre sbloccabili
-- con l'acquisto dell'archivio o con qualsiasi corso (esclusa la prova gratuita).

alter table public.past_tracks add column if not exists free boolean not null default false;

-- un'iscrizione al solo archivio non dà accesso a quiz, orale e messaggi dei corsi
create or replace function public.has_active_enrollment()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.enrollments e join public.packages p on p.id = e.package_id
    where e.user_id = auth.uid() and e.status = 'active'
      and (e.ends_at is null or e.ends_at > now())
      and p.slug <> 'archivio-tracce'
  )
$$;

create or replace function public.has_archive_access()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from public.enrollments e join public.packages p on p.id = e.package_id
    where e.user_id = auth.uid() and e.status = 'active'
      and (e.ends_at is null or e.ends_at > now())
      and p.slug <> 'prova-gratuita'
  )
$$;
revoke execute on function public.has_archive_access() from public, anon;
grant execute on function public.has_archive_access() to authenticated, service_role;

alter policy "archivio: lettura iscritti e staff" on public.past_tracks
  using (free or public.has_archive_access());

-- prodotto "Archivio tracce" acquistabile a parte (non compare tra i corsi in vetrina)
insert into public.packages (slug, title, tagline, description, period_label, price_cents, features, active, sort)
values (
  'archivio-tracce',
  'Archivio tracce d''esame',
  'Tutte le tracce ufficiali degli anni passati, per allenarti nei tempi della prova.',
  'Accesso completo all''archivio delle tracce assegnate all''esame di avvocato negli anni passati: pareri e atti di diritto civile, penale e amministrativo. Incluso in tutti i corsi.',
  'Accesso illimitato',
  4900,
  array['Tutte le tracce degli anni passati', 'Civile, penale e amministrativo', 'Nuove sessioni aggiunte ogni anno'],
  true,
  999
)
on conflict (slug) do nothing;

-- segnaposti di sistema (es. importazione iniziale dell'archivio già eseguita)
create table if not exists public.app_flags (
  key text primary key,
  created_at timestamptz not null default now()
);
alter table public.app_flags enable row level security;
revoke all on public.app_flags from anon, authenticated;

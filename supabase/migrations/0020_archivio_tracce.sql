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

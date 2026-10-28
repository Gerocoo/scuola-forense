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

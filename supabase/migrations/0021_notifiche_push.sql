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

-- Colloqui individuali docente-discente: uno propone data e ora, l'altro accetta o propone un altro orario.
create table if not exists public.meetings (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles(id) on delete cascade,
  teacher_id   uuid not null references public.profiles(id) on delete cascade,
  topic        text not null check (char_length(topic) between 1 and 300),
  note         text not null default '',
  status       text not null default 'requested' check (status in ('requested', 'proposed', 'confirmed', 'cancelled')),
  starts_at    timestamptz,
  duration_min smallint not null default 30 check (duration_min between 10 and 180),
  mode         text not null default 'video' check (mode in ('video', 'presenza', 'telefono')),
  place        text not null default '',
  proposed_by  uuid references public.profiles(id) on delete set null,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists meetings_student_idx on public.meetings(student_id, starts_at);
create index if not exists meetings_teacher_idx on public.meetings(teacher_id, starts_at);
alter table public.meetings enable row level security;
create policy "colloqui: lettura" on public.meetings for select to authenticated
  using (student_id = auth.uid() or teacher_id = auth.uid() or public.is_admin());
-- le modifiche passano dalle azioni del server, che verificano chi può fare cosa

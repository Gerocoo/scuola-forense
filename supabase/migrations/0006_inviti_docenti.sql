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

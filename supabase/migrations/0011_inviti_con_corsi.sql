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

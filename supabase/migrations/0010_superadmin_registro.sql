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

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

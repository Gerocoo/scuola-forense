-- Docenti assegnati ai corsi ed esercizi "di corso".

create table if not exists public.package_teachers (
  package_id uuid not null references public.packages(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (package_id, teacher_id)
);
create index if not exists package_teachers_teacher_idx on public.package_teachers(teacher_id);

alter table public.package_teachers enable row level security;

drop policy if exists "docenti corso: lettura staff" on public.package_teachers;
create policy "docenti corso: lettura staff" on public.package_teachers for select to authenticated
  using (public.is_staff());

drop policy if exists "docenti corso: gestione admin" on public.package_teachers;
create policy "docenti corso: gestione admin" on public.package_teachers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Esercizio assegnato a tutto il corso
alter table public.assignments add column if not exists package_id uuid references public.packages(id) on delete set null;
create index if not exists assignments_package_idx on public.assignments(package_id, batch_id);

create or replace function public.teaches_package(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from public.package_teachers where package_id = pid and teacher_id = auth.uid())
$$;

-- Modello dell'esercizio di corso (l'id coincide con assignments.batch_id)
create table if not exists public.course_exercises (
  id           uuid primary key default gen_random_uuid(),
  package_id   uuid not null references public.packages(id) on delete cascade,
  teacher_id   uuid references public.profiles(id) on delete set null,
  kind         assignment_kind not null default 'parere',
  title        text not null,
  instructions text not null default '',
  due_at       timestamptz,
  lesson_id    uuid references public.lessons(id) on delete set null,
  files        jsonb not null default '[]',
  created_at   timestamptz not null default now()
);
create index if not exists course_exercises_package_idx on public.course_exercises(package_id, created_at desc);

alter table public.course_exercises enable row level security;

drop policy if exists "esercizi corso: lettura staff" on public.course_exercises;
create policy "esercizi corso: lettura staff" on public.course_exercises for select to authenticated
  using (public.is_staff());
drop policy if exists "esercizi corso: gestione docenti del corso" on public.course_exercises;
create policy "esercizi corso: gestione docenti del corso" on public.course_exercises for all to authenticated
  using (public.teaches_package(package_id)) with check (public.teaches_package(package_id));

-- Chi si iscrive (o viene riattivato) riceve gli esercizi del corso con i file della traccia.
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
    insert into public.assignments (batch_id, teacher_id, student_id, kind, title, instructions, due_at, lesson_id, package_id)
    values (ce.id, ce.teacher_id, new.user_id, ce.kind, ce.title, ce.instructions, ce.due_at, ce.lesson_id, ce.package_id)
    returning id into new_id;

    insert into public.assignment_files (assignment_id, role, uploaded_by, storage_path, file_name, size_bytes, mime_type)
    select new_id, 'traccia', ce.teacher_id, f->>'path', f->>'name', coalesce((f->>'size')::bigint, 0), nullif(f->>'type', '')
    from jsonb_array_elements(ce.files) f;
  end loop;

  return new;
end $$;

drop trigger if exists enrollments_copy_course_assignments on public.enrollments;
create trigger enrollments_copy_course_assignments
  after insert or update of status on public.enrollments
  for each row execute function public.copy_course_assignments();

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

-- Chi si iscrive dopo riceve gli esercizi già assegnati al corso (con i file della traccia).
create or replace function public.copy_course_assignments()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  b record;
  new_id uuid;
begin
  if new.status <> 'active' then
    return new;
  end if;

  for b in
    select distinct on (a.batch_id) a.*
    from public.assignments a
    where a.package_id = new.package_id
      and not exists (
        select 1 from public.assignments x where x.batch_id = a.batch_id and x.student_id = new.user_id
      )
    order by a.batch_id, a.created_at
  loop
    insert into public.assignments (batch_id, teacher_id, student_id, kind, title, instructions, due_at, lesson_id, package_id)
    values (b.batch_id, b.teacher_id, new.user_id, b.kind, b.title, b.instructions, b.due_at, b.lesson_id, b.package_id)
    returning id into new_id;

    insert into public.assignment_files (assignment_id, role, uploaded_by, storage_path, file_name, size_bytes, mime_type)
    select new_id, f.role, f.uploaded_by, f.storage_path, f.file_name, f.size_bytes, f.mime_type
    from public.assignment_files f
    where f.assignment_id = b.id and f.role = 'traccia';
  end loop;

  return new;
end $$;

drop trigger if exists enrollments_copy_course_assignments on public.enrollments;
create trigger enrollments_copy_course_assignments
  after insert or update of status on public.enrollments
  for each row execute function public.copy_course_assignments();

-- Correzione sul documento: versione PDF dei file Word e annotazioni del docente.

alter table public.assignment_files add column if not exists pdf_path text;

create table if not exists public.assignment_annotations (
  file_id       uuid primary key references public.assignment_files(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  data          jsonb not null default '{"pages":{}}',
  updated_by    uuid references public.profiles(id) on delete set null,
  updated_at    timestamptz not null default now()
);
create index if not exists assignment_annotations_assignment_idx on public.assignment_annotations(assignment_id);

alter table public.assignment_annotations enable row level security;

drop policy if exists "annotazioni: staff" on public.assignment_annotations;
create policy "annotazioni: staff" on public.assignment_annotations for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- il discente vede le annotazioni solo a correzione pubblicata
drop policy if exists "annotazioni: discente a correzione pubblicata" on public.assignment_annotations;
create policy "annotazioni: discente a correzione pubblicata" on public.assignment_annotations for select to authenticated
  using (exists (
    select 1 from public.assignments a
    where a.id = assignment_id and a.student_id = auth.uid() and a.status = 'corretto'
  ));

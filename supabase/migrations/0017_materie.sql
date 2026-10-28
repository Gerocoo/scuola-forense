-- Percorsi per materia: materia del corso (vuota = tutte) e materia scelta dal discente per l'esame.
alter table public.packages add column if not exists subject text check (subject in ('civile', 'penale', 'amministrativo'));
alter table public.profiles add column if not exists exam_subject text check (exam_subject in ('civile', 'penale', 'amministrativo'));

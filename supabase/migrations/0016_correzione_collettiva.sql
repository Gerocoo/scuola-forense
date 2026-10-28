-- Correzione collettiva degli esercizi di corso: traccia svolta, errori frequenti, link alla correzione in classe.
-- Ai discenti si mostra dopo la scadenza (lettura tramite server, con controllo dell'iscrizione).
alter table public.course_exercises add column if not exists solution text not null default '';
alter table public.course_exercises add column if not exists common_errors text not null default '';
alter table public.course_exercises add column if not exists review_url text;
alter table public.course_exercises add column if not exists solution_files jsonb not null default '[]';
alter table public.course_exercises add column if not exists collective_published boolean not null default false;

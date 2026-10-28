-- Griglia di valutazione con i criteri del nuovo esame: punteggio per criterio e totale in trentesimi.
alter table public.assignment_reviews add column if not exists scores jsonb;
alter table public.assignment_reviews add column if not exists total smallint check (total between 0 and 30);

-- Promemoria al docente quando una consegna aspetta la correzione da 5 giorni (impegno: entro 7).
alter table public.assignments add column if not exists correction_reminder_at timestamptz;

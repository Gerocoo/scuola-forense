-- =====================================================================
--  0004: collegamenti a servizi esterni (canale YouTube della scuola)
--  I token sono cifrati dal server e la tabella non ha policy:
--  nessun utente la legge dal browser, solo il server con la service role.
-- =====================================================================
create table if not exists public.integrations (
  provider        text primary key check (provider in ('youtube')),
  account_id      text,              -- id del canale
  account_name    text,              -- nome del canale
  account_image   text,              -- immagine del canale
  extra           jsonb not null default '{}',   -- es. playlist dei caricamenti
  secret          text not null,     -- refresh token cifrato
  connected_by    uuid references public.profiles(id) on delete set null,
  connected_at    timestamptz not null default now()
);

alter table public.integrations enable row level security;
-- nessuna policy: accesso solo dal server

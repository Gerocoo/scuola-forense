-- Pacchetti di esempio: modificare testi e prezzi dal pannello "Pacchetti" o qui.
insert into public.packages
  (slug, title, tagline, description, period_label, starts_on, ends_on, access_until,
   price_cents, promo_price_cents, promo_label, promo_until, features, highlight, sort)
values
(
  'intensivo-marzo-maggio-2027',
  'Intensivo primavera',
  'Dodici settimane di scrittura guidata prima della prova.',
  'Il percorso per chi vuole arrivare alla prova scritta con un metodo collaudato: un atto o un parere a settimana, corretto a mano da un docente, e una lezione in presenza al mese per lavorare sugli errori ricorrenti.',
  'Marzo – maggio 2027',
  '2027-03-01', '2027-05-31', '2027-06-30',
  89000, 69000, 'Prezzo di lancio fino al 31 gennaio', '2027-01-31 23:59:59+01',
  array[
    '3 mini lezioni registrate al mese',
    '1 lezione in presenza al mese',
    '12 tracce tra pareri e atti',
    'Correzione personalizzata di ogni elaborato',
    'Messaggi diretti con i docenti'
  ],
  true, 1
),
(
  'annuale-2026-2027',
  'Percorso annuale',
  'Dalle basi del metodo alla simulazione d''esame.',
  'Il programma completo: parte dal ragionamento giuridico e dalla struttura del parere, passa agli atti giudiziari e chiude con simulazioni a tempo nelle condizioni della prova.',
  'Novembre 2026 – giugno 2027',
  '2026-11-15', '2027-06-15', '2027-07-31',
  149000, null, null, null,
  array[
    'Tutte le lezioni registrate dell''anno',
    '8 lezioni in presenza',
    '30 tracce con correzione personalizzata',
    '3 simulazioni d''esame a tempo',
    'Messaggi diretti con i docenti'
  ],
  false, 2
),
(
  'modulo-atti-giudiziari',
  'Modulo atti giudiziari',
  'Solo atti: civile, penale e amministrativo.',
  'Per chi ha già un metodo sul parere e vuole allenarsi sugli atti. Sei tracce, sei correzioni, due lezioni registrate per materia.',
  'Gennaio – febbraio 2027',
  '2027-01-10', '2027-02-28', '2027-03-31',
  39000, null, null, null,
  array[
    '6 lezioni registrate',
    '6 atti con correzione personalizzata',
    'Messaggi diretti con i docenti'
  ],
  false, 3
)
on conflict (slug) do nothing;

-- Dopo il primo accesso, promuovere gli account dello staff:
-- update public.profiles set role = 'admin'   where email = 'direzione@esempio.it';
-- update public.profiles set role = 'teacher' where email = 'docente@esempio.it';

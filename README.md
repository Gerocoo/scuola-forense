# Scuola di Alta Formazione Forense: piattaforma corsi

Piattaforma per corsi a pagamento di preparazione all'esame di avvocato, con:

- **vetrina pubblica**: chi siamo, metodo, docenti, corsi con prezzi e promozioni, domande frequenti;
- **acquisto online** con Stripe (carta, Apple Pay, Google Pay, codici sconto, fattura con codice fiscale);
- **area discente** protetta da login (Google o email): video lezioni, calendario degli incontri in presenza con prenotazione del posto e "aggiungi al calendario", registrazioni degli incontri, tracce da scaricare, consegna degli elaborati, correzioni annotate, messaggi con i docenti;
- **area docenti**: caricamento dei video direttamente dal pannello (anche file di diversi GB, con ripresa automatica), calendario, elenco dei prenotati, assegnazione di tracce a uno o più discenti, coda degli elaborati da correggere, caricamento del file annotato con giudizio e commento, messaggi;
- **email automatiche**: nuova lezione o incontro pubblicato, promemoria il giorno prima, nuova traccia, consegna, correzione pronta, nuovo messaggio;
- **direzione** (ruolo amministratore): prezzi e promozioni dei corsi, ruoli degli utenti, iscrizioni manuali per bonifico.

Tecnologie: Next.js 15 (App Router), Supabase (database Postgres, autenticazione, archivio file privato), Stripe Checkout, Bunny Stream (video), Tailwind CSS 4. Email con Resend.

---

## Come funziona il flusso delle esercitazioni

1. Il docente assegna una traccia (testo + file) a uno o più discenti. Ognuno riceve un'email.
2. Il discente scarica la traccia, carica il proprio elaborato e preme **Consegna al docente**. Il docente riceve un'email.
3. Il docente scarica l'elaborato, lo annota (es. PDF commentato o Word con revisioni), lo ricarica, scrive commento e giudizio.
4. Alla **pubblicazione** il discente riceve un'email e vede correzione, giudizio e file annotato. Prima della pubblicazione non vede nulla.

Stati: *da svolgere → consegnato → in correzione → corretto*. Il docente può anche chiedere di riconsegnare.

## Sicurezza

- Ogni tabella ha **Row Level Security**: un discente vede solo i propri elaborati, le lezioni dei corsi che ha pagato e le proprie conversazioni.
- I file stanno in un bucket **privato**. I download passano dal server, che verifica i permessi e genera un link valido 60 secondi.
- Le iscrizioni si creano solo dal webhook Stripe (o da un amministratore). Il ruolo non è modificabile dall'utente.
- Il giudizio è in una tabella separata, visibile al discente solo a correzione pubblicata.

---

## Installazione

Serve Node.js 20 o superiore.

```bash
npm install
cp .env.example .env.local   # poi compila le variabili (vedi sotto)
npm run dev                  # http://localhost:3000
```

### 1. Supabase

1. Crea un progetto su [supabase.com](https://supabase.com) (regione EU, es. Francoforte).
2. In **SQL Editor** esegui, in ordine:
   - `supabase/migrations/0001_schema.sql` (tabelle, permessi, archivio file)
   - `supabase/migrations/0002_video_calendario.sql` (video, prenotazioni, promemoria)
   - `supabase/seed.sql` (tre corsi di esempio, modificabili)
3. In **Project Settings › API** copia URL, chiave `anon` e chiave `service_role` in `.env.local`.
4. In **Authentication › URL Configuration**:
   - *Site URL*: l'indirizzo del sito (es. `https://www.tuodominio.it`)
   - *Redirect URLs*: `https://www.tuodominio.it/auth/callback` e `http://localhost:3000/auth/callback`
5. In **Authentication › Emails** traduci in italiano i modelli di conferma e di reimpostazione password. Per la produzione configura un SMTP tuo (es. Resend) in *SMTP Settings*: quello di Supabase ha limiti bassi.

### 2. Accesso con Google

1. In [Google Cloud Console](https://console.cloud.google.com) › *API e servizi › Credenziali* crea un **ID client OAuth** di tipo *Applicazione web*.
2. *URI di reindirizzamento autorizzati*: `https://<id-progetto>.supabase.co/auth/v1/callback`
3. Configura la *schermata di consenso OAuth* con nome e logo della scuola.
4. In Supabase › **Authentication › Providers › Google** attiva il provider e incolla Client ID e Secret.

### 3. Stripe

1. In [dashboard.stripe.com](https://dashboard.stripe.com) › *Sviluppatori › Chiavi API* copia la chiave segreta in `STRIPE_SECRET_KEY`.
2. *Sviluppatori › Webhook › Aggiungi endpoint*: `https://www.tuodominio.it/api/stripe/webhook` con gli eventi
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`.
   Copia il *Signing secret* in `STRIPE_WEBHOOK_SECRET`.
3. *Impostazioni › Fatturazione*: abilita le fatture e inserisci i dati fiscali della scuola.
4. I codici sconto si creano in *Prodotti › Coupon › Codici promozionali*.

In locale, per ricevere il webhook:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
(usa il `whsec_…` che stampa il comando). Carta di prova: `4242 4242 4242 4242`.

### 4. Email di notifica (facoltativo)

Crea un account su [resend.com](https://resend.com), verifica il dominio e imposta `RESEND_API_KEY` ed `EMAIL_FROM`.
Senza chiave la piattaforma funziona, ma non invia email di nuova traccia, consegna, correzione e messaggio.

### 5. Primo amministratore

Registrati sul sito, poi in Supabase › SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'tua@email.it';
```
Da quel momento gestisci gli altri ruoli da **Area docenti › Utenti e ruoli**: chi deve diventare docente si registra e tu gli assegni il ruolo *Docente*.

### 6. Video delle lezioni (Bunny Stream)

I docenti caricano i video dalla pagina della lezione: il file va direttamente dal loro browser a Bunny, che lo prepara per lo streaming in tutte le risoluzioni. Vale sia per le lezioni registrate sia per la registrazione di un incontro in presenza, caricabile dopo l'incontro.

1. Crea un account su [bunny.net](https://bunny.net) › **Stream** › *Add Video Library* (regione Europa).
2. Nella libreria, sezione **API**: copia *Library ID* e *API Key* in `BUNNY_STREAM_LIBRARY_ID` e `BUNNY_STREAM_API_KEY`.
3. Sezione **Security**: attiva *Embed view token authentication*, copia la chiave in `BUNNY_STREAM_TOKEN_KEY`, e in *Allowed domains* inserisci il dominio del sito. Così i link del player scadono dopo 4 ore e non funzionano fuori dal sito.
4. Sezione **Webhook**: URL `https://www.tuodominio.it/api/bunny/webhook?secret=<BUNNY_WEBHOOK_SECRET>`. Serve ad aggiornare lo stato "pronto" anche se il docente chiude la pagina.

Senza chiavi Bunny resta disponibile il link esterno: Vimeo con privacy *Nascosto* o YouTube *non in elenco*.

### 7. Calendario e promemoria

- Ogni incontro in presenza ha data, luogo, eventuale link alla diretta e, se serve, **prenotazione del posto** con numero massimo di partecipanti.
- I discenti vedono il **calendario mensile** con incontri e scadenze delle tracce, e aggiungono gli incontri a Google Calendar, Apple o Outlook.
- Il **promemoria** parte ogni mattina alle 9 (ora legale) o alle 10 per gli incontri del giorno dopo: ai prenotati, oppure a tutti gli iscritti se la prenotazione non è attiva. Su Vercel funziona da solo grazie a `vercel.json`: basta impostare `CRON_SECRET`.

---

## Pubblicazione su Vercel

1. Carica il progetto su GitHub.
2. Su [vercel.com](https://vercel.com) importa il repository.
3. Inserisci le stesse variabili di `.env.local`, con `NEXT_PUBLIC_SITE_URL` impostato al dominio definitivo.
4. Collega il dominio e aggiorna gli URL in Supabase, Google e Stripe.

## Personalizzazione

| Cosa | Dove |
|---|---|
| Nome scuola, contatti, testi di vetrina, docenti, FAQ | `src/content/site.ts` |
| Corsi, prezzi, promozioni | Area docenti › Corsi in vendita (ruolo amministratore) |
| Colori e caratteri | `src/app/globals.css` (sezione `@theme`) e `src/app/layout.tsx` |
| Privacy e termini di vendita | `src/app/(sito)/privacy` e `src/app/(sito)/termini`: **testi provvisori da sostituire** |

## Struttura

```
src/
  app/
    (sito)/            vetrina, scheda corso, privacy, termini
    accedi, registrati, password-dimenticata, reimposta-password
    auth/              ritorno da Google ed email, uscita
    checkout/          avvio pagamento e pagina di conferma
    api/stripe/webhook attivazione iscrizioni
    api/files/         download protetti
    area/              area discente
    docente/           area docenti e direzione
  components/          interfaccia condivisa
  lib/                 Supabase, Stripe, email, formati
supabase/              schema database e dati iniziali
```

## Prima di andare online: controlli

- [ ] `npm run build` senza errori
- [ ] Registrazione con email e conferma, accesso con Google
- [ ] Acquisto con carta di prova: l'iscrizione compare in *I miei corsi*
- [ ] Il docente assegna una traccia, il discente consegna, il docente pubblica la correzione: arrivano le tre email
- [ ] Il docente carica un video: dopo qualche minuto risulta "pronto" e il discente lo vede
- [ ] Incontro con prenotazione: il discente prenota, il docente lo vede nell'elenco, il file .ics si apre nel calendario
- [ ] Un discente senza corso non vede le lezioni; un discente non apre i file di un altro (prova a incollare un link di download)
- [ ] Testi di privacy e termini definitivi, chiavi Stripe in modalità *live*

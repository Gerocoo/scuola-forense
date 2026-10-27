import { SITE } from "@/content/site";

export const metadata = { title: "Informativa privacy" };

const UPDATED = "27 ottobre 2026";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-semibold">Informativa privacy</h1>
      <p className="mt-3 text-[15px] text-mute">Ultimo aggiornamento: {UPDATED}</p>

      <div className="prose-legal mt-8">
        <p>
          Questa informativa descrive come {SITE.name} (&laquo;{SITE.brand}&raquo;, &laquo;noi&raquo;) raccoglie, usa,
          conserva e protegge i dati personali di chi usa il sito e la piattaforma didattica, inclusi i dati ricevuti
          dagli account Google, ai sensi del Regolamento (UE) 2016/679 (GDPR).
        </p>

        <h2>1. Titolare del trattamento</h2>
        <p>
          {SITE.name}, {SITE.address}, {SITE.vat}. Per qualsiasi richiesta sulla privacy scrivi a{" "}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
        </p>

        <h2>2. Quali dati raccogliamo</h2>
        <ul>
          <li><strong>Dati dell&apos;account:</strong> nome e cognome, indirizzo email, password (conservata solo in forma cifrata) o, se accedi con Google, i dati descritti al punto 3.</li>
          <li><strong>Dati di acquisto e fatturazione:</strong> nome, indirizzo, codice fiscale o partita IVA, corso acquistato, importo e data. I dati della carta sono gestiti da Stripe e non arrivano mai sui nostri server.</li>
          <li><strong>Contenuti didattici:</strong> elaborati e documenti che carichi, correzioni e annotazioni dei docenti, messaggi scambiati con i docenti, appunti personali sulle lezioni.</li>
          <li><strong>Dati di utilizzo della piattaforma:</strong> avanzamento nella visione delle video lezioni, prenotazioni agli incontri in presenza, data delle consegne.</li>
          <li><strong>Dati tecnici:</strong> indirizzo IP e registri tecnici necessari al funzionamento e alla sicurezza del servizio.</li>
        </ul>

        <h2>3. Dati ricevuti dagli account Google</h2>
        <p>
          <strong>Accesso con Google (tutti gli utenti).</strong> Se scegli &laquo;Accedi con Google&raquo; riceviamo da
          Google solo nome, indirizzo email e immagine del profilo (permessi <code>openid</code>, <code>email</code>,{" "}
          <code>profile</code>). Li usiamo esclusivamente per creare il tuo account, riconoscerti agli accessi successivi
          e mostrare il tuo nome nella piattaforma.
        </p>
        <p>
          <strong>Collegamento del canale YouTube (solo docenti).</strong> I docenti possono collegare il canale YouTube
          della scuola concedendo il permesso di sola lettura <code>https://www.googleapis.com/auth/youtube.readonly</code>.
          Con questo permesso leggiamo esclusivamente:
        </p>
        <ul>
          <li>nome, identificativo e immagine del canale, per mostrare quale canale è collegato;</li>
          <li>l&apos;elenco dei video caricati sul canale (titolo, miniatura, durata, stato di visibilità), per permettere al docente di scegliere da una galleria il video da associare a una lezione.</li>
        </ul>
        <p>
          Non pubblichiamo, modifichiamo né cancelliamo nulla sul canale e non accediamo ad altri dati dell&apos;account
          Google. Il token di accesso è conservato cifrato (AES-256) sui nostri server, è usato solo dal sito per
          mostrare la galleria dei video, non è mai trasmesso al browser degli utenti e viene eliminato, insieme alla
          revoca presso Google, quando il canale viene scollegato da Impostazioni.
        </p>
        <p>
          <strong>Uso limitato.</strong> L&apos;uso e il trasferimento ad altre applicazioni delle informazioni ricevute
          dalle API di Google rispettano le{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">
            Norme sui dati utente dei servizi API di Google
          </a>
          , inclusi i requisiti di uso limitato. In particolare, i dati ricevuti da Google: sono usati solo per le
          funzioni descritte sopra e visibili all&apos;utente; non sono venduti né trasferiti a terzi, salvo quanto
          necessario a fornire il servizio (vedi punto 6) o richiesto dalla legge; non sono usati per pubblicità,
          profilazione o per addestrare modelli di intelligenza artificiale; non sono letti da persone, salvo con il
          tuo consenso esplicito, per motivi di sicurezza o per obbligo di legge.
        </p>
        <p>
          La piattaforma usa i servizi API di YouTube: guardando i video o collegando un canale si applicano anche i{" "}
          <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener">Termini di servizio di YouTube</a> e
          l&apos;<a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Informativa sulla privacy di Google</a>.
          Puoi revocare in qualsiasi momento l&apos;accesso del sito al tuo account Google da{" "}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">myaccount.google.com/permissions</a>.
        </p>

        <h2>4. Perché usiamo i dati e base giuridica</h2>
        <ul>
          <li>Erogare il corso acquistato, gestire consegne, correzioni, messaggi e lezioni: esecuzione del contratto (art. 6.1.b GDPR).</li>
          <li>Emettere fatture e adempiere agli obblighi fiscali: obbligo di legge (art. 6.1.c).</li>
          <li>Inviare email di servizio (nuova correzione, nuovo messaggio, promemoria degli incontri): esecuzione del contratto.</li>
          <li>Proteggere la piattaforma da abusi e accessi non autorizzati: legittimo interesse (art. 6.1.f).</li>
        </ul>
        <p>Non inviamo pubblicità e non usiamo i dati per profilazione commerciale.</p>

        <h2>5. Per quanto tempo li conserviamo</h2>
        <p>
          I dati dell&apos;account e i contenuti didattici sono conservati per la durata dell&apos;iscrizione e per i 24 mesi
          successivi, poi cancellati, salvo tua richiesta di cancellazione anticipata. I dati di fatturazione sono
          conservati per 10 anni come previsto dalla legge. Il token del canale YouTube è conservato solo finché il
          canale resta collegato.
        </p>

        <h2>6. Con chi condividiamo i dati</h2>
        <p>
          I dati sono accessibili solo a te, ai docenti e alla segreteria della scuola. Per far funzionare il servizio
          ci avvaliamo di fornitori che agiscono come responsabili del trattamento:
        </p>
        <ul>
          <li>Supabase (database, archivio file e autenticazione);</li>
          <li>Vercel (hosting del sito);</li>
          <li>Stripe (pagamenti e fatturazione);</li>
          <li>Google / YouTube (accesso con Google e riproduzione dei video);</li>
          <li>Bunny.net (riproduzione dei video caricati sulla piattaforma), Resend (invio delle email di servizio).</li>
        </ul>
        <p>
          Alcuni fornitori possono trattare dati fuori dall&apos;Unione europea; in tal caso il trasferimento avviene
          sulla base delle clausole contrattuali standard della Commissione europea o di una decisione di adeguatezza.
          Non vendiamo dati personali.
        </p>

        <h2>7. Sicurezza</h2>
        <p>
          Le connessioni sono cifrate (HTTPS). I file sono conservati in un archivio privato accessibile solo agli
          utenti autorizzati tramite link temporanei; l&apos;accesso ai dati è regolato da controlli per singolo utente.
          Le password e i token sono conservati cifrati.
        </p>

        <h2>8. I tuoi diritti</h2>
        <p>
          Puoi chiedere in qualsiasi momento accesso, rettifica, cancellazione, limitazione, portabilità dei tuoi dati
          e opporti al trattamento scrivendo a <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Rispondiamo entro 30
          giorni. Hai inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali
          (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener">garanteprivacy.it</a>).
        </p>

        <h2>9. Cookie</h2>
        <p>
          Il sito usa solo cookie tecnici necessari a mantenere l&apos;accesso all&apos;area riservata e a completare i
          pagamenti. Non usiamo cookie di profilazione né strumenti di analisi di terze parti. I video YouTube sono
          incorporati in modalità a privacy avanzata (youtube-nocookie.com).
        </p>

        <h2>10. Modifiche</h2>
        <p>
          Eventuali modifiche a questa informativa saranno pubblicate su questa pagina con la data di aggiornamento.
          In caso di modifiche rilevanti all&apos;uso dei dati ricevuti da Google ti chiederemo un nuovo consenso.
        </p>
      </div>
    </div>
  );
}

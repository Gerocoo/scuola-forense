import { SITE } from "@/content/site";

export const metadata = { title: "Privacy e cookie" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-semibold">Privacy e cookie</h1>
      <div className="prose-legal mt-8">
        <p>
          Titolare del trattamento è {SITE.name}, {SITE.address}, {SITE.vat}. Contatto: {SITE.email}.
        </p>
        <p>
          Trattiamo i dati necessari a erogare il corso: nome, email, dati di fatturazione, elaborati caricati,
          correzioni e messaggi. I pagamenti sono gestiti da Stripe; non conserviamo i dati della carta.
          I file sono conservati in un archivio privato e sono accessibili solo a te e ai docenti.
        </p>
        <p>
          Il sito usa solo cookie tecnici, necessari per mantenere l&apos;accesso all&apos;area riservata.
        </p>

        <h2>Accesso con Google e dati degli account Google</h2>
        <p>
          Se accedi con Google riceviamo soltanto nome, indirizzo email e immagine del profilo, usati per creare e
          riconoscere il tuo account sulla piattaforma.
        </p>
        <p>
          I docenti possono collegare il canale YouTube della scuola (permesso di sola lettura
          <code> youtube.readonly</code>). In questo caso leggiamo esclusivamente nome e immagine del canale e
          l&apos;elenco dei video caricati (titolo, miniatura, durata, visibilità), per permettere di scegliere un video
          da associare a una lezione. Non pubblichiamo, modifichiamo né cancelliamo nulla sul canale. Il token di
          accesso è conservato cifrato sui nostri server, non viene condiviso con terzi né usato per pubblicità, e
          viene eliminato quando il canale viene scollegato dalle Impostazioni. Il permesso si può revocare in
          qualsiasi momento anche da{" "}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">
            myaccount.google.com/permissions
          </a>
          .
        </p>
        <p>
          L&apos;uso e il trasferimento ad altre applicazioni delle informazioni ricevute dalle API di Google rispettano le{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">
            Norme sui dati utente dei servizi API di Google
          </a>
          , inclusi i requisiti di uso limitato. Questa piattaforma usa i servizi API di YouTube: si applica anche
          l&apos;
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">
            Informativa sulla privacy di Google
          </a>
          .
        </p>
        <p className="text-slate">
          Testo provvisorio: va sostituito con l&apos;informativa completa redatta dal consulente privacy della scuola.
        </p>
      </div>
    </div>
  );
}

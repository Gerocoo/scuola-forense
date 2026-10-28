import { SITE } from "@/content/site";

export const metadata = { title: "Termini di vendita" };

export default function TerminiPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-semibold">Termini di vendita</h1>
      <div className="prose-legal mt-8">
        <p>
          Il contratto è concluso con {SITE.name} al completamento del pagamento. L&apos;accesso all&apos;area riservata
          è personale e non cedibile, e dura fino alla data indicata nella scheda del corso.
        </p>
        <h2>Prezzo e pagamento</h2>
        <p>
          Il prezzo è quello indicato nella scheda del corso al momento dell&apos;acquisto. Il pagamento avviene tramite Stripe; dove
          indicato è possibile pagare in più rate con i servizi disponibili al momento del pagamento.
        </p>
        <h2>Diritto di recesso</h2>
        <p>
          I corsi sono contenuti digitali e servizi di formazione erogati nell&apos;area riservata subito dopo il pagamento. Prima di
          pagare, il discente chiede espressamente di accedere immediatamente ai contenuti e prende atto che, con l&apos;avvio
          dell&apos;erogazione, perde il diritto di recesso, ai sensi dell&apos;art. 59, comma 1, lett. o), del Codice del consumo
          (D.Lgs. 206/2005). La conferma di questa scelta è riportata nell&apos;email di iscrizione.
        </p>
        <p>
          Per qualsiasi problema con il corso puoi scrivere a <a href={`mailto:${SITE.email}`}>{SITE.email}</a>: valutiamo ogni richiesta.
        </p>
        <h2>Fattura</h2>
        <p>
          Per ogni pagamento emettiamo fattura elettronica, recapitata tramite il Sistema di Interscambio e disponibile nel cassetto
          fiscale dell&apos;Agenzia delle Entrate. Chi ha partita IVA può indicare al pagamento il codice destinatario o la PEC.
        </p>
        <h2>Prova gratuita</h2>
        <p>
          La prova gratuita comprende una traccia con correzione personale, è valida 30 giorni e non comporta alcun impegno di acquisto.
        </p>
        <h2>Video delle lezioni</h2>
        <p>
          Alcune video lezioni sono riprodotte tramite YouTube. Guardandole accetti anche i{" "}
          <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener">Termini di servizio di YouTube</a>{" "}
          e l&apos;<a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Informativa sulla privacy di Google</a>.
          I contenuti dei corsi sono riservati agli iscritti: è vietato condividerli, scaricarli o diffonderli.
        </p>
        <p>
          Il trattamento dei dati personali è descritto nell&apos;<a href="/privacy">informativa privacy</a>.
        </p>
        <p className="text-slate">
          Testo provvisorio: va sostituito con le condizioni generali definitive della scuola.
        </p>
      </div>
    </div>
  );
}

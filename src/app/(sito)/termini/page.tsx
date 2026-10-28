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
          indicato è possibile pagare in più rate con i servizi disponibili al momento del pagamento. Al termine si riceve la fattura
          via email.
        </p>
        <h2>Diritto di recesso</h2>
        <p>
          Il consumatore può recedere entro 14 giorni dall&apos;acquisto scrivendo a <a href={`mailto:${SITE.email}`}>{SITE.email}</a>,
          con rimborso dell&apos;importo pagato. Trattandosi di contenuti digitali e servizi di formazione erogati subito nell&apos;area
          riservata, se il discente chiede di iniziare il corso prima della scadenza di questo termine il rimborso è proporzionato a
          quanto già fruito; con l&apos;accesso ai contenuti digitali e il consenso espresso al loro avvio immediato il diritto di recesso
          può venire meno, nei limiti previsti dal Codice del consumo (D.Lgs. 206/2005).
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

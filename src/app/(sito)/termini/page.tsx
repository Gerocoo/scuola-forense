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
        <p>
          Diritto di recesso, modalità di rimborso e condizioni di erogazione dei contenuti digitali vanno indicati qui.
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

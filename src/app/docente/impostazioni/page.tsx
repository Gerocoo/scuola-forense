import { PageHeader } from "@/components/app/AppShell";
import { DisconnectYoutube } from "./DisconnectYoutube";
import { requireStaff } from "@/lib/auth";
import { getLink, youtubeConfigured } from "@/lib/youtube";
import { dateLong } from "@/lib/format";

export const metadata = { title: "Impostazioni" };

type Props = { searchParams: Promise<{ youtube?: string }> };

const ESITI: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "Canale YouTube collegato. Ora nelle lezioni puoi scegliere i video dalla galleria." },
  annullato: { ok: false, text: "Collegamento annullato. Puoi riprovare quando vuoi." },
  errore: { ok: false, text: "Collegamento non riuscito. Riprova; se succede ancora, scollega l'app da myaccount.google.com › Sicurezza e ricollega." },
  "nessun-canale": { ok: false, text: "Questo account Google non ha un canale YouTube. Accedi con l'account del canale della scuola." },
  "non-configurato": { ok: false, text: "Il collegamento a YouTube non è ancora attivo: mancano le chiavi Google nelle impostazioni del sito (vedi guida)." },
};

export default async function ImpostazioniPage({ searchParams }: Props) {
  await requireStaff();
  const { youtube } = await searchParams;
  const esito = youtube ? ESITI[youtube] : null;
  const configured = youtubeConfigured();
  const link = configured ? await getLink() : null;

  return (
    <>
      <PageHeader title="Impostazioni" description="Collegamenti ai servizi usati dalla scuola. Valgono per tutti i docenti." />

      {esito && (
        <p role="status" className={`mb-6 rounded-[14px] px-4 py-3 text-[15px] ${esito.ok ? "bg-codice-soft text-codice" : "bg-ceralacca-soft text-ceralacca"}`}>
          {esito.text}
        </p>
      )}

      <section className="panel max-w-2xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-[#ff0033]">
            <svg viewBox="0 0 24 24" className="size-6 text-white"><path d="M9.5 8.2v7.6L16 12z" fill="currentColor" /></svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[19px] font-semibold">Canale YouTube</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-slate">
              Collega il canale della scuola: nelle lezioni sceglierai i video da una galleria, senza copiare link.
              Il sito legge solo l&apos;elenco dei video, non può pubblicare né modificare nulla.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[14px] bg-paper p-4">
          {link ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {link.channelImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={link.channelImage} alt="" className="size-11 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <span aria-hidden className="size-11 rounded-full bg-line" />
                )}
                <div>
                  <p className="font-semibold">{link.channelName}</p>
                  <p className="text-[14px] text-codice">Collegato dal {dateLong(link.connectedAt)}</p>
                </div>
              </div>
              <DisconnectYoutube />
            </div>
          ) : (
            configured ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-[15px] text-slate">Nessun canale collegato.</p>
                <a href="/api/youtube/connect" className="btn-primary">Collega il canale YouTube</a>
              </div>
            ) : (
              <div className="text-[15px] leading-relaxed">
                <p className="font-medium text-ceralacca">Il collegamento non è ancora attivo sul sito.</p>
                <p className="mt-1 text-slate">
                  Mancano le variabili <code className="rounded bg-surface px-1">GOOGLE_CLIENT_ID</code> e{" "}
                  <code className="rounded bg-surface px-1">GOOGLE_CLIENT_SECRET</code> su Vercel (Settings › Environment Variables).
                  Dopo averle aggiunte serve un <strong>Redeploy</strong>: poi qui comparirà il pulsante per collegare il canale.
                </p>
              </div>
            )
          )}
        </div>

        <details className="mt-6 text-[15px]">
          <summary className="cursor-pointer font-medium text-codice">Come si carica un video per le lezioni</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed text-slate">
            <li>Su YouTube premi <strong className="text-ink">Crea › Carica video</strong> e scegli il file.</li>
            <li>
              Alla voce <strong className="text-ink">Visibilità</strong> scegli <strong className="text-ink">Non in elenco</strong>: il video non
              compare nelle ricerche ma si vede sulla piattaforma. I video &laquo;Privati&raquo; invece non si possono mostrare.
            </li>
            <li>Nella lezione premi <strong className="text-ink">Scegli dal canale YouTube</strong> e clicca il video.</li>
          </ol>
        </details>
      </section>
    </>
  );
}

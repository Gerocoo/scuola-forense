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
        <p className="text-slate">
          Testo provvisorio: va sostituito con l&apos;informativa completa redatta dal consulente privacy della scuola.
        </p>
      </div>
    </div>
  );
}

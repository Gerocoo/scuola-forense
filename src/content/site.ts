/**
 * Testi della vetrina. Il nome della scuola è provvisorio:
 * sostituire qui nome, contatti, team e FAQ senza toccare il resto del codice.
 * Prezzi e pacchetti invece si gestiscono dal database (pannello Pacchetti).
 */
export const SITE = {
  /** Marchio: corto, è quello che compare nel logo */
  brand: "Pronao",
  /** Sottotitolo sotto il marchio */
  tagline: "Scuola di Alta Formazione Forense",
  name: "Pronao, Scuola di Alta Formazione Forense",
  shortName: "Pronao",
  description:
    "Preparazione all'esame di avvocato con lezioni brevi, tracce settimanali e correzione personalizzata di ogni elaborato.",
  email: "segreteria@esempio.it",
  phone: "+39 000 000 0000",
  address: "Via Esempio 1, Palermo",
  vat: "P.IVA 00000000000",
};

export const HERO = {
  title: "Scrivi l'atto. Noi lo correggiamo a margine, riga per riga.",
  body:
    "Un percorso per l'esame di avvocato costruito sulla scrittura: ogni settimana una traccia, ogni elaborato restituito con le note del docente e un giudizio motivato.",
};

export const ABOUT = {
  title: "Chi siamo",
  body: [
    "Siamo avvocati e magistrati che da anni preparano i praticanti alla prova scritta e all'orale. Abbiamo visto che chi supera l'esame non è chi ha letto di più, ma chi ha scritto di più e ha ricevuto correzioni puntuali.",
    "Per questo la scuola lavora su gruppi piccoli e su un rapporto diretto: lo stesso docente segue i tuoi elaborati, conosce i tuoi errori ricorrenti e ti risponde per messaggio.",
  ],
};

export const METHOD = {
  title: "Il metodo",
  intro: "Ogni settimana segue lo stesso ciclo, finché la struttura dell'atto diventa automatica.",
  steps: [
    {
      title: "Guardi la mini lezione",
      body: "Venti minuti registrati su un istituto o su un tipo di atto, da vedere quando vuoi. Una volta al mese ci incontriamo in aula.",
    },
    {
      title: "Svolgi la traccia",
      body: "Scarichi la traccia dalla tua area e la svolgi nei tempi della prova, a mano o al computer.",
    },
    {
      title: "Consegni l'elaborato",
      body: "Carichi il file nella tua area riservata. Arriva direttamente al tuo docente.",
    },
    {
      title: "Ricevi la correzione",
      body: "Il docente annota l'elaborato a margine e scrive un giudizio. Lo scarichi e, se serve, ne parlate per messaggio.",
    },
  ],
};

export const TEAM = [
  {
    name: "Avv. Nome Cognome",
    role: "Direttrice scientifica",
    bio: "Avvocata cassazionista, diritto civile. Commissaria d'esame in più sessioni.",
    subjects: ["Diritto civile", "Atto di citazione", "Pareri"],
  },
  {
    name: "Dott. Nome Cognome",
    role: "Docente di diritto penale",
    bio: "Magistrato. Si occupa della parte penale: pareri, atti di appello e memorie difensive.",
    subjects: ["Diritto penale", "Appello", "Memorie"],
  },
  {
    name: "Avv. Nome Cognome",
    role: "Docente di diritto amministrativo",
    bio: "Avvocato amministrativista. Segue ricorsi al TAR e pareri in materia di pubblico impiego e appalti.",
    subjects: ["Diritto amministrativo", "Ricorso al TAR"],
  },
];

export const FAQ = [
  {
    q: "Come funzionano le lezioni?",
    a: "Ogni mese trovi tre mini lezioni registrate nella tua area, da guardare quando vuoi, e una lezione in presenza. Le date in presenza sono nel calendario dell'area riservata.",
  },
  {
    q: "Chi corregge i miei elaborati?",
    a: "Un docente della scuola, sempre lo stesso per tutto il percorso quando possibile. Ricevi il file annotato e un giudizio scritto.",
  },
  {
    q: "In quanto tempo arriva la correzione?",
    a: "Di norma entro sette giorni dalla consegna. Ricevi un'email appena la correzione è pubblicata.",
  },
  {
    q: "Posso pagare a rate o con bonifico?",
    a: "Il pagamento online accetta carta, Apple Pay e Google Pay. Per bonifico o rate scrivi alla segreteria.",
  },
  {
    q: "Ricevo la fattura?",
    a: "Sì. Durante il pagamento inserisci codice fiscale o partita IVA e la fattura arriva via email.",
  },
];

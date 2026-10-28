-- Tracce delle prove scritte dell'esame di avvocato (sessioni 2017-2019 e 2023-2025).
-- Fatti e richiesta riportati fedelmente; per il testo ufficiale fa fede la pubblicazione ministeriale.
-- Gratuite: le tre tracce della sessione 2023 (prima sessione con la prova scritta unica).

insert into public.past_tracks (year, session, subject, kind, title, body, free)
select * from (values

-- ===================== SESSIONE 2025 (11 dicembre 2025) =====================
(2025::smallint, '11 dicembre 2025', 'civile', 'atto', 'Caduta dalla passerella sull''arenile e responsabilità del Comune',
$t$Un uomo di 78 anni muore dopo essere caduto da una passerella instabile, collocata a ridosso del muro perimetrale di una strada del Comune di Zeta e sovrapposta all'arenile, utilizzata dai frequentatori per raggiungere la spiaggia.

Gli eredi agiscono in giudizio contro il Comune di Zeta chiedendo il risarcimento sia del danno da perdita del rapporto parentale sia del danno subito dal congiunto per le sofferenze patite prima del decesso.

Il Comune sostiene di non aver realizzato la passerella, di averne appreso l'esistenza soltanto dopo il sinistro e che era comunque disponibile un altro accesso alla spiaggia, sicuro e regolarmente segnalato. Contesta inoltre l'esistenza e la quantificazione dei danni richiesti.

Il candidato, assunte le vesti del legale del Comune di Zeta, rediga l'atto giudiziario più idoneo alla difesa del proprio assistito, illustrando gli istituti e le problematiche sottese alla fattispecie.$t$, false),

(2025::smallint, '11 dicembre 2025', 'penale', 'atto', 'Aggressione in casa e reazione con il coltello: eccesso di legittima difesa',
$t$Tizio irrompe, disarmato, nell'abitazione di Caio e lo aggredisce. Caio, pur potendo facilmente neutralizzare l'aggressore, lo colpisce con un coltello, procurandogli lesioni che ne mettono in pericolo la vita.

All'esito del giudizio di primo grado, Caio viene condannato alla pena di cinque anni di reclusione per il reato di lesioni personali volontarie gravi (artt. 582 e 583, comma 1, n. 1, c.p.).

Il candidato, assunte le vesti del difensore di Caio, rediga l'atto giudiziario più idoneo alla tutela del proprio assistito, soffermandosi sugli istituti e sulle problematiche sottese alla fattispecie.$t$, false),

(2025::smallint, '11 dicembre 2025', 'amministrativo', 'atto', 'Accesso del padre agli atti della carriera universitaria della figlia',
$t$Tizio, padre divorziato, presenta all'Università Alfa un'istanza di accesso ai sensi della legge n. 241/1990, chiedendo di prendere visione ed estrarre copia degli atti relativi alla carriera universitaria della figlia Caia, di trent'anni.

L'Università nega l'accesso, rilevando che la figlia, controinteressata, si è opposta all'ostensione e che il regolamento di ateneo subordina l'accesso ai documenti relativi al curriculum studiorum al consenso del controinteressato.

Il candidato, assunte le vesti del legale di Tizio, rediga l'atto giudiziario più idoneo alla tutela delle ragioni del proprio assistito.$t$, false),

-- ===================== SESSIONE 2024 (10 dicembre 2024) =====================
(2024::smallint, '10 dicembre 2024', 'civile', 'atto', 'Infiltrazioni dopo il rifacimento della copertura: appaltatore e direttore dei lavori',
$t$Tizio, proprietario di una villa interessata da infiltrazioni d'acqua, affida a Caio, impresa edile, il rifacimento della copertura. Sempronio è incaricato della direzione dei lavori, con compiti di progettazione e di vigilanza sull'esecuzione. Il contratto pone a carico di Tizio la fornitura dei materiali.

Ultimati i lavori, le infiltrazioni persistono. Dagli accertamenti emerge che la causa va ricercata sia in un difetto del materiale impiegato sia in vizi di progettazione e di esecuzione dell'opera.

Il candidato, assunte le vesti del legale di Tizio, rediga l'atto più adeguato a tutelare in giudizio le ragioni del proprio assistito, al fine di ottenere il ripristino dell'opera e il risarcimento del danno, illustrando gli istituti e le problematiche sottese alla fattispecie.$t$, false),

(2024::smallint, '10 dicembre 2024', 'penale', 'atto', 'Morte del figlio di due anni: omicidio pluriaggravato e appello',
$t$Tizia colpisce il proprio figlio di due anni, che batte la testa contro il lettino. Credendolo ormai morto, Tizia occulta il corpo del bambino in un sacchetto di plastica.

L'autopsia accerta che il decesso è stato causato da asfissia, sopravvenuta dopo che il bambino era stato chiuso nel sacchetto.

La Corte d'Assise di Roma condanna Tizia alla pena dell'ergastolo per il delitto di omicidio pluriaggravato.

Il candidato, assunte le vesti del difensore di Tizia, rediga l'atto di appello, soffermandosi sugli istituti e sulle problematiche sottese alla fattispecie.$t$, false),

(2024::smallint, '10 dicembre 2024', 'amministrativo', 'atto', 'Refezione scolastica: cessione d''azienda della mandante e revoca dell''aggiudicazione',
$t$Il Comune di Zeta indice una procedura di gara per l'affidamento del servizio di refezione scolastica, che viene aggiudicata al raggruppamento temporaneo di imprese (RTI) Omega.

Dopo l'aggiudicazione, la società Alfa, mandante del raggruppamento, cede la propria azienda alla società Iota, che chiede di subentrare nel RTI in luogo della cedente.

Il Comune nega il subentro, revoca l'aggiudicazione disposta in favore del RTI Omega e aggiudica il servizio al RTI Delta, secondo classificato.

Il candidato, assunte le vesti del legale del RTI Omega, rediga l'atto giudiziario ritenuto più opportuno per la tutela delle ragioni del proprio assistito.$t$, false),

-- ===================== SESSIONE 2023 (12 dicembre 2023) — GRATUITE =====================
(2023::smallint, '12 dicembre 2023', 'civile', 'atto', 'Autorimessa allagata, sfratto per morosità e clausola solve et repete',
$t$Tizio conduce in locazione un immobile commerciale nel quale esercita l'attività di autorimessa. Due mesi fa, a causa di un rigurgito della rete fognaria attraverso un pozzetto di scarico a pavimento, il locale è stato allagato. I Vigili del fuoco, intervenuti sul posto, hanno dichiarato l'immobile inagibile fino alla completa riparazione delle condutture, che a oggi non è stata eseguita.

Tizio, non potendo esercitare la propria attività, non ha corrisposto gli ultimi due canoni. Il locatore Caio gli ha quindi notificato intimazione di sfratto per morosità, invocando la clausola contrattuale che esclude la possibilità per il conduttore di sollevare eccezioni prima di aver pagato il canone (art. 1462 c.c.).

Tizio è interessato a tenere in vita il contratto di locazione, a non pagare i canoni per il periodo in cui non ha potuto utilizzare il locale e a essere tenuto indenne dai danni subiti a causa del fermo dell'attività.

Il candidato, assunte le vesti del legale di Tizio, rediga la comparsa di costituzione e risposta, valutando anche la possibilità di proporre domanda riconvenzionale nei confronti del locatore e di chiamare in causa eventuali terzi responsabili.$t$, true),

(2023::smallint, '12 dicembre 2023', 'penale', 'atto', 'Medico che cura il latitante: favoreggiamento personale aggravato e misura cautelare',
$t$Tizio, primario del reparto di ortopedia di un ospedale di Napoli, è raggiunto da un'ordinanza di custodia cautelare emessa dal Giudice per le indagini preliminari presso il Tribunale di Napoli per il delitto di favoreggiamento personale aggravato (art. 378, comma 2, c.p.).

Secondo l'accusa, Tizio avrebbe prestato cure mediche, gratuitamente e in segreto, a un noto capo mafioso latitante, senza annotare la visita nei registri ospedalieri.

Il candidato, assunte le vesti del difensore di Tizio, rediga l'atto giudiziario più idoneo alla tutela del proprio assistito, soffermandosi sugli istituti e sulle problematiche sottese alla fattispecie.$t$, true),

(2023::smallint, '12 dicembre 2023', 'amministrativo', 'atto', 'Interdittiva antimafia fondata su vicende penali concluse con l''assoluzione',
$t$La società Alfa s.r.l., impresa edile che lavora sia per committenti pubblici sia per privati, è partecipata in parti uguali dai fratelli Tizio e Caio.

In data 10 giugno 2023 la Prefettura di Palermo adotta nei confronti della società un'informazione interdittiva antimafia, ai sensi del d.lgs. n. 159/2011 e del d.P.R. n. 252/1998, ritenendo sussistente il pericolo di infiltrazioni mafiose.

Il provvedimento si fonda su una precedente interdittiva del 2016, su procedimenti penali a carico dei due fratelli conclusi con sentenze di assoluzione e su un sequestro preventivo successivamente revocato.

Il candidato, assunte le vesti del legale della società Alfa s.r.l., rediga l'atto giudiziario più idoneo alla tutela delle ragioni della propria assistita.$t$, true),

-- ===================== SESSIONE 2019 (10-12 dicembre 2019) =====================
(2019::smallint, '10 dicembre 2019', 'civile', 'parere', 'Leasing, patto di riacquisto e regresso del fornitore',
$t$L'imprenditore individuale Tizio chiede alla società Gamma di acquistare un macchinario, in vendita presso il negozio gestito da Caio, e di concederglielo in locazione finanziaria. Il contratto prevede a carico dell'utilizzatore Tizio il pagamento complessivo di 60.000 euro, in rate mensili da 1.000 euro ciascuna.

Contestualmente la società Gamma e il fornitore Caio stipulano un patto di riacquisto, in forza del quale, in caso di risoluzione del contratto di leasing per inadempimento dell'utilizzatore e su richiesta di Gamma, Caio si obbliga a riacquistare il bene a un prezzo prestabilito.

Tizio non paga le ultime dieci rate. Caio, pur consapevole di non esservi tenuto e al fine di evitare il riacquisto di un bene usato ormai privo di gran parte del suo valore commerciale, versa alla società concedente la somma di 10.000 euro.

Successivamente Caio cita in giudizio Tizio, dichiarando di agire in regresso ai sensi dell'art. 1950 c.c., e chiede la restituzione della somma di 10.000 euro, oltre agli interessi legali dalla data del pagamento.

Tizio, ricevuta la notifica dell'atto di citazione, si rivolge a un legale.

Il candidato, assunte le vesti del legale di Tizio, rediga un parere motivato, illustrando le questioni sottese al caso in esame e indicando la linea difensiva più utile alla tutela del proprio assistito.$t$, false),

(2019::smallint, '10 dicembre 2019', 'civile', 'parere', 'Preventivo modificato a penna, accettazione via email e recesso del committente',
$t$Caio, imprenditore edile, venuto a sapere che l'amico Sempronio intende ristrutturare il proprio appartamento, si offre di eseguire personalmente i lavori e predispone un preventivo per un corrispettivo di 45.000 euro.

Sempronio, ricevuto il preventivo brevi manu, vi apporta a penna alcune modifiche: riduce il corrispettivo a 35.000 euro e indica come termine di inizio dei lavori il 15 novembre 2019 e come termine di ultimazione il 31 gennaio 2020. Quindi riconsegna il documento a Caio.

Il 10 ottobre 2019 Caio, con email regolarmente ricevuta da Sempronio, dichiara di accettare le nuove condizioni e di essere disponibile a iniziare i lavori dal 18 ottobre.

Il 15 ottobre 2019 Sempronio comunica a Caio, via email, di voler annullare la propria commissione e lo invita a non iniziare le opere.

Successivamente Sempronio riceve una lettera con la quale Caio lamenta l'inadempimento e chiede il pagamento di 35.000 euro a titolo di risarcimento del danno per la mancata esecuzione del contratto. Sempronio si rivolge quindi a un legale.

Il candidato, assunte le vesti del legale di Sempronio, rediga un parere motivato, illustrando le questioni sottese al caso in esame e indicando la linea difensiva più utile alla tutela del proprio assistito.$t$, false),

(2019::smallint, '11 dicembre 2019', 'penale', 'parere', 'Sorveglianza del collega infedele, colluttazione e sparo: legittima difesa putativa',
$t$Tizio, dipendente di una società multinazionale, riceve dal proprio superiore Mevio l'incarico di sorvegliare il collega Caio, al fine di impedire che questi divulghi segreti aziendali a imprese concorrenti.

Durante una convention, Tizio segue Caio e lo vede appartarsi con due persone, alle quali consegna una pen drive ricevendo in cambio una busta che sembra contenere denaro. Convinto che si tratti di materiale aziendale ceduto a personale di una società concorrente, e ritenendosi autorizzato dall'ordine ricevuto dal superiore, Tizio interviene aggredendo il gruppo e pretendendo la consegna della pen drive.

Ne nasce una colluttazione nel corso della quale Tizio, convinto di vedere un'arma puntata contro di sé, estrae la pistola che detiene legalmente ed esplode un colpo che raggiunge Caio, uccidendolo. Subito dopo Tizio si allontana, portando con sé la pen drive caduta a terra durante la colluttazione.

Il candidato, assunte le vesti del legale di Tizio, individui le ipotesi di reato configurabili a suo carico e rediga un parere motivato, prospettando la linea difensiva più utile.$t$, false),

(2019::smallint, '11 dicembre 2019', 'penale', 'parere', 'Chat con la tredicenne, scambio di immagini intime e foto dell''amico',
$t$Caio, diciannovenne, conosce su Facebook Mevia, di tredici anni, con la quale instaura una fitta corrispondenza in chat, senza mai incontrarla di persona.

Caio chiede a Mevia di inviargli fotografie che la ritraggano nelle proprie parti intime. Mevia gliele invia e, a sua volta, chiede a Caio una fotografia che lo ritragga nudo. Caio le invia una foto, scattata durante una festa, che lo ritrae insieme all'amico coetaneo Sempronio, entrambi ubriachi e in slip. Sempronio aveva espressamente vietato a Caio di diffondere quella fotografia.

La madre di Mevia scopre casualmente, sul computer della figlia, la corrispondenza e le fotografie scambiate e sporge denuncia nei confronti di Caio. Sempronio, appreso dalla stampa locale che Caio aveva inviato la foto, denuncia a sua volta l'amico.

Il candidato, assunte le vesti del legale di Caio, individui le ipotesi di reato configurabili a suo carico e rediga un parere motivato, prospettando la linea difensiva più utile.$t$, false),

(2019::smallint, '12 dicembre 2019', 'civile', 'atto', 'Simulazione relativa soggettiva della compravendita e diritti dell''erede',
$t$Con atto di citazione notificato il 15 giugno 2018, Tizio, unico figlio del defunto Sempronio, conviene in giudizio Caio.

Espone che, con contratto del 10 aprile 2012, Mevio aveva venduto a Caio un appartamento sito in Roma, per un prezzo regolarmente pagato; sostiene tuttavia che la vendita era relativamente simulata sotto il profilo soggettivo, poiché il vero acquirente era il padre Sempronio, all'epoca in vita. Chiede quindi che sia accertata la simulazione e che l'immobile sia dichiarato parte del patrimonio ereditario, per far valere i propri diritti di erede legittimo.

A sostegno della domanda indica: una procura a vendere rilasciata da Caio a Sempronio; l'intestazione a Sempronio delle utenze idriche ed elettriche; l'esecuzione di lavori di ristrutturazione pagati con denaro del de cuius; la mancata residenza dell'apparente acquirente nell'immobile.

Caio si costituisce tempestivamente, limitandosi a negare la simulazione senza sollevare eccezioni specifiche. Alla prima udienza il giudice rinvia per la precisazione delle conclusioni all'udienza del 20 ottobre 2019, assegnando i termini di cui all'art. 190 c.p.c., e invita le parti a esprimersi negli scritti difensivi sulla necessità di integrare il contraddittorio nei confronti di Mevio, questione rilevata d'ufficio.

Il candidato, assunte le vesti del legale di Caio, rediga l'atto giudiziario più idoneo alla difesa del proprio assistito.$t$, false),

(2019::smallint, '12 dicembre 2019', 'penale', 'atto', 'Motociclo rubato e falsa denuncia di furto dell''assegno: ricettazione e calunnia',
$t$Tizio, già condannato tre volte per reati puniti con la sola pena della multa, acquista da Caio, tramite un annuncio pubblicato su una rivista, un motociclo usato. I due si incontrano in Piazza Angelica: Caio consegna il motociclo e i relativi documenti e Tizio gli consegna un assegno di 2.000 euro.

Subito dopo Tizio si reca presso il vicino Commissariato di Polizia e denuncia il furto dell'assegno appena consegnato. All'uscita viene fermato dagli agenti, insospettiti dall'abrasione del numero di telaio del motociclo. Il controllo eseguito al terminale rivela che il motociclo è provento di furto e che i documenti sono falsi. Le successive indagini accertano la falsità della denuncia di furto dell'assegno.

All'esito del giudizio di primo grado Tizio viene condannato alla pena di due anni di reclusione per il delitto di calunnia, in relazione alla denuncia del furto dell'assegno, e alla pena di due anni di reclusione e 1.000 euro di multa per il delitto di ricettazione del motociclo.

Il candidato, assunte le vesti del legale di Tizio, rediga l'atto giudiziario più idoneo alla difesa del proprio assistito.$t$, false),

(2019::smallint, '12 dicembre 2019', 'amministrativo', 'atto', 'Gara per i rifiuti sanitari: oneri di sicurezza aziendali omessi e soccorso istruttorio',
$t$Nel 2019 l'impresa Alfa partecipa a una procedura di gara di rilevanza comunitaria, indetta da un'Azienda Unità Sanitaria Locale per l'affidamento del servizio triennale di raccolta e smaltimento dei rifiuti sanitari pericolosi, da aggiudicare con il criterio dell'offerta economicamente più vantaggiosa.

Alfa si classifica seconda. Risulta aggiudicataria l'impresa Beta, unica altra concorrente, che ha presentato un'offerta economica molto inferiore e che non è stata sottoposta alla verifica di anomalia ai sensi dell'art. 97, comma 3, del d.lgs. n. 50/2016.

Decorso il termine di trentacinque giorni di cui all'art. 32, comma 9, del d.lgs. n. 50/2016 e prima della stipula del contratto, Alfa, a seguito di accesso agli atti, scopre che:
— Beta, pur dichiarando che il prezzo offerto comprende tutti i propri costi, non ha indicato l'importo degli oneri di sicurezza aziendali; il bando non richiedeva espressamente tale indicazione, limitandosi a un generico rinvio al codice dei contratti pubblici;
— prima dell'aggiudicazione, l'Azienda sanitaria ha acquisito da Beta, mediante soccorso istruttorio, un documento integrativo contenente l'indicazione di tale voce.

Il candidato, assunte le vesti del legale dell'impresa Alfa, rediga l'atto giudiziario più idoneo a tutelare ogni ragione della propria assistita.$t$, false),

-- ===================== SESSIONE 2018 (11-13 dicembre 2018) =====================
(2018::smallint, '11 dicembre 2018', 'civile', 'parere', 'Villa Adelaide: vendita dell''immobile già usucapito dal possessore',
$t$Tizio, residente ad Alfa, è proprietario di "Villa Adelaide", sita nel Comune di Beta. Dal gennaio 1980, da quando Tizio ha smesso di frequentarla durante le vacanze, la villa è occupata stabilmente da Caio.

Il 6 ottobre 2009 Tizio vende l'immobile, al prezzo di 120.000 euro, all'amico Sempronio, che lo conosceva per averlo frequentato fino al 1979. Il 20 ottobre 2009 Sempronio trascrive l'atto di acquisto e, recatosi a Beta per prendere possesso dell'immobile, vi trova Caio, che gli nega l'accesso.

Caio, con atto di citazione notificato a Tizio il 10 marzo 2009, aveva intanto convenuto in giudizio quest'ultimo, rimasto contumace. Con sentenza del 4 luglio 2011, passata in giudicato, il Tribunale di Beta dichiara Caio proprietario dell'immobile per usucapione, maturata per effetto del possesso ventennale al 20 gennaio 2000.

Tizio, temendo le pretese di Sempronio in relazione alla compravendita, si rivolge a un legale.

Il candidato, assunte le vesti del legale di Tizio, rediga un parere motivato, esaminando tutte le questioni sottese al caso in esame.$t$, false),

(2018::smallint, '11 dicembre 2018', 'civile', 'parere', 'Debito di gioco al poker, promessa di pagamento estorta e bari',
$t$Tizio partecipa a una partita di poker con quattro sconosciuti, nel corso della quale tutti i giocatori bevono molto whisky. All'ultima mano Tizio perde 1.000 euro in favore di Caio.

Non disponendo della somma, Tizio ottiene ventiquattro ore di tempo, ma non riesce a procurarsi il denaro. Sotto la pressione di Caio e dei suoi amici sottoscrive allora una dichiarazione con la quale promette di pagare entro quarantotto ore. Tizio paga.

Successivamente Tizio riferisce al proprio legale di aver scoperto che gli altri giocatori avevano barato e che la promessa di pagamento gli era stata estorta con minacce alla sua integrità fisica.

Il candidato, assunte le vesti del legale di Tizio, rediga un parere motivato, esaminando le questioni sottese al caso in esame e indicando le possibili forme di tutela offerte dall'ordinamento.$t$, false),

(2018::smallint, '12 dicembre 2018', 'penale', 'parere', 'Maternità surrogata all''estero e trascrizione dell''atto di nascita in Italia',
$t$Tizio e Caia, coniugi da circa dieci anni e residenti in Italia, si recano all'estero per ricorrere alla fecondazione eterologa e alla surrogazione di maternità, pratiche consentite dalla legge del luogo.

Viene formato in vitro un embrione con metà del patrimonio genetico del padre e metà proveniente da una donatrice. L'embrione viene impiantato nell'utero di una donna maggiorenne e volontaria, che porta a termine la gravidanza. Secondo la legge straniera Tizio e Caia diventano genitori del neonato Sempronio.

Per ottenere la trascrizione in Italia dell'atto di nascita, i coniugi presentano all'ambasciata la documentazione necessaria, dichiarando che Caia è la madre di Sempronio. L'ufficiale di stato civile del Comune di residenza registra l'atto, attribuendo al neonato lo stato di figlio di Tizio e Caia.

I coniugi ricevono successivamente una convocazione dalla locale Procura della Repubblica e si rivolgono al proprio legale, preoccupati delle possibili conseguenze penali.

Il candidato, assunte le vesti del legale di Tizio e Caia, premessi brevi cenni sulla punibilità in Italia del reato commesso all'estero, rediga un parere motivato sulle questioni sottese al caso in esame.$t$, false),

(2018::smallint, '12 dicembre 2018', 'penale', 'parere', 'La gemella che sostiene il concorso diplomatico al posto della sorella',
$t$Caia, laureata in giurisprudenza e funzionario amministrativo presso un Comune, aspira alla carriera diplomatica, ma non ha un'adeguata conoscenza della lingua inglese. Convince quindi la sorella gemella Tizia, insegnante di inglese, a sostituirla nella prova di lingua del concorso, promettendole in dono i preziosi orecchini di diamanti ricevuti in eredità dalla nonna.

Tizia si presenta alla prova, consegna l'elaborato, esibisce il documento d'identità di Caia e sottoscrive la richiesta di attestato di presenza, necessario per giustificare l'assenza di Caia dal lavoro.

Nelle stesse ore Caia, alla guida della propria auto, resta coinvolta in un sinistro stradale: i vigili urbani intervenuti redigono il verbale e le elevano una sanzione amministrativa.

Caia supera il concorso. Tizia, temendo di essere scoperta anche in ragione di quanto risulta dal verbale dei vigili, si rivolge a un legale.

Il candidato, assunte le vesti del legale di Tizia, rediga un parere motivato, illustrando le possibili conseguenze penali della condotta della propria assistita.$t$, false),

(2018::smallint, '13 dicembre 2018', 'civile', 'atto', 'Macchina tipografica non ritirata dal compratore e danno da occupazione del locale',
$t$Nel gennaio 2018 la società Alfa vende a Tizio una macchina tipografica esposta nel proprio negozio. Nonostante i ripetuti solleciti verbali, Tizio non provvede per diversi mesi al ritiro del bene.

La società Alfa cita quindi in giudizio Tizio per l'inadempimento dell'obbligo di ritirare la macchina, lamentando anche un danno alla propria attività commerciale, poiché il macchinario occupa gran parte del locale di vendita e impedisce l'esposizione di altri prodotti. Chiede la condanna di Tizio al pagamento di 6.000 euro, pari a una parte dei canoni di locazione del locale corrisposti dal gennaio 2018 alla data della citazione, riservandosi di chiedere in separato giudizio i danni maturati successivamente.

Il candidato, assunte le vesti del legale di Tizio, rediga l'atto giudiziario più idoneo alla difesa del proprio assistito.$t$, false),

(2018::smallint, '13 dicembre 2018', 'penale', 'atto', 'Il cane ucciso ai giardini pubblici: uccisione di animali e stato di necessità',
$t$Il 9 febbraio 2016, nei giardini pubblici del Comune di Alfa, Tizio passeggia con il proprio cane di piccola taglia, tenuto al guinzaglio. Un cane di grossa taglia, libero dal guinzaglio e dal comportamento aggressivo, si lancia contro il cane di Tizio cercando di morderlo. Tizio colpisce violentemente il cane aggressore con un grosso bastone trovato nei pressi, uccidendolo.

Caio, proprietario del cane ucciso, sporge denuncia. All'esito del giudizio di primo grado Tizio viene ritenuto responsabile del reato di cui all'art. 544-bis c.p. e condannato alla pena di quattro mesi di reclusione, senza il riconoscimento di alcuna circostanza attenuante in ragione dei suoi precedenti penali per reati contro il patrimonio. Secondo il giudice Tizio ha ucciso il cane "senza necessità", avendo agito solo per difendere il proprio animale.

Il candidato, assunte le vesti del legale di Tizio, rediga l'atto giudiziario più idoneo alla difesa del proprio assistito.$t$, false),

(2018::smallint, '13 dicembre 2018', 'amministrativo', 'atto', 'Valutazione comparativa per professore ordinario e mancata esecuzione del giudicato',
$t$Con decreto rettorale n. 29 del 15 maggio 2017 l'Università Alfa indice una procedura di valutazione comparativa per un posto di professore ordinario presso la Facoltà di Giurisprudenza, indicando quali criteri i titoli, le pubblicazioni scientifiche e le altre risultanze curriculari.

Partecipano Tizio e Caio. La commissione dichiara idoneo Caio, ritenendo decisivo che questi sia autore di tre monografie, a fronte di una sola di Tizio.

Tizio propone ricorso al TAR, che con sentenza n. 2323 del 15 gennaio 2018, passata in giudicato, annulla gli atti della procedura, rilevando che la commissione non aveva valutato i titoli e le altre risultanze curriculari, pur indicati tra i criteri.

Il 5 giugno 2018 la commissione, rinnovata la valutazione, conferma l'idoneità di Caio, affermando nel giudizio integrativo che le pubblicazioni di Caio rendono ininfluenti le risultanze curriculari e che i titoli dei due candidati hanno identico valore. Con decreto del 3 settembre 2018 il Rettore dichiara idoneo Caio.

Il 17 settembre 2018 Tizio si rivolge a un legale lamentando che la commissione, ancora una volta, non ha valutato le altre risultanze curriculari, come imposto dalla sentenza del TAR, e che il giudizio sui titoli è palesemente erroneo, dato che egli ne possiede il doppio rispetto a Caio.

Il candidato, assunte le vesti del legale di Tizio, rediga l'atto giudiziario più idoneo a tutelare le ragioni del proprio assistito.$t$, false),

-- ===================== SESSIONE 2017 (12-14 dicembre 2017) =====================
(2017::smallint, '12 dicembre 2017', 'civile', 'parere', 'Nuda proprietà in cambio di assistenza: vitalizio, inadempimento e diagnosi taciuta',
$t$Il 9 febbraio 2015 Caia, di 86 anni, e la nipote Mevia, di 43 anni, stipulano con l'assistenza del notaio Sempronio un contratto con il quale Caia trasferisce a Mevia la nuda proprietà di un appartamento situato nel centro della città, di cinque vani più servizi, di 150 mq e del valore di circa 500.000 euro, riservandosi l'usufrutto. In cambio Mevia si obbliga ad assistere quotidianamente la zia, sola e malata: fare la spesa, provvedere alle pulizie, somministrarle i farmaci e accompagnarla in ogni spostamento necessario.

Circa un anno dopo Caia si rivolge a un legale, lamentando che da circa sei mesi Mevia ha di fatto smesso di assisterla. Riferisce inoltre che, prima della stipula, le era stata diagnosticata una patologia oncologica non curabile, con un'aspettativa di vita non superiore a due anni, e che proprio Mevia, venuta a conoscenza della diagnosi, l'aveva convinta a concludere il contratto.

Il candidato, assunte le vesti del legale di Caia, rediga un parere motivato, illustrando le questioni sottese al caso in esame e individuando le possibili azioni a tutela delle ragioni della propria assistita.$t$, false),

(2017::smallint, '12 dicembre 2017', 'civile', 'parere', 'Il nascituro e il danno da perdita del padre morto prima della nascita',
$t$Il 9 febbraio 2016 Tizio, marito di Caia, al settimo mese di gravidanza, viene investito e ucciso sulle strisce pedonali dall'auto condotta da Sempronio. Il 15 aprile 2016 nasce Caietta, figlia di Caia e di Tizio.

Caia si rivolge al proprio legale sostenendo che Caietta, a causa del fatto illecito di Sempronio, è nata senza padre, subendo un danno permanente e rilevante che la segnerà per tutta la vita. Caia ha già avanzato richiesta di risarcimento alla compagnia assicuratrice dell'auto di Sempronio, che sta gestendo la pratica in suo favore; la compagnia, però, sostiene che non sussista alcun danno risarcibile in favore di Caietta, poiché al momento della morte del padre la bambina non era ancora nata.

Il candidato, assunte le vesti del legale di Caia, premessi brevi cenni sullo stato giuridico del concepito, rediga un parere motivato, esaminando le questioni sottese al caso in esame.$t$, false),

(2017::smallint, '13 dicembre 2017', 'penale', 'parere', 'Amministratrice di sostegno e anziano abbandonato: art. 591 c.p.',
$t$Il 9 febbraio 2016 il Giudice tutelare di Alfa nomina Caia amministratrice di sostegno di Tizio, affetto da demenza senile di tipo Alzheimer, affidandole la gestione del trattamento pensionistico del beneficiario e il compito di impugnare, in nome di quest'ultimo, un contratto da lui concluso nel 2015 per effetto di artifici e raggiri posti in essere da terzi.

Il 7 maggio 2017, su segnalazione di alcuni vicini, i Vigili del fuoco entrano d'urgenza nell'appartamento di Tizio, trovandolo in pessime condizioni igieniche, privo di cibo e bevande e invaso dai rifiuti. Tizio viene ricoverato in ospedale. Il Giudice tutelare revoca la nomina di Caia e trasmette gli atti alla Procura della Repubblica, ipotizzando il reato di cui all'art. 591 c.p.

Caia, preoccupata, si rivolge a un legale.

Il candidato, assunte le vesti del legale di Caia, premessi brevi cenni sul reato di abbandono di persone incapaci, rediga un parere motivato sulla questione.$t$, false),

(2017::smallint, '13 dicembre 2017', 'penale', 'parere', 'Il finto amico del figlio: truffa all''anziano e furto, procedibilità e misure cautelari',
$t$Tizio osserva a lungo le abitudini del pensionato Mevio, di 75 anni. Un giorno lo avvicina mentre rientra a casa, fingendosi un vecchio amico del figlio Caio; conquistata la sua fiducia, ottiene di entrare nell'appartamento.

In casa Tizio racconta di vantare un credito di 500 euro nei confronti di Caio, di trovarsi in momentanea difficoltà economica e di essere intenzionato ad agire in giudizio contro di lui; convince così Mevio a consegnargli 500 euro. Approfittando poi di un momento di distrazione dell'anziano, fruga in un cassetto del soggiorno, si impossessa di altri 300 euro e si allontana.

Uscendo, Tizio nota le telecamere di sicurezza installate nel palazzo e, temendo di essere identificato, poiché pluripregiudicato per reati specifici, si rivolge al proprio legale.

Il candidato, assunte le vesti del legale di Tizio, rediga un parere motivato, individuando i reati configurabili e la relativa disciplina, il regime di procedibilità e la possibilità di applicazione di misure cautelari.$t$, false),

(2017::smallint, '14 dicembre 2017', 'civile', 'atto', 'Brochure per l''associazione non riconosciuta: azione contro chi ha agito in suo nome',
$t$Beta è un'associazione non riconosciuta che si occupa della diffusione della cultura letteraria. Nel settembre 2015 l'associato Tizio, agendo in nome dell'associazione, stipula con la società Epsilon un contratto per la fornitura di brochure pubblicitarie di una rappresentazione teatrale prevista per il dicembre 2015, da consegnare entro la fine di ottobre 2015 presso un luogo indicato come abitazione nel Comune di Alfa.

Epsilon esegue la prestazione nei termini pattuiti e nel settembre 2016 emette nei confronti di Beta fattura per 8.000 euro, che resta insoluta. Non risulta alcuna richiesta stragiudiziale di pagamento.

Nel luglio 2017 Epsilon notifica a Tizio atto di citazione per l'udienza del 25 gennaio 2018, chiedendone la condanna al pagamento della somma fatturata.

Il candidato, assunte le vesti del legale di Tizio, rediga l'atto giudiziario più idoneo alla difesa del proprio assistito, sollevando le eccezioni di rito e di merito.$t$, false),

(2017::smallint, '14 dicembre 2017', 'penale', 'atto', 'Lite all''uscita della discoteca e colpi con il tubo di ferro: tentato omicidio e recidiva',
$t$Tizio, già condannato con sentenze irrevocabili per una rapina aggravata commessa nel 2009 e per un furto commesso nel 2015, all'uscita da una discoteca urta involontariamente Caio, che reagisce colpendolo al volto. Ne nasce una violenta colluttazione nel corso della quale Tizio afferra un tubo di ferro trovato casualmente a terra e colpisce Caio più volte alla testa. Caio cade a terra privo di sensi, perdendo molto sangue; Tizio si allontana e va a sedersi poco distante.

Tizio riporta plurime ecchimosi. Caio riporta ecchimosi, una ferita lacero-contusa alla regione temporale sinistra, la frattura dell'avambraccio destro e del setto nasale, con prognosi riservata.

All'esito del giudizio di primo grado Tizio viene condannato per tentato omicidio, con la recidiva specifica infraquinquennale, alla pena di quindici anni di reclusione, determinata in nove anni di pena base aumentata di sei anni per la recidiva.

Il candidato, assunte le vesti del legale di Tizio, rediga l'atto di appello avverso la sentenza di condanna.$t$, false),

(2017::smallint, '14 dicembre 2017', 'amministrativo', 'atto', 'Permesso di costruire annullato su ricorso del vicino: risarcimento chiesto al Comune',
$t$Il 9 giugno 2015 il Comune di Alfa rilascia a Tizio, sulla base delle dichiarazioni e della documentazione da lui presentate, un permesso di costruire per la realizzazione di una piscina a sfioro interrata nel giardino della propria abitazione. Tizio acquista i materiali, sostenendo una spesa di 27.000 euro.

Il 25 giugno 2016 il TAR di Beta, su ricorso di Caio, proprietario dell'immobile confinante, all'esito di un'istruttoria approfondita e sulla base di una consulenza tecnica d'ufficio, annulla il permesso di costruire per illegittimità. La sentenza passa in giudicato.

Tizio propone quindi ricorso dinanzi allo stesso TAR, chiedendo la condanna del Comune di Alfa al risarcimento dei danni derivanti dall'annullamento del titolo edilizio. La Giunta comunale delibera di resistere in giudizio e conferisce l'incarico a un avvocato del libero foro.

Il candidato, assunte le vesti del legale del Comune di Alfa, rediga la memoria di costituzione in giudizio, sostenendo le ragioni dell'ente sia in punto di giurisdizione sia nel merito.$t$, false)

) as v(year, session, subject, kind, title, body, free)
where not exists (select 1 from public.past_tracks p where p.year = v.year and p.title = v.title);

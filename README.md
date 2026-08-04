# FunghiAlpini

PWA mobile-first per il primo riconoscimento dei funghi durante escursioni in
montagna, pensata per funzionare **completamente offline** dopo il primo
caricamento (in montagna spesso manca il segnale).

⚠️ **È uno strumento di supporto al riconoscimento, non un sostituto di un
esperto.** Per il consumo, fai sempre verificare i funghi da un esperto o
dall'Ispettorato Micologico della tua ASL (servizio gratuito in tutta
Italia).

## Stack

- HTML/CSS/JS vanilla, nessuna dipendenza a runtime.
- Service Worker + Cache API per l'offline.
- Web App Manifest installabile (icona in home, modalità standalone).
- IndexedDB per foto e appunti del diario personale.

## Avvio in locale

Serve un server HTTP qualsiasi (i Service Worker non funzionano da
`file://`):

```bash
cd FUNGHETTO
python3 -m http.server 8080
# poi apri http://localhost:8080 nel browser del telefono o del computer
```

Al primo caricamento (online) l'app precarica in cache tutto l'occorrente
per funzionare offline: da quel momento puoi disattivare il Wi-Fi/dati e
l'app continua a funzionare (catalogo, schede, sosia, riconoscimento
guidato). Solo l'Assistente AI richiede connessione.

## Installare la PWA sullo smartphone

- **Android (Chrome)**: apri il sito, menu ⋮ → "Aggiungi a schermata Home" /
  "Installa app".
- **iPhone (Safari)**: apri il sito, tocca l'icona Condividi → "Aggiungi a
  Home".

Da quel momento l'app si apre a schermo intero, senza barra del browser
(modalità `standalone`), con l'icona 🍄 in home.

## Struttura del progetto

```
index.html          shell dell'app (single page, navigazione via hash)
manifest.json        manifest PWA
sw.js                 service worker (cache offline)
css/style.css         stile mobile-first, tema natura, alto contrasto
js/
  db.js               wrapper IndexedDB (diario + impostazioni)
  data.js              caricamento/interrogazione data/funghi.json
  guided.js            stato e logica del riconoscimento guidato
  camera.js             cattura foto e gestione diario
  ai.js                 modulo opzionale assistente AI (solo online)
  views.js               rendering delle schermate
  router.js              micro-router basato su hash
  app.js                  bootstrap app (SW, indicatore online/offline)
data/funghi.json      database delle specie (vedi sotto)
assets/img/            immagini delle specie (3 per specie)
assets/icons/           icone PWA
scripts/                script Python di utilità (generazione immagini/icone)
```

## Come aggiungere una nuova specie

1. Apri `data/funghi.json`: è un array di oggetti, uno per specie. Copia un
   oggetto esistente come modello e modifica i campi:

   | Campo | Descrizione |
   |---|---|
   | `id` | slug univoco, minuscolo con trattini (es. `boletus-edulis`) |
   | `nome_scientifico` | nome scientifico completo |
   | `nomi_comuni` | array di nomi italiani/dialettali |
   | `commestibilita` | uno tra `commestibile`, `commestibile_con_cautela`, `da_non_consumare`, `tossico`, `mortale`, `non_determinato` |
   | `habitat` / `habitat_tipo` | testo libero + array tra `conifere`, `latifoglie`, `misto`, `prateria` (usato dal riconoscimento guidato) |
   | `stagione` / `stagione_tipo` | testo libero + array tra `primavera`, `estate`, `autunno`, `inverno` |
   | `colore_cappello` | array di colori in italiano, usato come filtro guidato |
   | `imenoforo_tipo` | uno tra `lamelle`, `pori`, `aghi`, `pieghe` |
   | `anello` / `volva` / `viraggio` | booleani, usati come filtro guidato |
   | `descrizione` | testo descrittivo libero |
   | `caratteri_riconoscimento` | array di `{ "tratto": "...", "valore": "..." }` mostrati nella scheda |
   | `immagini` | array di **3** path: `[cappello, imenoforo, gambo]` dentro `assets/img/` |
   | `sosia` | array di `{ "nome": "...", "come_distinguerli": "..." }`: differenze CONCRETE e verificabili sul campo |

2. Aggiungi le 3 foto in `assets/img/` con i nomi indicati in `immagini`
   (consigliato: `<id>-cappello.jpg`, `<id>-imenoforo.jpg`, `<id>-gambo.jpg`).
   Le immagini attualmente presenti sono **illustrazioni segnaposto generate
   automaticamente** (vedi sotto): sostituiscile con foto reali scattate sul
   campo appena possibile, mantenendo lo stesso nome file.

3. Apri `sw.js` e incrementa `CACHE_VERSION` (es. `v1` → `v2`): questo forza
   il service worker a rigenerare la cache con la nuova specie/foto al
   prossimo avvio online dell'app.

4. Non serve altro: catalogo, ricerca, riconoscimento guidato e sosia
   leggono tutti direttamente da `data/funghi.json`.

### Rigenerare le immagini segnaposto

Se aggiungi specie senza avere ancora foto reali, puoi rigenerare le
illustrazioni segnaposto per tutte le specie del dataset con:

```bash
python3 scripts/generate_placeholders.py
```

Lo script legge `data/funghi.json`, deduce colore e forma dai campi
`colore_cappello`/`imenoforo_tipo`/`anello`/`volva` e scrive i 3 SVG per
ogni specie in `assets/img/`. Sostituisci pure i file generati con foto
reali in qualsiasi momento: basta mantenere lo stesso path indicato in
`immagini`.

## Come attivare l'Assistente AI (opzionale)

L'Assistente AI è disattivo di default: nessuna chiave è pre-configurata.
Per attivarlo:

1. Registrati presso un servizio di riconoscimento immagini per funghi
   (es. [Kindwise mushroom.id](https://mushroom.id)) e ottieni un endpoint
   API e una API key personale.
2. Apri l'app → tab **Assistente** → inserisci endpoint e API key nella
   sezione "Configurazione servizio" → **Salva configurazione**.
3. Da quel momento, quando sei online, puoi scattare/caricare una foto e
   ricevere una lista di candidati con percentuale di confidenza, ognuno
   collegato alla scheda locale corrispondente se presente nel database.

La chiave viene salvata **solo in locale** (IndexedDB del browser), non
viene mai inviata altrove se non al servizio AI che tu stesso configuri.

Il formato di richiesta/risposta di default replica l'API Kindwise
(`POST` JSON con header `Api-Key`, risposta in
`result.classification.suggestions`). Se usi un provider diverso con un
formato differente, adatta la sola funzione `interpretaRisposta()` in
`js/ai.js`.

Offline, la tab Assistente si disattiva automaticamente e rimanda al
Riconoscimento guidato, che funziona sempre senza rete.

## Note sul dataset

Il database (`data/funghi.json`) copre ~30 specie comuni sull'arco alpino,
comprese le specie tossiche e mortali più rilevanti (*Amanita phalloides*,
*Amanita virosa*, *Galerina marginata*, *Cortinarius orellanus*, *Gyromitra
esculenta*, ecc.) con i rispettivi sosia commestibili, per allenare anche i
casi pericolosi e non solo quelli "buoni". I contenuti sono a scopo
didattico/di primo orientamento: non sostituiscono in nessun caso il parere
di un esperto micologo.

# FunghiAlpini

PWA mobile-first per il riconoscimento dei funghi da foto: scatti (o carichi)
una foto, l'app la invia a un servizio di riconoscimento AI e ti mostra la
specie più probabile — nome scientifico, nome comune, commestibilità — oltre
ad eventuali specie simili con cui potrebbe essere confusa, con le
caratteristiche concrete per distinguerle.

⚠️ **È uno strumento di supporto al riconoscimento, non un sostituto di un
esperto.** Per il consumo, fai sempre verificare i funghi da un esperto o
dall'Ispettorato Micologico della tua ASL (servizio gratuito in tutta
Italia).

## Come funziona

1. Apri l'app, tab principale "Riconosci".
2. Scatti o carichi una foto del fungo.
3. La foto viene inviata al servizio AI configurato in Impostazioni.
4. L'app mostra il **risultato più probabile** (nome, commestibilità,
   caratteri di riconoscimento) e, se disponibili, fino a 4 **alternative**
   con le differenze concrete rispetto al risultato principale.

Il riconoscimento vero e proprio richiede sempre connessione internet: non
esiste un modello affidabile che riconosca funghi offline su un telefono.
L'app stessa (schermate Impostazioni/Info) resta invece consultabile anche
offline dopo il primo caricamento, grazie al service worker.

## Stack

- HTML/CSS/JS vanilla, nessuna dipendenza a runtime.
- Service worker + Cache API per l'app shell offline.
- Web App Manifest installabile (icona in home, modalità standalone).
- `data/funghi.json`: database locale di ~30 specie alpine (commestibilità,
  caratteri di riconoscimento, sosia) usato per arricchire i risultati
  dell'AI — l'AI riconosce la specie nella foto, il database locale dice se
  è commestibile e come distinguerla dai sosia pericolosi.

## Configurare il riconoscimento AI (obbligatorio)

Senza questa configurazione l'app non può analizzare foto. Serve una API key
di un servizio di riconoscimento immagini per funghi.

### Con Kindwise (mushroom.id) — consigliato

1. Vai su **https://admin.kindwise.com/signup** e crea un account gratuito
   (username, email, password). Il piano gratuito include un numero
   limitato di richieste al mese, sufficiente per un uso personale
   occasionale.
2. Dopo la registrazione entri nel pannello admin: la tua **API key** è già
   generata, nella sezione "API keys".
3. L'endpoint di identificazione è fisso:
   `https://mushroom.kindwise.com/api/v1/identification` — nell'app è già
   precompilato, non serve copiarlo a mano.
4. Apri FunghiAlpini → icona ⚙️ Impostazioni → incolla la API key →
   **Salva**.

Nota: il dominio `mushroom.id` (senza "kindwise") è in vendita e NON è il
servizio giusto — usa sempre gli indirizzi `kindwise.com` indicati sopra.

La chiave viene salvata **solo su questo dispositivo** (`localStorage` del
browser): non viene mai inviata altrove se non al servizio AI che tu stesso
configuri, insieme alla singola foto che analizzi.

### Con un provider diverso

Qualunque servizio che accetti una foto via HTTP e restituisca una lista di
specie candidate va bene. Se il formato della risposta è diverso da quello
Kindwise, adatta la sola funzione `interpretaRisposta()` in `js/ai.js`:
deve restituire un array di `{ nome, confidenza }` (confidenza tra 0 e 1)
a partire dal JSON di risposta del tuo provider.

## Avvio in locale

Serve un server HTTP qualsiasi (i service worker non funzionano da
`file://`):

```bash
cd FUNGHETTO
python3 -m http.server 8080
# poi apri http://localhost:8080 nel browser
```

## Installare la PWA sullo smartphone

- **Android (Chrome)**: apri il sito, menu ⋮ → "Aggiungi a schermata Home" /
  "Installa app".
- **iPhone (Safari)**: apri il sito, tocca l'icona Condividi → "Aggiungi a
  Home".

## Struttura del progetto

```
index.html          shell dell'app (single page, navigazione via hash)
manifest.json         manifest PWA
sw.js                  service worker (cache offline dell'app shell)
css/style.css          stile mobile-first, tema natura, alto contrasto
js/
  data.js              caricamento/interrogazione data/funghi.json,
                       confronto caratteri fra due specie (sosia)
  ai.js                 invio foto al servizio AI, parsing risposta,
                        abbinamento al database locale
  views.js               le 3 schermate: Riconosci, Impostazioni, Info
  router.js               micro-router basato su hash
  app.js                   bootstrap app (service worker, indicatore online/offline)
data/funghi.json      database locale delle specie
assets/icons/           icone PWA
scripts/generate_icons.py  script di utilità per rigenerare le icone PWA
```

## Come ampliare il database locale

Il database serve ad arricchire i risultati dell'AI (commestibilità,
caratteri, sosia), non per una navigazione a catalogo. Per aggiungere una
specie, apri `data/funghi.json` (array di oggetti) e copia una voce
esistente come modello:

| Campo | Descrizione |
|---|---|
| `id` | slug univoco, minuscolo con trattini |
| `nome_scientifico` | nome scientifico completo |
| `nomi_comuni` | array di nomi italiani/dialettali |
| `commestibilita` | uno tra `commestibile`, `commestibile_con_cautela`, `da_non_consumare`, `tossico`, `mortale`, `non_determinato` |
| `habitat` / `stagione` | testo libero |
| `imenoforo_tipo` | uno tra `lamelle`, `pori`, `aghi`, `pieghe` (usato anche nel confronto automatico fra specie) |
| `anello` / `volva` / `viraggio` | booleani (usati anche nel confronto automatico) |
| `descrizione` | testo descrittivo libero |
| `caratteri_riconoscimento` | array di `{ "tratto": "...", "valore": "..." }` |
| `sosia` | array di `{ "nome": "...", "come_distinguerli": "..." }`: differenze CONCRETE, mostrate quando l'AI propone questa specie come alternativa a una simile |

L'abbinamento fra il nome restituito dall'AI e una voce di questo database
avviene per nome scientifico/comune in `js/ai.js` (`abbinaSpecieLocale`):
non serve altro codice per far comparire una nuova specie nei risultati.

## Note sul dataset

Il database copre ~30 specie comuni sull'arco alpino, comprese le specie
tossiche e mortali più rilevanti (*Amanita phalloides*, *Amanita virosa*,
*Galerina marginata*, *Cortinarius orellanus*, *Gyromitra esculenta*, ecc.)
con i rispettivi sosia commestibili. I contenuti sono a scopo didattico/di
primo orientamento: non sostituiscono in nessun caso il parere di un esperto
micologo.

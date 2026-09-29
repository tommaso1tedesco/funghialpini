/**
 * ai.js — riconoscimento funghi da foto tramite servizio esterno
 * (es. Kindwise mushroom.id o compatibile). È la funzione centrale
 * dell'app: richiede connessione e una API key.
 *
 * Formato di richiesta/risposta atteso di default: API Kindwise mushroom.id
 * (endpoint https://mushroom.kindwise.com/api/v1/identification,
 * POST JSON { images:["data:image/jpeg;base64,..."] }, header "Api-Key",
 * risposta result.classification.suggestions = [{name, probability}]).
 * Se usi un provider diverso, adatta solo la funzione `interpretaRisposta`.
 *
 * ATTENZIONE — chiave incorporata nel codice:
 * DEFAULT_API_KEY qui sotto è la chiave personale del proprietario dell'app,
 * inserita direttamente nel codice per scelta esplicita (per far funzionare
 * l'app a chiunque riceva il link, senza doversi registrare a propria volta).
 * Essendo un sito statico, questo codice è leggibile da chiunque apra gli
 * strumenti sviluppatore del browser: chi lo desidera può copiare la chiave
 * e consumare la quota associata. Se in futuro questo diventa un problema
 * (quota esaurita, uso improprio), l'unica soluzione robusta è spostare la
 * chiamata dietro un piccolo server/proxy che la tenga nascosta.
 * Ogni utente può comunque impostare una propria chiave in Impostazioni:
 * se presente, ha sempre la precedenza su questa di default.
 */
const FunghiAI = (() => {
  const KEY_ENDPOINT = "funghialpini_ai_endpoint";
  const KEY_APIKEY = "funghialpini_ai_api_key";

  const DEFAULT_ENDPOINT = "https://mushroom.kindwise.com/api/v1/identification";
  const DEFAULT_API_KEY = "TnmAQHyqh9KZ69mbGjBDe3jmgq9k5iI0BIqYwgIWIJ221znxKf";

  function getConfig() {
    return {
      endpoint: localStorage.getItem(KEY_ENDPOINT) || DEFAULT_ENDPOINT,
      apiKey: localStorage.getItem(KEY_APIKEY) || DEFAULT_API_KEY,
    };
  }

  function setConfig({ endpoint, apiKey }) {
    localStorage.setItem(KEY_ENDPOINT, endpoint || "");
    localStorage.setItem(KEY_APIKEY, apiKey || "");
  }

  /** true se l'utente ha impostato una propria chiave (sostituisce quella condivisa) */
  function haChiavePersonale() {
    return Boolean(localStorage.getItem(KEY_APIKEY));
  }

  /** Torna a usare la chiave condivisa incorporata nell'app */
  function usaChiaveCondivisa() {
    localStorage.removeItem(KEY_ENDPOINT);
    localStorage.removeItem(KEY_APIKEY);
  }

  function isConfigurato() {
    const { endpoint, apiKey } = getConfig();
    return Boolean(endpoint && apiKey);
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result); // data:...;base64,...
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * L'API Kindwise restituisce anche result.is_mushroom = { binary, probability,
   * threshold }: una stima separata di quanto l'immagine assomigli DAVVERO a un
   * fungo, indipendente dalla lista di specie candidate (che il servizio prova
   * a restituire comunque, anche per foto di persone, oggetti, altre piante...).
   * Se il campo è presente e binary è false, l'immagine non è un fungo: meglio
   * dirlo chiaramente che mostrare specie "indovinate" senza senso.
   * Se il campo manca (altro provider), non blocchiamo nulla.
   */
  function isFotoDiUnFungo(json) {
    const info = json?.result?.is_mushroom;
    if (!info || typeof info.binary !== "boolean") return true;
    return info.binary;
  }

  /**
   * Adatta qui il parsing se il tuo provider ha un formato di risposta diverso.
   * Deve restituire un array di { nome, confidenza } con confidenza 0-1.
   */
  function interpretaRisposta(json) {
    const suggestions =
      json?.result?.classification?.suggestions ||
      json?.suggestions ||
      json?.predictions ||
      [];
    return suggestions.map((s) => ({
      nome: s.name || s.nome || s.label || "Sconosciuto",
      confidenza: typeof s.probability === "number" ? s.probability : (s.confidenza ?? s.score ?? 0),
    }));
  }

  /**
   * Cerca una corrispondenza nel database locale a partire dal nome
   * restituito dall'AI. Richiede sempre almeno genere+specie (non solo il
   * genere): un match sul solo genere abbinerebbe erroneamente specie
   * diverse dello stesso genere (es. un Boletus non in database mostrato
   * come fosse Boletus edulis) — pericoloso per la commestibilità indicata.
   * Se non c'è un match sufficientemente preciso, meglio restituire null
   * (la specie verrà segnalata come "non presente nel database locale").
   */
  function abbinaSpecieLocale(nomeAI) {
    const nomeNorm = nomeAI.toLowerCase().trim();
    const tutte = FunghiData.all();

    let trovato = tutte.find((s) => s.nome_scientifico.toLowerCase() === nomeNorm);
    if (trovato) return trovato;

    const parole = nomeNorm.split(/\s+/).filter(Boolean);
    if (parole.length >= 2) {
      const genereSpecie = parole.slice(0, 2).join(" ");
      trovato = tutte.find((s) => {
        const sciNorm = s.nome_scientifico.toLowerCase();
        return sciNorm === genereSpecie || sciNorm.startsWith(genereSpecie + " ");
      });
      if (trovato) return trovato;
    }

    trovato = tutte.find((s) => s.nomi_comuni.some((n) => n.toLowerCase() === nomeNorm));
    return trovato || null;
  }

  /** Se più suggerimenti dell'AI puntano alla stessa specie locale (o allo
   * stesso nome, se non abbinata), tiene solo l'occorrenza con confidenza
   * più alta: evita di mostrare la stessa specie due volte tra i risultati. */
  function deduplica(candidati) {
    const mappa = new Map();
    for (const c of candidati) {
      const chiave = c.specieLocale ? c.specieLocale.id : c.nome.toLowerCase().trim();
      const esistente = mappa.get(chiave);
      if (!esistente || c.confidenza > esistente.confidenza) mappa.set(chiave, c);
    }
    return Array.from(mappa.values());
  }

  /**
   * Invia la foto al servizio configurato e restituisce i candidati arricchiti
   * con i dati locali (commestibilità, caratteri, sosia) quando disponibili.
   */
  async function identifica(fileBlob) {
    if (!navigator.onLine) throw new Error("OFFLINE");
    const { endpoint, apiKey } = getConfig();
    if (!endpoint || !apiKey) throw new Error("NON_CONFIGURATO");

    const base64 = await blobToBase64(fileBlob);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Api-Key": apiKey },
      body: JSON.stringify({ images: [base64] }),
    });
    if (!res.ok) throw new Error(`Errore del servizio AI (HTTP ${res.status})`);

    const json = await res.json();
    if (!isFotoDiUnFungo(json)) throw new Error("NON_FUNGO");

    const grezzi = interpretaRisposta(json);
    if (grezzi.length === 0) throw new Error("NESSUN_CANDIDATO");

    const arricchiti = grezzi.map((c) => ({ ...c, specieLocale: abbinaSpecieLocale(c.nome) }));
    return deduplica(arricchiti).sort((a, b) => b.confidenza - a.confidenza);
  }

  return { getConfig, setConfig, haChiavePersonale, usaChiaveCondivisa, isConfigurato, identifica };
})();

/**
 * ai.js — modulo OPZIONALE di riconoscimento tramite servizio esterno
 * (es. Kindwise mushroom.id, plant.id o compatibili). Funziona SOLO online:
 * l'utente inserisce endpoint e API key una volta, salvati in IndexedDB.
 *
 * Nessuna chiave è preimpostata: senza configurazione il modulo resta
 * disattivato e l'app rimanda al Riconoscimento guidato locale.
 *
 * Formato di richiesta/risposta atteso di default: API Kindwise
 * (POST JSON { images:["data:image/jpeg;base64,..."] }, header "Api-Key",
 * risposta result.classification.suggestions = [{name, probability}]).
 * Se usi un provider diverso, adatta solo la funzione `interpretaRisposta`.
 */
const FunghiAI = (() => {
  const KEY_ENDPOINT = "ai_endpoint";
  const KEY_APIKEY = "ai_api_key";

  async function getConfig() {
    const [endpoint, apiKey] = await Promise.all([
      FunghiDB.getSetting(KEY_ENDPOINT, ""),
      FunghiDB.getSetting(KEY_APIKEY, ""),
    ]);
    return { endpoint, apiKey };
  }

  async function setConfig({ endpoint, apiKey }) {
    await FunghiDB.setSetting(KEY_ENDPOINT, endpoint || "");
    await FunghiDB.setSetting(KEY_APIKEY, apiKey || "");
  }

  async function isConfigurato() {
    const { endpoint, apiKey } = await getConfig();
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

  /** Cerca una corrispondenza nel database locale a partire dal nome restituito dall'AI */
  function abbinaSpecieLocale(nomeAI) {
    const parole = nomeAI.toLowerCase().split(/\s+/).filter(Boolean);
    const genere = parole[0] || "";
    const tutte = FunghiData.all();
    // 1. match esatto sul nome scientifico
    let trovato = tutte.find((s) => s.nome_scientifico.toLowerCase() === nomeAI.toLowerCase());
    if (trovato) return trovato;
    // 2. match sul solo genere (prima parola del nome scientifico)
    trovato = tutte.find((s) => s.nome_scientifico.toLowerCase().startsWith(genere));
    if (trovato) return trovato;
    // 3. match su nomi comuni
    trovato = tutte.find((s) => s.nomi_comuni.some((n) => n.toLowerCase().includes(nomeAI.toLowerCase())));
    return trovato || null;
  }

  async function identifica(fileBlob) {
    if (!navigator.onLine) {
      throw new Error("OFFLINE");
    }
    const { endpoint, apiKey } = await getConfig();
    if (!endpoint || !apiKey) {
      throw new Error("NON_CONFIGURATO");
    }
    const base64 = await blobToBase64(fileBlob);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": apiKey,
      },
      body: JSON.stringify({ images: [base64] }),
    });
    if (!res.ok) {
      throw new Error(`Errore del servizio AI (HTTP ${res.status})`);
    }
    const json = await res.json();
    const grezzi = interpretaRisposta(json);
    return grezzi
      .map((c) => ({ ...c, specieLocale: abbinaSpecieLocale(c.nome) }))
      .sort((a, b) => b.confidenza - a.confidenza);
  }

  return { getConfig, setConfig, isConfigurato, identifica };
})();

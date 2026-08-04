/**
 * ai.js — riconoscimento funghi da foto tramite servizio esterno
 * (es. Kindwise mushroom.id o compatibile). È la funzione centrale
 * dell'app: richiede connessione e una API key personale, inserita una
 * volta nella schermata Impostazioni e salvata solo su questo dispositivo
 * (localStorage).
 *
 * Formato di richiesta/risposta atteso di default: API Kindwise
 * (POST JSON { images:["data:image/jpeg;base64,..."] }, header "Api-Key",
 * risposta result.classification.suggestions = [{name, probability}]).
 * Se usi un provider diverso, adatta solo la funzione `interpretaRisposta`.
 */
const FunghiAI = (() => {
  const KEY_ENDPOINT = "funghialpini_ai_endpoint";
  const KEY_APIKEY = "funghialpini_ai_api_key";

  function getConfig() {
    return {
      endpoint: localStorage.getItem(KEY_ENDPOINT) || "",
      apiKey: localStorage.getItem(KEY_APIKEY) || "",
    };
  }

  function setConfig({ endpoint, apiKey }) {
    localStorage.setItem(KEY_ENDPOINT, endpoint || "");
    localStorage.setItem(KEY_APIKEY, apiKey || "");
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
    let trovato = tutte.find((s) => s.nome_scientifico.toLowerCase() === nomeAI.toLowerCase());
    if (trovato) return trovato;
    trovato = tutte.find((s) => s.nome_scientifico.toLowerCase().startsWith(genere));
    if (trovato) return trovato;
    trovato = tutte.find((s) => s.nomi_comuni.some((n) => n.toLowerCase().includes(nomeAI.toLowerCase())));
    return trovato || null;
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
    const grezzi = interpretaRisposta(json);
    if (grezzi.length === 0) throw new Error("NESSUN_CANDIDATO");

    return grezzi
      .map((c) => ({ ...c, specieLocale: abbinaSpecieLocale(c.nome) }))
      .sort((a, b) => b.confidenza - a.confidenza);
  }

  return { getConfig, setConfig, isConfigurato, identifica };
})();

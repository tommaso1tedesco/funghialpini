/**
 * data.js — caricamento e interrogazione del database specie (data/funghi.json).
 * Il fetch passa dalla Cache API tramite service worker, quindi funziona anche offline
 * dopo il primo caricamento.
 */
const FunghiData = (() => {
  let specie = [];
  let loaded = false;

  const LABELS_EDIBILITA = {
    commestibile: { testo: "Commestibile", icona: "✅" },
    commestibile_con_cautela: { testo: "Commestibile con cautela", icona: "⚠️" },
    da_non_consumare: { testo: "Da non consumare", icona: "⛔" },
    tossico: { testo: "Tossico", icona: "☠️" },
    mortale: { testo: "MORTALE", icona: "💀" },
    non_determinato: { testo: "Non determinato", icona: "❔" },
  };

  async function load() {
    if (loaded) return specie;
    const res = await fetch("data/funghi.json");
    if (!res.ok) throw new Error("Impossibile caricare il database dei funghi");
    specie = await res.json();
    loaded = true;
    return specie;
  }

  function all() {
    return specie;
  }

  function getById(id) {
    return specie.find((s) => s.id === id) || null;
  }

  function normalizza(str) {
    return (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  /** Ricerca per nome scientifico o nome comune */
  function search(query) {
    const q = normalizza(query.trim());
    if (!q) return specie;
    return specie.filter((s) => {
      if (normalizza(s.nome_scientifico).includes(q)) return true;
      return s.nomi_comuni.some((n) => normalizza(n).includes(q));
    });
  }

  function labelEdibilita(chiave) {
    return LABELS_EDIBILITA[chiave] || LABELS_EDIBILITA.non_determinato;
  }

  /** Opzioni disponibili per il riconoscimento guidato, dedotte dal dataset stesso */
  function opzioniFiltro() {
    const colori = new Set();
    const habitat = new Set();
    const stagioni = new Set();
    const imenofori = new Set();
    specie.forEach((s) => {
      (s.colore_cappello || []).forEach((c) => colori.add(c));
      (s.habitat_tipo || []).forEach((h) => habitat.add(h));
      (s.stagione_tipo || []).forEach((st) => stagioni.add(st));
      if (s.imenoforo_tipo) imenofori.add(s.imenoforo_tipo);
    });
    return {
      colori: Array.from(colori).sort(),
      habitat: Array.from(habitat).sort(),
      stagioni: ordinaStagioni(Array.from(stagioni)),
      imenofori: Array.from(imenofori).sort(),
    };
  }

  function ordinaStagioni(arr) {
    const ordine = ["primavera", "estate", "autunno", "inverno"];
    return arr.sort((a, b) => ordine.indexOf(a) - ordine.indexOf(b));
  }

  /**
   * Filtra le specie in base ai caratteri visibili selezionati dall'utente.
   * filtri: { colori: [], imenoforo: [], anello: null|true|false,
   *           volva: null|true|false, habitat: [], stagioni: [], viraggio: null|true|false }
   */
  function filtraGuidato(filtri) {
    return specie.filter((s) => {
      if (filtri.colori.length && !(s.colore_cappello || []).some((c) => filtri.colori.includes(c))) return false;
      if (filtri.imenoforo.length && !filtri.imenoforo.includes(s.imenoforo_tipo)) return false;
      if (filtri.anello !== null && Boolean(s.anello) !== filtri.anello) return false;
      if (filtri.volva !== null && Boolean(s.volva) !== filtri.volva) return false;
      if (filtri.viraggio !== null && Boolean(s.viraggio) !== filtri.viraggio) return false;
      if (filtri.habitat.length && !(s.habitat_tipo || []).some((h) => filtri.habitat.includes(h))) return false;
      if (filtri.stagioni.length && !(s.stagione_tipo || []).some((st) => filtri.stagioni.includes(st))) return false;
      return true;
    });
  }

  /** Ordina i risultati mettendo prima le specie pericolose (utile a scopo di sicurezza) */
  function ordinaPerRilevanza(lista) {
    const peso = { mortale: 0, tossico: 1, da_non_consumare: 2, commestibile_con_cautela: 3, commestibile: 4, non_determinato: 5 };
    return [...lista].sort((a, b) => (peso[a.commestibilita] ?? 9) - (peso[b.commestibilita] ?? 9));
  }

  return { load, all, getById, search, labelEdibilita, opzioniFiltro, filtraGuidato, ordinaPerRilevanza };
})();

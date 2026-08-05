/**
 * data.js — caricamento e interrogazione del database specie (data/funghi.json).
 * Il fetch passa dalla Cache API tramite service worker, quindi funziona anche offline
 * dopo il primo caricamento (il database è usato per arricchire i risultati
 * dell'Assistente AI con commestibilità, caratteri e sosia).
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

  function labelEdibilita(chiave) {
    return LABELS_EDIBILITA[chiave] || LABELS_EDIBILITA.non_determinato;
  }

  function normalizza(str) {
    return (str || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  /**
   * Cerca, nella lista "sosia" di una specie, la voce che si riferisce a
   * un'altra specie. Richiede un match su genere+specie (non sul solo
   * genere): altrimenti, tra generi ricchi di voci come Boletus o Amanita,
   * il confronto rischia di pescare la voce sbagliata solo perché due
   * specie diverse condividono il genere.
   */
  function trovaVoceSosia(specieA, specieB) {
    if (!specieA || !specieA.sosia) return null;
    const sciB = normalizza(specieB.nome_scientifico);
    const genereSpecieB = sciB.split(" ").slice(0, 2).join(" ");
    const comuniB = specieB.nomi_comuni.map(normalizza).filter((n) => n.length > 3);

    return (
      specieA.sosia.find((so) => {
        const nomeSo = normalizza(so.nome);
        if (genereSpecieB && nomeSo.includes(genereSpecieB)) return true;
        return comuniB.some((n) => nomeSo.includes(n));
      }) || null
    );
  }

  /**
   * Testo con le differenze concrete fra due specie del database locale, per
   * aiutare a distinguere il risultato principale da un'alternativa.
   * Usa i testi "sosia" scritti a mano quando la coppia è nota; altrimenti
   * ripiega su un confronto automatico dei caratteri strutturati.
   */
  function confrontaSpecie(principale, alternativa) {
    const voceDiretta = trovaVoceSosia(principale, alternativa);
    if (voceDiretta) return voceDiretta.come_distinguerli;
    const voceInversa = trovaVoceSosia(alternativa, principale);
    if (voceInversa) return voceInversa.come_distinguerli;

    const diff = [];
    if (alternativa.imenoforo_tipo !== principale.imenoforo_tipo) {
      diff.push(`imenoforo a ${alternativa.imenoforo_tipo} (invece di ${principale.imenoforo_tipo})`);
    }
    if (Boolean(alternativa.anello) !== Boolean(principale.anello)) {
      diff.push(`anello ${alternativa.anello ? "presente" : "assente"}`);
    }
    if (Boolean(alternativa.volva) !== Boolean(principale.volva)) {
      diff.push(`volva ${alternativa.volva ? "presente" : "assente"}`);
    }
    if (Boolean(alternativa.viraggio) !== Boolean(principale.viraggio)) {
      diff.push(`carne che ${alternativa.viraggio ? "vira" : "non vira"} colore al taglio`);
    }
    if (diff.length === 0) return null;
    return `Rispetto al risultato principale: ${diff.join(", ")}. Confronta comunque tutti i caratteri prima di decidere.`;
  }

  return { load, all, getById, labelEdibilita, confrontaSpecie };
})();

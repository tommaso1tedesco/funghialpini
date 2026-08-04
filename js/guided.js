/**
 * guided.js — stato e logica del "Riconoscimento guidato".
 * L'utente seleziona i caratteri visibili sul fungo davanti a sé; ad ogni
 * tocco la lista dei candidati viene ricalcolata con FunghiData.filtraGuidato.
 */
const FunghiGuided = (() => {
  function statoIniziale() {
    return {
      colori: [],
      imenoforo: [],
      anello: null, // null = non specificato, true/false = presente/assente
      volva: null,
      viraggio: null,
      habitat: [],
      stagioni: [],
    };
  }

  let stato = statoIniziale();

  function reset() {
    stato = statoIniziale();
  }

  function get() {
    return stato;
  }

  function toggleMultiValore(campo, valore) {
    const idx = stato[campo].indexOf(valore);
    if (idx === -1) stato[campo].push(valore);
    else stato[campo].splice(idx, 1);
  }

  function setTriStato(campo, valore) {
    // click ripetuto sullo stesso valore lo azzera (torna a "non specificato")
    stato[campo] = stato[campo] === valore ? null : valore;
  }

  function haFiltriAttivi() {
    return (
      stato.colori.length > 0 ||
      stato.imenoforo.length > 0 ||
      stato.anello !== null ||
      stato.volva !== null ||
      stato.viraggio !== null ||
      stato.habitat.length > 0 ||
      stato.stagioni.length > 0
    );
  }

  function risultati() {
    if (!haFiltriAttivi()) return FunghiData.ordinaPerRilevanza(FunghiData.all());
    return FunghiData.ordinaPerRilevanza(FunghiData.filtraGuidato(stato));
  }

  return { reset, get, toggleMultiValore, setTriStato, haFiltriAttivi, risultati };
})();

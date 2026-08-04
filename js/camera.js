/**
 * camera.js — cattura/caricamento foto e gestione del diario delle uscite.
 * Usa un <input type="file" accept="image/*" capture="environment"> per aprire
 * la fotocamera nativa: funziona offline e non richiede permessi getUserMedia
 * gestiti manualmente.
 */
const FunghiCamera = (() => {
  function chiediPosizione() {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null), // negato o non disponibile: si prosegue senza
        { timeout: 6000, maximumAge: 60000 }
      );
    });
  }

  async function salvaScatto({ file, note, specieId, includiPosizione }) {
    const geo = includiPosizione ? await chiediPosizione() : null;
    const entry = {
      foto: file, // Blob, salvato direttamente in IndexedDB
      data: new Date().toISOString(),
      geo,
      note: note || "",
      specieId: specieId || null,
    };
    return FunghiDB.addDiarioEntry(entry);
  }

  async function elencoDiario() {
    const entries = await FunghiDB.getAllDiarioEntries();
    return entries.map((e) => ({ ...e, fotoUrl: URL.createObjectURL(e.foto) }));
  }

  async function eliminaVoce(id) {
    return FunghiDB.deleteDiarioEntry(id);
  }

  function formattaData(iso) {
    const d = new Date(iso);
    return d.toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function formattaGeo(geo) {
    if (!geo) return null;
    return `${geo.lat.toFixed(5)}, ${geo.lon.toFixed(5)}`;
  }

  return { salvaScatto, elencoDiario, eliminaVoce, formattaData, formattaGeo };
})();

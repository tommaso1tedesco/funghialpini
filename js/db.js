/**
 * db.js — wrapper minimale su IndexedDB.
 * Due object store:
 *  - "diario": foto scattate dall'utente + note + data + geolocalizzazione
 *  - "impostazioni": chiave/valore libero (es. API key assistente AI)
 */
const FunghiDB = (() => {
  const DB_NAME = "funghialpini-db";
  const DB_VERSION = 1;
  const STORE_DIARIO = "diario";
  const STORE_SETTINGS = "impostazioni";

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_DIARIO)) {
          const store = db.createObjectStore(STORE_DIARIO, { keyPath: "id", autoIncrement: true });
          store.createIndex("data", "data");
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: "chiave" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(storeName, mode) {
    return open().then((db) => db.transaction(storeName, mode).objectStore(storeName));
  }

  // ---------- Diario ----------

  /** entry: { foto: Blob, data: ISOString, geo: {lat,lon}|null, note: string, specieId: string|null } */
  async function addDiarioEntry(entry) {
    const store = await tx(STORE_DIARIO, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.add(entry);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAllDiarioEntries() {
    const store = await tx(STORE_DIARIO, "readonly");
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result.sort((a, b) => (b.data || "").localeCompare(a.data || "")));
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteDiarioEntry(id) {
    const store = await tx(STORE_DIARIO, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function updateDiarioEntry(entry) {
    const store = await tx(STORE_DIARIO, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ---------- Impostazioni ----------

  async function getSetting(chiave, fallback = null) {
    const store = await tx(STORE_SETTINGS, "readonly");
    return new Promise((resolve, reject) => {
      const req = store.get(chiave);
      req.onsuccess = () => resolve(req.result ? req.result.valore : fallback);
      req.onerror = () => reject(req.error);
    });
  }

  async function setSetting(chiave, valore) {
    const store = await tx(STORE_SETTINGS, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.put({ chiave, valore });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  return {
    addDiarioEntry,
    getAllDiarioEntries,
    deleteDiarioEntry,
    updateDiarioEntry,
    getSetting,
    setSetting,
  };
})();

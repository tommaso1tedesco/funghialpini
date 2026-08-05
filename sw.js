/**
 * sw.js — Service Worker per funzionamento offline dell'app shell.
 *
 * Strategia:
 *  - "app shell" (HTML/CSS/JS/manifest/icone) e data/funghi.json: cache-first,
 *    con aggiornamento in background quando torna la rete. Questo permette
 *    di aprire l'app e consultare Impostazioni/Info anche senza connessione.
 *  - Il riconoscimento da foto richiede invece sempre una connessione attiva:
 *    le richieste verso il servizio AI esterno (altro dominio) NON vengono
 *    mai intercettate da questo service worker, passano sempre alla rete.
 *
 * Incrementa CACHE_VERSION quando modifichi file dell'app shell per forzare
 * l'aggiornamento della cache sui dispositivi degli utenti.
 */
const CACHE_VERSION = "v6";
const CACHE_NAME = `funghialpini-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "js/data.js",
  "js/ai.js",
  "js/views.js",
  "js/router.js",
  "js/app.js",
  "data/funghi.json",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-192-maskable.png",
  "assets/icons/icon-512-maskable.png",
  "assets/icons/icon-192.svg",
];

function toScopedUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL.map(toScopedUrl));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nomi = await caches.keys();
      await Promise.all(
        nomi.filter((n) => n.startsWith("funghialpini-") && n !== CACHE_NAME).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // lascia passare le chiamate AI esterne

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);

      // cache-first: risposta immediata da cache se disponibile
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);

      if (cached) {
        // aggiorna la cache in background quando torna la rete, senza bloccare la UI
        networkFetch;
        return cached;
      }

      const fromNetwork = await networkFetch;
      if (fromNetwork) return fromNetwork;

      // Offline e nessuna cache: per la navigazione mostra comunque l'app shell
      if (req.mode === "navigate") {
        const fallback = await cache.match(toScopedUrl("index.html"));
        if (fallback) return fallback;
      }

      return new Response("Risorsa non disponibile offline.", { status: 503, statusText: "Offline" });
    })()
  );
});

/**
 * sw.js — Service Worker per funzionamento 100% offline dopo il primo avvio.
 *
 * Strategia:
 *  - "app shell" (HTML/CSS/JS/manifest/icone) e data/funghi.json: cache-first,
 *    con aggiornamento in background quando torna la rete.
 *  - Tutte le immagini elencate in data/funghi.json vengono precaricate
 *    all'installazione, cosi' catalogo, schede e confronto sosia funzionano
 *    interamente offline.
 *  - Richieste verso altri domini (es. servizio AI esterno) NON vengono mai
 *    intercettate: passano sempre alla rete, cosi' l'assistente AI resta
 *    "solo online" senza interferenze della cache.
 *
 * Incrementa CACHE_VERSION quando modifichi file dell'app shell per forzare
 * l'aggiornamento della cache sui dispositivi degli utenti.
 */
const CACHE_VERSION = "v1";
const CACHE_NAME = `funghialpini-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "js/db.js",
  "js/data.js",
  "js/guided.js",
  "js/camera.js",
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

      // 1. app shell
      await cache.addAll(APP_SHELL.map(toScopedUrl));

      // 2. tutte le immagini delle specie, lette dal dataset appena messo in cache
      try {
        const res = await cache.match(toScopedUrl("data/funghi.json"));
        const specie = await res.json();
        const immaginiUrls = specie.flatMap((s) => s.immagini || []).map(toScopedUrl);
        await Promise.all(
          immaginiUrls.map((url) =>
            cache.add(url).catch((err) => console.warn("Immagine non precaricabile:", url, err))
          )
        );
      } catch (err) {
        console.warn("Precaricamento immagini fallito:", err);
      }

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

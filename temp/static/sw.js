// FinanceFamille Service Worker v3.0
const CACHE_NAME = "financefamille-v3";
const OFFLINE_URL = "/offline";

// Ressources pré-cachées à l'installation
const PRECACHE_ASSETS = [
  "/",
  "/dashboard",
  "/offline",
  "/static/css/style.css",
  "/static/js/main.js",
  "/static/js/i18n.js",
  "/static/js/charts.js",
  "/static/js/andy.js",
  "/static/js/ocr.js",
  "/static/manifest.json",
  "/static/icons/icon-192.png",
  "/static/icons/icon-512.png",
  "/static/icons/favicon.ico"
];

// Installation : pré-cache des ressources essentielles
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activation : suppression des anciens caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch : stratégies différenciées selon le type de ressource
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Ignorer les requêtes non-GET et cross-origin
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // API : Network-Only (données toujours fraîches, pas de cache)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: "Hors ligne" }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    return;
  }

  // Ressources statiques : Stale-While-Revalidate
  // Retourne le cache immédiatement, met à jour en arrière-plan
  if (url.pathname.startsWith("/static/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const networkFetch = fetch(event.request).then(response => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Pages HTML : Network-First avec fallback offline
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Fallback vers la page offline pour les navigations HTML
        if (event.request.headers.get("Accept")?.includes("text/html")) {
          return caches.match(OFFLINE_URL);
        }
        return new Response("Ressource indisponible hors ligne", { status: 503 });
      })
  );
});

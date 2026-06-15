const CACHE_NAME = 'llmui-v1';

// Ressources statiques à mettre en cache pour le mode hors-ligne
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/logoLLMUI.png',
  '/andyLogo.png',
  '/andy.svg',
];

// Installation : mise en cache des assets statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activation : suppression des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : Network-first pour les appels API, Cache-first pour les assets statiques
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Les appels API ne sont jamais mis en cache
  if (url.pathname.startsWith('/api/')) return;

  // Pour les assets statiques : cache-first avec fallback réseau
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Mettre en cache les nouvelles ressources statiques valides
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Hors-ligne : retourner la page principale en fallback
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      });
    })
  );
});

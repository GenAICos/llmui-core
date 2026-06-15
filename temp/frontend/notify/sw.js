const CACHE = 'llmui-notify-v1';
const STATIC = ['/notify/', '/notify/manifest.json', '/notify/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
      if (resp.ok && e.request.method === 'GET') {
        caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
      }
      return resp;
    }).catch(() => caches.match('/notify/')))
  );
});

// ── Web Push ──────────────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'LLMUI', body: 'Nouvelle notification', type: 'message', id: null };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch {}

  const icon = '/notify/icon-192.png';
  const badge = '/notify/icon-192.png';
  const tag = `llmui-notif-${data.id || Date.now()}`;

  const opts = {
    body: data.body,
    icon,
    badge,
    tag,
    data: { notification_id: data.id, url: '/notify/' },
    actions: data.type === 'reply_needed'
      ? [{ action: 'reply', title: '↩ Répondre' }, { action: 'dismiss', title: 'Ignorer' }]
      : [{ action: 'open', title: '📬 Ouvrir' }],
    requireInteraction: data.type === 'reply_needed',
    vibrate: [200, 100, 200],
  };

  e.waitUntil(self.registration.showNotification(data.title, opts));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const notifId = e.notification.data?.notification_id;
  const url = notifId ? `/notify/#notif-${notifId}` : '/notify/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const existing = wins.find(w => w.url.includes('/notify'));
      if (existing) {
        existing.focus();
        existing.postMessage({ type: 'open_notification', id: notifId });
      } else {
        clients.openWindow(url);
      }
    })
  );
});

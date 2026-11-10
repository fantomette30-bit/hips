/* Parlance : tout est mis en cache à la première visite, puis servi depuis
   l'appareil. Une version plus récente est récupérée en arrière-plan quand le
   réseau est là, et s'applique à l'ouverture suivante. */
const CACHE = 'parlance-56afa531d1';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];
self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('parlance-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin || new URL(req.url).pathname.includes('/api/')) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
    const fresh = fetch(req, { cache: 'no-cache' }).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    });
    if (hit) { fresh.catch(() => {}); return hit; }
    return fresh.catch(() => caches.match('./index.html'));
  }));
});

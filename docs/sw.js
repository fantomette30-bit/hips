/* Service worker : met tout le jeu en cache à la première visite, puis sert
   toujours depuis le cache. Le jeu s'ouvre alors sans réseau, y compris
   lancé depuis l'écran d'accueil, et même après un redémarrage du téléphone. */
const CACHE = 'sudoku-zen-f899d78dbc';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-1024.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(hit => {
      if (hit) {
        fetch(request, { cache: 'no-cache' }).then(res => {
          if (res && res.ok && new URL(request.url).origin === location.origin) {
            caches.open(CACHE).then(c => c.put(request, res.clone()));
          }
        }).catch(() => {});
        return hit;
      }
      return fetch(request)
        .then(res => {
          if (res && res.ok && new URL(request.url).origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});

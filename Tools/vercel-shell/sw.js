/* Sert le jeu depuis le cache de l'appareil, et va chercher discrètement la
   dernière version publiée quand le réseau est disponible. */
const CACHE = 'sudoku-zen-1';
const GAME = './game.html';
const CORE = ['./game.html', './manifest.webmanifest', './icon-180.png'];
const LATEST = 'https://raw.githubusercontent.com/fantomette30-bit/hips/claude/sudoku-premium-iphone-app-ji3x03/docs/index.html';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE.map(f => new Request(f, { cache: 'reload' }))))
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

/* Récupère la dernière version publiée, en refusant tout ce qui ne ressemble
   pas au jeu (page d'erreur, réponse tronquée). */
async function refresh() {
  try {
    const res = await fetch(LATEST, { cache: 'no-store' });
    if (!res.ok) return;
    const html = await res.text();
    if (html.length < 40000 || !html.includes('id="board"')) return;
    const cache = await caches.open(CACHE);
    const known = await cache.match(GAME);
    if (known && (await known.text()) === html) return;
    await cache.put(GAME, new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
  } catch (e) { /* hors ligne : on garde la version en cache */ }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // toute ouverture de l'app sert le jeu gardé en cache
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE)
        .then(c => c.match(GAME))
        .then(hit => hit || fetch(GAME))
        .catch(() => fetch(GAME))
    );
    event.waitUntil(refresh());
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(hit => hit || fetch(request).then(res => {
      if (res && res.ok && new URL(request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
      }
      return res;
    }))
  );
});

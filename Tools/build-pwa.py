#!/usr/bin/env python3
"""Fabrique la version hors ligne (docs/) à partir de Web/index.html.

`Web/index.html` est la source : un fichier autonome qui marche partout.
`docs/` y ajoute ce qu'il faut pour une installation garantie hors ligne sur
iPhone : manifeste, service worker qui met tout en cache, icônes séparées.

    python3 Tools/build-pwa.py
"""
import base64, hashlib, json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'Web', 'index.html')
OUT = os.path.join(ROOT, 'docs')

REGISTRATION = """
<script>
/* Mise en cache complète : après la première ouverture, le jeu fonctionne
   sans aucun réseau, y compris relancé depuis l'écran d'accueil. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      const el = document.getElementById('offlineState');
      if (el) el.textContent = navigator.serviceWorker.controller
        ? 'Jeu enregistré sur l’appareil : il fonctionne sans réseau.'
        : 'Enregistrement du jeu sur l’appareil…';
      // première visite : l'installation aboutit sans rechargement de page
      navigator.serviceWorker.ready.then(() => {
        if (el && !navigator.serviceWorker.controller) {
          el.textContent = 'Jeu enregistré sur l’appareil : il fonctionne sans réseau.';
        }
      });
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller && el) {
            el.textContent = 'Mise à jour installée — rouvrez le jeu pour en profiter.';
          }
        });
      });
    }).catch(() => {
      const el = document.getElementById('offlineState');
      if (el) el.textContent = 'Le jeu fonctionne, mais la copie hors ligne n’a pas pu être enregistrée.';
    });
  });
}
</script>
"""

SERVICE_WORKER = """/* Service worker : met tout le jeu en cache à la première visite, puis sert
   toujours depuis le cache. Le jeu s'ouvre alors sans réseau, y compris
   lancé depuis l'écran d'accueil, et même après un redémarrage du téléphone. */
const CACHE = 'sudoku-zen-%s';
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
"""

MANIFEST = {
    "name": "Sudoku Zen",
    "short_name": "Sudoku Zen",
    "description": "Sudoku hors ligne à six niveaux, de facile à extrême.",
    "start_url": "./index.html",
    "scope": "./",
    "display": "standalone",
    "orientation": "portrait",
    "background_color": "#EDEFF3",
    "theme_color": "#EDEFF3",
    "lang": "fr",
    "icons": [
        {"src": "icon-180.png", "sizes": "180x180", "type": "image/png"},
        {"src": "icon-1024.png", "sizes": "1024x1024", "type": "image/png", "purpose": "any"},
    ],
}


def build(version=None):
    html = open(SRC, encoding='utf-8').read()
    os.makedirs(OUT, exist_ok=True)

    # point d'ancrage stable : la balise <title>, toujours présente
    title_tag = '<title>Sudoku Zen</title>'
    if title_tag not in html:
        sys.exit("build-pwa : balise <title> introuvable, adapter le script")
    html = html.replace(title_tag,
                        title_tag + '\n<link rel="manifest" href="manifest.webmanifest">', 1)
    if '<link rel="manifest"' not in html:
        sys.exit("build-pwa : l'injection du manifeste a échoué")

    marker = """        <b>Prêt pour le mode avion</b>
        Les grilles sont créées sur votre téléphone. Aucun compte, aucune publicité, aucune donnée envoyée."""
    if marker not in html:
        sys.exit("build-pwa : la carte « mode avion » a changé, adapter le script")
    html = html.replace(marker, marker + """
        <span id="offlineState" style="display:block;margin-top:4px;color:var(--accent);font-weight:600"></span>""", 1)

    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html + REGISTRATION)
    # le nom du cache dépend du contenu : une nouvelle version chasse l'ancienne
    stamp = version or hashlib.sha256(html.encode('utf-8')).hexdigest()[:10]
    open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8').write(SERVICE_WORKER % stamp)
    open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8').write(
        json.dumps(MANIFEST, ensure_ascii=False, indent=2) + '\n')

    icon = re.search(r'<link rel="apple-touch-icon" href="data:image/png;base64,([^"]+)">', html)
    if not icon:
        sys.exit("build-pwa : icône introuvable dans Web/index.html")
    open(os.path.join(OUT, 'icon-180.png'), 'wb').write(base64.b64decode(icon.group(1)))
    shutil.copy(os.path.join(ROOT, 'Tools/icon-1024.png'), os.path.join(OUT, 'icon-1024.png'))
    print('docs/ reconstruit depuis Web/index.html (cache %s)' % stamp)


if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else None)

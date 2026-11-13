#!/usr/bin/env python3
"""Assemble Parlance (English/src) en une application hors ligne (English/app).

Sources : index.html (gabarit), app.css, core.js, ui.js, views.js, content/*.json.
Sortie  : un seul index.html autonome, plus le manifeste, le service worker et
les icônes. Le contenu pédagogique est contrôlé avant l'assemblage.

    python3 Tools/build-english.py
"""
import hashlib, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'English', 'src')
OUT = os.path.join(ROOT, 'English', 'app')
CONTENT = os.path.join(SRC, 'content')


def read(*p):
    with open(os.path.join(*p), encoding='utf-8') as f:
        return f.read()


def load(name):
    return json.loads(read(CONTENT, name))


errors = []


def need(cond, msg):
    if not cond:
        errors.append(msg)


def one_target(s, where):
    need(isinstance(s, str) and len(re.findall(r'\[\[.+?\]\]', s)) == 1, f'{where}: il faut exactement un [[...]]')


def check_mcq(q, where):
    need(isinstance(q.get('options'), list) and len(q['options']) >= 2, f'{where}: options')
    need(isinstance(q.get('answer'), int) and 0 <= q['answer'] < len(q.get('options', [])), f'{where}: index de réponse')
    need(len(set(q.get('options', []))) == len(q.get('options', [])), f'{where}: options en double')


themes = load('themes.json')
entries, skills = {}, {}
for t in themes:
    f = f"entries-{t['id']}.json"
    if os.path.exists(os.path.join(CONTENT, f)):
        entries[t['id']] = load(f)
    f = f"skills-{t['id']}.json"
    if os.path.exists(os.path.join(CONTENT, f)):
        skills[t['id']] = load(f)
language = load('language.json')
# leçons de grammaire complémentaires
for extra in ('grammar-a.json', 'grammar-b.json'):
    if os.path.exists(os.path.join(CONTENT, extra)):
        language['grammar'].extend(load(extra))
need(len({g['id'] for g in language['grammar']}) == len(language['grammar']), 'leçons de grammaire : identifiant en double')
for g in language['grammar']:
    need(g.get('track') in ('legal', 'intermediate', 'advanced', 'writing'), f"{g.get('id')}: filière inconnue")
    for i, x in enumerate(g['exercises']):
        if x.get('type') == 'gap':
            need(x.get('prompt', '').count('___') == 1, f"{g['id']} ex{i + 1}: un seul ___ attendu")

ids = set()
for t, lst in entries.items():
    for e in lst:
        w = f"{t}/{e.get('id')}"
        need(e.get('id') and e['id'] not in ids, f'{w}: identifiant absent ou en double')
        ids.add(e.get('id'))
        need(e.get('level') in (1, 2, 3), f'{w}: niveau')
        for k in ('fr', 'def'):
            need(isinstance(e.get(k), str) and e[k].strip(), f'{w}: {k}')
        for k in ('term', 'ipa'):
            need(isinstance(e.get(k), dict) and e[k].get('uk') and e[k].get('us'), f'{w}: {k} uk/us')
        regs = e.get('registers') or {}
        need(regs.get('formal') or regs.get('everyday'), f'{w}: aucun registre')
        for k in ('formal', 'everyday', 'informal'):
            r = regs.get(k)
            if r:
                need(r.get('uk') and r.get('us'), f'{w}: registre {k} uk/us')
                one_target(r.get('ex'), f'{w}: exemple {k}')
                if r.get('ex_us'):
                    one_target(r['ex_us'], f'{w}: exemple US {k}')
        if e.get('french_concept'):
            x = e.get('explain') or {}
            need(x.get('written') and x.get('spoken'), f'{w}: explication de la notion française')

for t, k in skills.items():
    for key in ('reading', 'writing', 'dialogues', 'roleplays', 'functional'):
        need(isinstance(k.get(key), list), f'{t}: section {key} absente')
    for r in k.get('reading', []):
        text = ' '.join(r['paragraphs'])
        for g in r['glossary']:
            need(g['term'].lower() in text.lower(), f"{r['id']}: « {g['term']} » absent du texte")
        for g in r['legalese']:
            need(g['phrase'].lower() in text.lower(), f"{r['id']}: « {g['phrase']} » absent du texte")
        for i, q in enumerate(r['questions']):
            check_mcq(q, f"{r['id']} q{i + 1}")
    for w in k.get('writing', []):
        need(w['stage'] in (1, 2, 3), f"{w['id']}: étape")
        if w['stage'] == 1:
            need(len(w['gaps']) > 0, f"{w['id']}: phrases à compléter")
            for g in w['gaps']:
                need(g['text'].count('___') == 1, f"{w['id']}: un seul ___ par phrase")
        else:
            need(len(w['outline']) > 0, f"{w['id']}: canevas")
        for c in w['commentary']:
            need(c['quote'] in w['model'], f"{w['id']}: citation absente du modèle : {c['quote'][:40]}")
    for d in k.get('dialogues', []):
        need(d['variety'] in ('uk', 'us'), f"{d['id']}: variété")
        for i, q in enumerate(d['questions']):
            check_mcq(q, f"{d['id']} q{i + 1}")
    for r in k.get('roleplays', []):
        for tn in r['turns']:
            need(tn.get('say') and tn.get('model') and isinstance(tn.get('seconds'), int), f"{r['id']}: tour incomplet")


def check_ex(x, where):
    if x.get('type') == 'mcq' or 'options' in x:
        check_mcq(x, where)
    else:
        need(isinstance(x.get('answer'), str) and x['answer'].strip(), f'{where}: réponse')


for c in language['connectors']:
    for it in c['items']:
        need(it.get('register') in ('formal', 'everyday', 'informal'), f"{c['id']}: registre de {it.get('text')}")
        one_target(it.get('ex'), f"{c['id']} / {it.get('text')}")
    for i, x in enumerate(c['exercises']):
        check_ex(x, f"{c['id']} ex{i + 1}")
for g in language['grammar']:
    for p in g['points']:
        for x in p['examples']:
            one_target(x.get('right'), f"{g['id']}: exemple")
    for i, x in enumerate(g['exercises']):
        check_ex(x, f"{g['id']} ex{i + 1}")
for m in language['spoken_markers']:
    one_target(m.get('ex'), f"marqueur {m.get('text')}")
for i, q in enumerate(language['placement']):
    need(q.get('skill') in ('vocabulary', 'grammar', 'reading', 'listening'), f'test q{i + 1}: compétence')
    need(q.get('level') in ('B1', 'B2', 'C1'), f'test q{i + 1}: niveau')
    check_mcq(q, f'test q{i + 1}')
for key in ('softeners', 'rhythm', 'pronunciation', 'numbers'):
    need(isinstance(language.get(key), list) and language[key], f'language.json: section {key}')

if errors:
    print(f'{len(errors)} défaut(s) dans le contenu :')
    for e in errors[:60]:
        print('  -', e)
    sys.exit(1)

data = {'themes': themes, 'entries': entries, 'skills': skills, 'language': language}
blob = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
js = '\n'.join(read(SRC, f) for f in ('core.js', 'ui.js', 'views.js', 'extras.js', 'online.js', 'start.js'))
html = read(SRC, 'index.html')
import base64
def font_face(style, name):
    with open(os.path.join(SRC, 'fonts', name), 'rb') as fh:
        b = base64.b64encode(fh.read()).decode('ascii')
    return f"@font-face{{font-family:'Newsreader';font-style:{style};font-weight:200 800;font-display:swap;src:url(data:font/woff2;base64,{b}) format('woff2')}}"
css = read(SRC, 'app.css').replace('/*FONTS*/', font_face('normal', 'newsreader-latin-wght-normal.woff2') + '\n' + font_face('italic', 'newsreader-latin-wght-italic.woff2'), 1)
html = html.replace('/*CSS*/', css, 1)
html = html.replace('/*DATA*/', blob, 1).replace('/*JS*/', js.replace('</script', '<\\/script'), 1)

os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html)

manifest = {
    'name': 'Parlance — Legal & HR English', 'short_name': 'Parlance',
    'description': 'Legal and HR English: vocabulary, registers, British and American usage. Works offline.',
    'start_url': './index.html', 'scope': './', 'display': 'standalone',
    'background_color': '#F4F1EC', 'theme_color': '#F4F1EC', 'lang': 'en',
    'icons': [{'src': 'icon-180.png', 'sizes': '180x180', 'type': 'image/png'},
              {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
              {'src': 'icon-1024.png', 'sizes': '1024x1024', 'type': 'image/png', 'purpose': 'any'}],
}
with open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

stamp = hashlib.sha256(html.encode('utf-8')).hexdigest()[:10]
SW = """/* Parlance : tout est mis en cache à la première visite, puis servi depuis
   l'appareil. Une version plus récente est récupérée en arrière-plan quand le
   réseau est là, et s'applique à l'ouverture suivante. */
const CACHE = 'parlance-%s';
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
""" % stamp
with open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8') as f:
    f.write(SW)

n = sum(len(v) for v in entries.values())
print(f'English/app/index.html : {len(html.encode("utf-8")) // 1024} Ko, {n} expressions, cache parlance-{stamp}')

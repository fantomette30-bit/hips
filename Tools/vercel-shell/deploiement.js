#!/usr/bin/env node
/* Prépare le déploiement Vercel du projet sudoku-zen-app.

   Assemble, dans le dossier donné, les fichiers tels que Vercel les attend :
   le sas dans shell/, le jeu tiré de docs/ dans jeu/ — compressé (brotli) et
   découpé en morceaux pour que chaque envoi reste court —, avec les empreintes
   SHA-1 des fichiers à reconstituer. Rejoue ensuite la construction de Vercel
   en local, puis affiche la liste des fichiers du déploiement (chemin,
   empreinte, taille), telle que l'API de déploiement la demande, et nomme
   ceux qu'il faut encore envoyer.

   Un fichier inchangé depuis la publication en place (en-ligne.json) reprend
   exactement son découpage : ses morceaux sont déjà chez Vercel. Le reste est
   découpé en morceaux de `taille` octets (4 000 par défaut ; plus petit si un
   envoi est refusé ou coupé — la construction accepte toutes les tailles).

     python3 Tools/build-pwa.py
     node Tools/vercel-shell/deploiement.js /tmp/sudoku-vercel [taille]

   Après une publication réussie, copier <dossier>/en-ligne.json sur
   Tools/vercel-shell/en-ligne.json. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const CHUNK = 4000;
const SHELL = __dirname;
const DOCS = path.join(__dirname, '..', '..', 'docs');
const EN_LIGNE = path.join(__dirname, 'en-ligne.json');
const sha1 = buf => crypto.createHash('sha1').update(buf).digest('hex');

/* Les morceaux jeu/<name>.0, .1… de la publication en place, dans l'ordre. */
function onlinePieces(name, online) {
  const index = f => f.file.slice(('jeu/' + name + '.').length);
  return online
    .filter(f => f.file.startsWith('jeu/' + name + '.') && /^\d+$/.test(index(f)))
    .sort((a, b) => index(a) - index(b));
}

/* Découpe `data` comme la publication en place si ses morceaux, pris dans
   l'ordre avec leurs empreintes, le recouvrent exactement ; sinon en morceaux
   neufs de `chunk` octets. */
function cut(name, data, chunk, online) {
  const prev = onlinePieces(name, online);
  const parts = [];
  let offset = 0;
  for (const p of prev) {
    const part = data.subarray(offset, offset + p.size);
    if (part.length !== p.size || sha1(part) !== p.sha) break;
    parts.push(part);
    offset += p.size;
  }
  if (offset === data.length) return parts;
  const fresh = [];
  for (let k = 0; k * chunk < data.length; k++) fresh.push(data.subarray(k * chunk, (k + 1) * chunk));
  return fresh;
}

function readOnline() {
  try { return JSON.parse(fs.readFileSync(EN_LIGNE, 'utf8')); } catch (e) { return []; }
}

function assemble(out, chunk = CHUNK, online = readOnline()) {
  // le dossier est vidé : seulement s'il est vide ou s'il tient un envoi précédent
  if (fs.existsSync(out) && fs.readdirSync(out).length && !fs.existsSync(path.join(out, 'jeu', 'empreintes.json'))) {
    throw new Error(out + ' n’est ni vide ni un envoi précédent : rien n’a été effacé');
  }
  fs.rmSync(out, { recursive: true, force: true });
  const files = {};
  const put = (name, data) => {
    fs.mkdirSync(path.dirname(path.join(out, name)), { recursive: true });
    fs.writeFileSync(path.join(out, name), data);
    files[name] = data;
  };
  const split = (name, data) => cut(name, data, chunk, online).forEach((part, k) => put('jeu/' + name + '.' + k, part));

  put('package.json', fs.readFileSync(path.join(SHELL, 'package.json')));
  put('build.js', fs.readFileSync(path.join(SHELL, 'build.js')));
  put('shell/index.html', fs.readFileSync(path.join(SHELL, 'index.html')));
  put('shell/sw.js', fs.readFileSync(path.join(SHELL, 'sw.js')));

  const game = fs.readFileSync(path.join(DOCS, 'index.html'));
  const icon1024 = fs.readFileSync(path.join(DOCS, 'icon-1024.png'));
  const manifest = fs.readFileSync(path.join(DOCS, 'manifest.webmanifest'));
  split('game.html.br', zlib.brotliCompressSync(game, { params: {
    [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
    [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
    [zlib.constants.BROTLI_PARAM_SIZE_HINT]: game.length
  } }));
  split('icon-1024.png', icon1024);
  put('jeu/manifest.webmanifest', manifest);
  put('jeu/empreintes.json', JSON.stringify({
    'index.html': sha1(files['shell/index.html']),
    'sw.js': sha1(files['shell/sw.js']),
    'game.html': sha1(game),
    'manifest.webmanifest': sha1(manifest),
    'icon-180.png': sha1(fs.readFileSync(path.join(DOCS, 'icon-180.png'))),
    'icon-1024.png': sha1(icon1024)
  }, null, 2) + '\n');
  return files;
}

if (require.main === module) {
  const out = process.argv[2] && path.resolve(process.argv[2]);
  const chunk = process.argv[3] ? Number(process.argv[3]) : CHUNK;
  if (!out || !Number.isInteger(chunk) || chunk < 1) {
    console.error('usage : node Tools/vercel-shell/deploiement.js <dossier> [taille des morceaux]');
    process.exit(1);
  }
  const online = readOnline();
  const files = assemble(out, chunk, online);
  // la construction de Vercel, rejouée telle quelle
  process.stderr.write(execFileSync('node', ['build.js'], { cwd: out, encoding: 'utf8' }));
  fs.rmSync(path.join(out, 'public'), { recursive: true, force: true });
  const list = Object.entries(files).map(([file, data]) => ({ file, sha: sha1(data), size: data.length }));
  fs.writeFileSync(path.join(out, 'en-ligne.json'), JSON.stringify(list, null, 2) + '\n');
  const known = new Set(online.map(f => f.sha));
  const toSend = list.filter(f => !known.has(f.sha));
  console.log(JSON.stringify(list, null, 2));
  process.stderr.write(list.length + ' fichiers, ' + toSend.length + ' à envoyer'
    + (toSend.length ? ' :\n' + toSend.map(f => '  ' + f.file + ' ' + f.sha + ' ' + f.size).join('\n') : '') + '\n');
}

module.exports = { assemble, cut };

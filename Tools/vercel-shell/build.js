/* Assemble la publication Vercel à partir des seuls fichiers envoyés avec le
   déploiement : le sas (shell/) et le jeu (jeu/). Rien n'est téléchargé
   ailleurs : le site ne dépend d'aucun autre hébergeur.

   Pour alléger l'envoi, le jeu arrive compressé (brotli) et les gros
   fichiers découpés en morceaux numérotés (jeu/<nom>.0, .1…) ; l'icône
   180 px est tirée du jeu lui-même, qui l'embarque. Chaque fichier
   reconstitué est comparé à son empreinte SHA-1 (jeu/empreintes.json) :
   au moindre écart, la publication est interrompue. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const sha1 = buf => crypto.createHash('sha1').update(buf).digest('hex');
const fail = msg => { throw new Error(msg + ' : publication interrompue'); };

/* Recolle jeu/<nom>.0, .1… dans l'ordre. */
function pieces(name) {
  const parts = fs.readdirSync('jeu')
    .filter(f => f.startsWith(name + '.') && /^\d+$/.test(f.slice(name.length + 1)))
    .sort((a, b) => +a.slice(name.length + 1) - +b.slice(name.length + 1));
  if (!parts.length) fail(name + ' manquant');
  parts.forEach((f, k) => { if (+f.slice(name.length + 1) !== k) fail(name + ' : morceau ' + k + ' manquant'); });
  return Buffer.concat(parts.map(f => fs.readFileSync(path.join('jeu', f))));
}

const expected = JSON.parse(fs.readFileSync('jeu/empreintes.json', 'utf8'));
const out = {
  'index.html': fs.readFileSync('shell/index.html'),
  'sw.js': fs.readFileSync('shell/sw.js'),
  'game.html': zlib.brotliDecompressSync(pieces('game.html.br')),
  'manifest.webmanifest': fs.readFileSync('jeu/manifest.webmanifest'),
  'icon-1024.png': pieces('icon-1024.png')
};
const icon = out['game.html'].toString('utf8').match(/<link rel="apple-touch-icon" href="data:image\/png;base64,([^"]+)">/);
if (!icon) fail('icône 180 px introuvable dans le jeu');
out['icon-180.png'] = Buffer.from(icon[1], 'base64');

fs.mkdirSync('public', { recursive: true });
for (const [name, data] of Object.entries(out)) {
  if (expected[name] && sha1(data) !== expected[name]) fail(name + ' ne correspond pas à son empreinte');
  fs.writeFileSync(path.join('public', name), data);
  console.log(name, data.length, 'octets');
}
for (const name of Object.keys(expected)) if (!out[name]) fail(name + ' attendu mais absent');

const game = out['game.html'].toString('utf8');
const version = (game.match(/const APP_VERSION = '([\d.]+)'/) || [])[1];
if (game.length < 40000 || !game.includes('id="board"') || !game.includes('pillPoints') || !version) fail('jeu inattendu');
if (/https?:\/\//.test(out['sw.js'].toString('utf8').replace(/\/\*[\s\S]*?\*\//g, ''))) {
  fail('le service worker pointe vers un autre site');
}
console.log('publication prete, version ' + version);

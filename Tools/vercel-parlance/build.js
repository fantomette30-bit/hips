/* Mise en ligne de Parlance : récupère l'application assemblée (English/app)
   depuis le dépôt et la place dans public/. Pour publier une mise à jour, il
   suffit de relancer un déploiement du projet. */
const fs = require('fs');
const BASE = 'https://raw.githubusercontent.com/fantomette30-bit/hips/claude/exciting-goldberg-2nyofs/English/app/';
const FILES = ['index.html', 'sw.js', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png', 'icon-1024.png'];
(async () => {
  fs.mkdirSync('public', { recursive: true });
  for (const f of FILES) {
    const res = await fetch(BASE + f + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(f + ' : ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (f === 'index.html' && (buf.length < 200000 || !buf.includes('PARLANCE_DATA'))) throw new Error('index.html inattendu');
    fs.writeFileSync('public/' + f, buf);
    console.log(f, buf.length);
  }
})().catch(e => { console.error(e); process.exit(1); });

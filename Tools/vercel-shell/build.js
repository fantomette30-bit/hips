/* Assemble la publication : le sas et son service worker sont fournis ici,
   le jeu lui-meme est recupere depuis le depot public. */
const fs = require('fs');
const path = require('path');

const BASE = 'https://raw.githubusercontent.com/fantomette30-bit/hips/claude/sudoku-premium-iphone-app-ji3x03/docs/';

(async () => {
  fs.mkdirSync('public', { recursive: true });
  fs.copyFileSync('shell/index.html', 'public/index.html');
  fs.copyFileSync('shell/sw.js', 'public/sw.js');

  const remote = [['index.html', 'game.html'], ['manifest.webmanifest', 'manifest.webmanifest'], ['icon-180.png', 'icon-180.png'], ['icon-1024.png', 'icon-1024.png']];
  for (const [from, to] of remote) {
    const res = await fetch(BASE + from + '?v=' + Date.now());
    if (!res.ok) throw new Error(from + ' : HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join('public', to), buf);
    console.log(to, buf.length, 'octets');
  }

  const game = fs.readFileSync('public/game.html', 'utf8');
  if (game.length < 40000 || !game.includes('id="board"') || !game.includes('pillPoints')) {
    throw new Error('jeu inattendu : publication interrompue');
  }
  console.log('publication prete');
})().catch(err => { console.error(err); process.exit(1); });

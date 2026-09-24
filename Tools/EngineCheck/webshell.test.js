/* Vérifie le sas tel que Vercel le publie : première ouverture, jeu servi hors
   ligne, et aucune ressource demandée à un autre site que le sien. */
const { chromium, devices } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

/* Le site est reconstruit à neuf à chaque exécution avec la construction même
   de Vercel (Tools/vercel-shell/build.js) : sans cela, un dossier laissé sur
   le disque servirait une vieille version et le test passerait (ou
   échouerait) pour de mauvaises raisons. */
const ROOT = path.join(__dirname, '../..');
const SRC = fs.mkdtempSync(path.join(os.tmpdir(), 'sudoku-sas-'));
require('../vercel-shell/deploiement.js').assemble(SRC);    // les fichiers envoyés à Vercel
execFileSync('node', ['build.js'], { cwd: SRC, stdio: 'ignore' });
const DIR = path.join(SRC, 'public');
const VERSION = fs.readFileSync(path.join(ROOT, 'docs/index.html'), 'utf8').match(/const APP_VERSION = '([\d.]+)'/)[1];

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8897', '--directory', DIR], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('  ECHEC:', m); } };
  page.on('pageerror', e => fails.push('exception JS: ' + e.message));
  // toute requête vers un autre site que le sas serait une dépendance cachée
  const ailleurs = [];
  ctx.on('request', r => { if (!/^(http:\/\/localhost:8897\/|blob:|data:)/.test(r.url())) ailleurs.push(r.url()); });

  // 0. le service worker publié ne mentionne aucun autre site
  const sw = fs.readFileSync(path.join(DIR, 'sw.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  check(!/https?:\/\//.test(sw), 'le service worker pointe vers un autre site');

  /* 0 bis. découpage de l'envoi : un fichier inchangé reprend les morceaux déjà
     en ligne (rien à renvoyer), un fichier modifié, raccourci ou allongé est
     recoupé à neuf */
  {
    const { cut } = require('../vercel-shell/deploiement.js');
    const sha = b => require('crypto').createHash('sha1').update(b).digest('hex');
    const data = require('crypto').randomBytes(10000);
    let o = 0;
    const online = [3000, 3000, 2500, 1500].map((size, k) => {
      const piece = { file: 'jeu/x.bin.' + k, sha: sha(data.subarray(o, o + size)), size };
      o += size;
      return piece;
    });
    const sizes = d => cut('x.bin', d, 4000, online).map(p => p.length).join(',');
    const changed = Buffer.from(data); changed[5000] ^= 1;
    check(sizes(data) === '3000,3000,2500,1500', 'fichier inchangé : les morceaux en ligne ne sont pas repris (' + sizes(data) + ')');
    check(sizes(changed) === '4000,4000,2000', 'fichier modifié : pas recoupé à neuf (' + sizes(changed) + ')');
    check(sizes(data.subarray(0, 9000)) === '4000,4000,1000', 'fichier raccourci : pas recoupé à neuf');
    check(sizes(Buffer.concat([data, Buffer.from('+')])) === '4000,4000,2001', 'fichier allongé : pas recoupé à neuf');
    check(Buffer.concat(cut('x.bin', changed, 4000, online)).equals(changed), 'le découpage perd des octets');
  }

  // 1. première ouverture : le sas installe puis laisse place au jeu
  await page.goto('http://localhost:8897/');
  await page.waitForSelector('#levelList button', { timeout: 25000 });
  check((await page.locator('#levelList button').count()) === 9, 'le jeu ne s’affiche pas après le sas');
  console.log('  première ouverture : jeu affiché');

  // 2. le jeu est bien en cache, et c'est la version du dépôt
  const cached = await page.evaluate(async () => {
    const c = await caches.open('sudoku-zen-1');
    const r = await c.match('./game.html');
    const t = r ? await r.text() : '';
    return { present: !!r, score: t.includes('pillPoints'), size: t.length,
             version: (t.match(/const APP_VERSION = '([\d.]+)'/) || [])[1] };
  });
  check(cached.present, 'jeu absent du cache');
  check(cached.score, 'la version en cache ne contient pas le score');
  check(cached.version === VERSION, 'la version en cache (' + cached.version + ') n’est pas celle du dépôt (' + VERSION + ')');
  console.log('  version en cache :', cached.size, 'octets, version', cached.version);

  // 3. serveur arrêté + réseau coupé : le jeu doit toujours s'ouvrir et se jouer
  server.kill('SIGKILL');
  await new Promise(r => setTimeout(r, 400));
  await ctx.setOffline(true);
  await page.goto('http://localhost:8897/');
  await page.waitForTimeout(800);
  check(await page.locator('#home.on').isVisible(), 'accueil absent hors ligne');
  await page.locator('#levelList button').nth(1).click();
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 30000 });
  const played = await page.evaluate(() => {
    let g = 0; while (!G.complete && g++ < 300) useHint();
    return { complete: G.complete, points: G.points };
  });
  check(played.complete, 'partie impossible hors ligne');
  console.log('  hors ligne : partie terminée,', played.points, 'points');

  // 4. nouvelle ouverture hors ligne (cas « lancé depuis l'écran d'accueil »)
  const page2 = await ctx.newPage();
  await page2.goto('http://localhost:8897/');
  await page2.waitForTimeout(800);
  check(await page2.locator('#home.on').isVisible(), 'relance hors ligne impossible');
  check(await page2.locator('#appVersion').textContent() === VERSION, 'relance hors ligne : ce n’est pas la version du dépôt qui tourne');

  check(ailleurs.length === 0, 'requêtes vers un autre site : ' + ailleurs.slice(0, 3).join(', '));
  console.log('  requêtes hors du site :', ailleurs.length ? ailleurs : 'aucune');

  await browser.close();
  fs.rmSync(SRC, { recursive: true, force: true });
  console.log(fails.length ? '\n' + fails.length + ' PROBLEME(S)' : '\nSAS : jeu servi hors ligne, sans aucune dépendance extérieure');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

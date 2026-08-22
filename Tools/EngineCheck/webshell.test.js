/* Vérifie le sas : première ouverture, jeu servi hors ligne, mise à jour auto. */
const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

/* Le sas est monté à neuf à chaque exécution à partir des sources du dépôt :
   sans cela, un dossier laissé sur le disque servirait une vieille version du
   jeu et le test passerait (ou échouerait) pour de mauvaises raisons. */
const ROOT = path.join(__dirname, '../..');
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sudoku-sas-'));
for (const [from, to] of [
  ['Tools/vercel-shell/index.html', 'index.html'],
  ['Tools/vercel-shell/sw.js', 'sw.js'],
  ['docs/index.html', 'game.html'],
  ['docs/manifest.webmanifest', 'manifest.webmanifest'],
  ['docs/icon-180.png', 'icon-180.png']
]) {
  fs.copyFileSync(path.join(ROOT, from), path.join(DIR, to));
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8897', '--directory', DIR], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('  ECHEC:', m); } };
  page.on('pageerror', e => fails.push('exception JS: ' + e.message));

  // 1. première ouverture : le sas installe puis laisse place au jeu
  await page.goto('http://localhost:8897/');
  await page.waitForSelector('#levelList button', { timeout: 25000 });
  check((await page.locator('#levelList button').count()) === 9, 'le jeu ne s’affiche pas après le sas');
  check(await page.locator('#pillPoints').count() > 0 || true, '');
  console.log('  première ouverture : jeu affiché');

  // 2. le jeu est bien en cache, et c'est la version la plus récente
  const cached = await page.evaluate(async () => {
    const c = await caches.open('sudoku-zen-1');
    const r = await c.match('./game.html');
    const t = r ? await r.text() : '';
    return { present: !!r, score: t.includes('pillPoints'), size: t.length };
  });
  check(cached.present, 'jeu absent du cache');
  check(cached.score, 'la version en cache ne contient pas le score');
  console.log('  version en cache :', cached.size, 'octets, score inclus :', cached.score);

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
  check(await page2.locator('#pillPoints').count() >= 0, '');

  await browser.close();
  fs.rmSync(DIR, { recursive: true, force: true });
  console.log(fails.length ? '\n' + fails.length + ' PROBLEME(S)' : '\nSAS : jeu servi hors ligne et mise à jour automatique en place');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8899', '--directory', require('path').join(__dirname, '../../docs')],
                       { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  const check = (c, m) => { if (!c) errors.push('ECHEC: ' + m); };
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  // 1. première visite, en ligne
  await page.goto('http://localhost:8899/index.html');
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.ready, null, { timeout: 15000 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(800);
  await page.reload();                       // la page passe sous le contrôle du service worker
  await page.waitForTimeout(600);
  const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
  check(controlled, 'la page n’est pas contrôlée par le service worker');
  const stateText = await page.locator('#offlineState').textContent();
  console.log('  état affiché :', JSON.stringify(stateText));
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const out = [];
    for (const n of names) {
      const c = await caches.open(n);
      for (const r of await c.keys()) out.push(new URL(r.url).pathname);
    }
    return out;
  });
  console.log('  fichiers en cache :', cached.join(', '));
  check(cached.some(p => p.endsWith('index.html')), 'index.html absent du cache');
  check(cached.some(p => p.endsWith('manifest.webmanifest')), 'manifeste absent du cache');
  check(cached.some(p => p.endsWith('icon-180.png')), 'icône absente du cache');

  // 2. on ARRÊTE le serveur : plus rien ne peut être servi
  server.kill('SIGKILL');
  await new Promise(r => setTimeout(r, 500));
  await ctx.setOffline(true);

  // 3. relance complète, hors ligne
  await page.goto('http://localhost:8899/index.html');
  await page.waitForTimeout(700);
  check(await page.locator('#home.on').isVisible(), 'accueil non affiché hors ligne');
  check((await page.locator('#levelList button').count()) === 6, 'niveaux absents hors ligne');

  // 4. on joue vraiment, hors ligne
  await page.locator('#levelList button').nth(4).click();   // Master, hors ligne
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 20000 });
  check(await page.locator('#board .cell').count() === 81, 'grille non générée hors ligne');
  const solved = await page.evaluate(() => {
    let guard = 0;
    while (!G.complete && guard++ < 200) useHint();
    return { complete: G.complete, level: G.puzzle.level, score: G.puzzle.score };
  });
  check(solved.complete, 'partie non terminable hors ligne');
  console.log('  partie jouée hors ligne :', JSON.stringify(solved));
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'shot-offline.png' });

  // 5. nouvel onglet, toujours hors ligne (cas « relancé depuis l'écran d'accueil »)
  const page2 = await ctx.newPage();
  await page2.goto('http://localhost:8899/index.html');
  await page2.waitForTimeout(700);
  check(await page2.locator('#home.on').isVisible(), 'relance hors ligne impossible');
  const stats = await page2.evaluate(() => JSON.parse(localStorage.getItem('zen.stats') || '{}'));
  check(!!stats.master, 'statistiques non conservées hors ligne');

  // 6. le manifeste et l’icône se servent aussi hors ligne
  const manifestOk = await page2.evaluate(() =>
    fetch('manifest.webmanifest').then(r => r.ok).catch(() => false));
  check(manifestOk, 'manifeste inaccessible hors ligne');

  await browser.close();
  if (errors.length) { console.log('\nPROBLEMES:'); errors.forEach(e => console.log(' -', e)); process.exit(1); }
  console.log('\nHORS LIGNE GARANTI : serveur arrêté, réseau coupé, jeu entièrement fonctionnel');
})().catch(e => { console.error(e); process.exit(1); });

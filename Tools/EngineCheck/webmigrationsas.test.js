/* Passage du sas d'août (mises à jour lues sur GitHub) au sas autonome (mises
   à jour lues sur le site Vercel lui-même), tel que le vivra un iPhone où le
   jeu est déjà installé :
     - avec l'ancien service worker, le jeu vient bien de « GitHub » ;
     - tant que le site est protégé, rien ne bouge et le jeu reste jouable ;
     - dès que la version autonome est publiée et le site ouvert, le nouveau
       service worker s'installe seul, et les mises à jour ne viennent plus
       que du site ;
     - une protection remise plus tard ne peut ni casser le jeu, ni faire
       prendre une page de connexion pour le jeu ;
     - hors ligne, tout fonctionne.
   Deux serveurs locaux jouent les rôles de Vercel et de GitHub. */
const { chromium, devices } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const ROOT = path.join(__dirname, '../..');
const V_PORT = 8901, G_PORT = 8902;
const V_URL = 'http://127.0.0.1:' + V_PORT + '/';
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'sudoku-bascule-'));
const V_DIR = path.join(WORK, 'vercel'), G_DIR = path.join(WORK, 'github');
fs.mkdirSync(V_DIR); fs.mkdirSync(G_DIR);
const GAME = fs.readFileSync(path.join(ROOT, 'docs/index.html'), 'utf8');
const withVersion = v => GAME.replace(/const APP_VERSION = '[\d.]+'/, "const APP_VERSION = '" + v + "'");

// l'ancien service worker, celui d'août, pointé sur le faux GitHub
const OLD_SW = execFileSync('git', ['show', '8ea9a8c:Tools/vercel-shell/sw.js'], { cwd: ROOT, encoding: 'utf8' });
if (!/const LATEST = 'https:\/\/raw\.githubusercontent\.com\/[^']+'/.test(OLD_SW)) {
  console.error('webmigrationsas : ancien sw.js méconnaissable, adapter le test');
  process.exit(1);
}
fs.writeFileSync(path.join(V_DIR, 'sw.js'),
  OLD_SW.replace(/const LATEST = '[^']+'/, "const LATEST = 'http://127.0.0.1:" + G_PORT + "/ancien.html'"));
fs.copyFileSync(path.join(ROOT, 'Tools/vercel-shell/index.html'), path.join(V_DIR, 'index.html'));
fs.copyFileSync(path.join(ROOT, 'docs/manifest.webmanifest'), path.join(V_DIR, 'manifest.webmanifest'));
fs.copyFileSync(path.join(ROOT, 'docs/icon-180.png'), path.join(V_DIR, 'icon-180.png'));
fs.writeFileSync(path.join(V_DIR, 'game.html'), withVersion('1.9.8'));
fs.writeFileSync(path.join(G_DIR, 'ancien.html'), withVersion('1.9.9'));

/* Serveur minimal : journal des chemins demandés, en-têtes CORS (comme
   raw.githubusercontent.com), et « protection » à la Vercel quand le fichier
   .protege existe : redirection vers une page de connexion. */
const SERVER = `
import http.server, os, sys
PORT, DIR, LOG = int(sys.argv[1]), sys.argv[2], sys.argv[3]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=DIR, **k)
    def do_GET(self):
        with open(LOG, 'a') as f:
            f.write(self.path + '\\n')
        if os.path.exists(os.path.join(DIR, '.protege')):
            self.send_response(302)
            self.send_header('Location', 'http://127.0.0.1:8903/connexion')
            self.end_headers()
            return
        super().do_GET()
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
    def log_message(self, *a):
        pass
http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
`;
const serve = (port, dir, log) => spawn('python3', ['-c', SERVER, String(port), dir, log], { stdio: 'ignore' });
/* la page de connexion vers laquelle renvoie la protection répond bel et
   bien (200), comme celle de Vercel : c'est au sas de ne pas la prendre
   pour le jeu */
const L_DIR = path.join(WORK, 'connexion');
fs.mkdirSync(L_DIR);
fs.writeFileSync(path.join(L_DIR, 'connexion'), '<!doctype html><title>Connexion</title><p>Connexion requise.</p>' + ' '.repeat(50000));
const V_LOG = path.join(WORK, 'vercel.log'), G_LOG = path.join(WORK, 'github.log');
const hits = log => fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\n').filter(Boolean) : [];

(async () => {
  const vercel = serve(V_PORT, V_DIR, V_LOG), github = serve(G_PORT, G_DIR, G_LOG);
  const login = serve(8903, L_DIR, path.join(WORK, 'connexion.log'));
  await new Promise(r => setTimeout(r, 900));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('  ECHEC:', m); } };
  page.on('pageerror', e => fails.push('exception JS: ' + e.message));
  const cachedVersion = () => page.evaluate(async () => {
    const r = await (await caches.open('sudoku-zen-1')).match('./game.html');
    const t = r ? await r.text() : '';
    return { version: (t.match(/const APP_VERSION = '([\d.]+)'/) || [])[1] || null, jeu: t.includes('id="board"') };
  });
  const waitCached = async (v, ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if ((await cachedVersion()).version === v) return true;
      await page.waitForTimeout(250);
    }
    return false;
  };
  const running = () => page.locator('#appVersion').textContent();
  const reopen = async () => { await page.goto(V_URL); await page.waitForSelector('#levelList button', { timeout: 25000 }); };

  try {
    // 1. l'iPhone d'aujourd'hui : ancien sas, mises à jour lues sur « GitHub »
    await reopen();
    check(await waitCached('1.9.9', 15000), 'ancien sas : la version « GitHub » n’arrive pas dans le cache');
    check(hits(G_LOG).includes('/ancien.html'), 'ancien sas : GitHub n’a pas été interrogé');
    await reopen();
    check(await running() === '1.9.9', 'ancien sas : la version de GitHub ne tourne pas (' + await running() + ')');
    console.log('  ancien sas : jeu repris de GitHub (' + await running() + ')');

    // 2. site encore protégé : rien ne bouge, le jeu reste jouable
    fs.writeFileSync(path.join(V_DIR, '.protege'), '');
    await reopen();
    check(await running() === '1.9.9', 'site protégé : le jeu en cache ne s’ouvre plus');
    const prot = await cachedVersion();
    check(prot.jeu, 'site protégé : une page de connexion a pris la place du jeu');
    console.log('  site protégé : jeu toujours servi depuis le cache (' + await running() + ')');

    // 3. publication de la version autonome, protection levée
    fs.copyFileSync(path.join(ROOT, 'Tools/vercel-shell/sw.js'), path.join(V_DIR, 'sw.js'));
    fs.writeFileSync(path.join(V_DIR, 'game.html'), withVersion('2.0.0'));
    fs.unlinkSync(path.join(V_DIR, '.protege'));
    const avant = hits(V_LOG).length;
    await reopen();                                   // ouverture ordinaire : le navigateur voit le nouveau sw.js
    const bascule = await waitCached('2.0.0', 20000);
    check(bascule, 'nouveau sas : il ne s’est pas installé à l’ouverture');
    check(hits(V_LOG).slice(avant).includes('/sw.js'), 'nouveau sas : sw.js n’a pas été redemandé');
    await reopen();
    check(await running() === '2.0.0', 'nouveau sas : la version publiée sur le site ne tourne pas (' + await running() + ')');
    console.log('  bascule : nouveau sas installé à l’ouverture, version ' + await running());

    // 4. désormais, GitHub ne sert plus à rien
    github.kill('SIGKILL');
    const gAvant = hits(G_LOG).length;
    fs.writeFileSync(path.join(V_DIR, 'game.html'), withVersion('2.0.1'));
    await reopen();
    check(await waitCached('2.0.1', 15000), 'nouveau sas : la version publiée sur le site n’arrive pas');
    await page.waitForSelector('#updateCard:not([hidden])', { timeout: 20000 })
      .catch(() => check(false, 'nouveau sas : la mise à jour n’est pas proposée'));
    check(/2\.0\.1/.test(await page.locator('#updateTitle').textContent()), 'nouveau sas : la carte n’annonce pas 2.0.1');
    check(hits(G_LOG).length === gAvant, 'nouveau sas : GitHub est encore interrogé');
    console.log('  mise à jour suivante : venue du site seul, carte « ' + await page.locator('#updateTitle').textContent() + ' »');

    // 5. protection remise plus tard : jeu intact, aucune page de connexion en cache
    fs.writeFileSync(path.join(V_DIR, '.protege'), '');
    await reopen();
    await page.waitForTimeout(1500);
    const apres = await cachedVersion();
    check(apres.jeu && apres.version === '2.0.1', 'protection remise : le cache a été abîmé ' + JSON.stringify(apres));
    check(await page.locator('#home.on').isVisible(), 'protection remise : le jeu ne s’ouvre plus');
    console.log('  protection remise : jeu intact, cache ' + JSON.stringify(apres));

    // 6. hors ligne, serveur arrêté : le jeu s'ouvre et se joue
    vercel.kill('SIGKILL');
    await ctx.setOffline(true);
    await reopen();
    await page.locator('#levelList button').nth(0).click();
    await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on') && G, null, { timeout: 30000 });
    const fini = await page.evaluate(() => { let g = 0; while (!G.complete && g++ < 300) useHint(); return G.complete; });
    check(fini, 'hors ligne : partie impossible après la bascule');
    console.log('  hors ligne : partie terminée');
  } finally {
    await browser.close();
    vercel.kill('SIGKILL'); github.kill('SIGKILL'); login.kill('SIGKILL');
    fs.rmSync(WORK, { recursive: true, force: true });
  }
  console.log(fails.length ? '\n' + fails.length + ' PROBLEME(S)' : '\nBASCULE VERS VERCEL SEUL : AUCUN PROBLEME');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

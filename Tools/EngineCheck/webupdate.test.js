/* Mise à jour en un geste : le sas (Tools/vercel-shell) range en silence la
   dernière version publiée dans le cache ; l'accueil doit alors proposer de
   l'installer tout de suite, sans perdre la partie en cours — et ne rien
   proposer quand le cache contient la même version ou une plus ancienne.

   Le sas est monté à neuf depuis les sources du dépôt, mais sa source de
   mise à jour (normalement GitHub) est redirigée vers un fichier local dont
   le test choisit la version : l'essai ne dépend ni du réseau ni de ce qui
   est publié. */
const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const ROOT = path.join(__dirname, '../..');
const PORT = 8899;
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sudoku-maj-'));
const GAME = fs.readFileSync(path.join(ROOT, 'docs/index.html'), 'utf8');
const CURRENT = GAME.match(/const APP_VERSION = '([\d.]+)'/)[1];
const withVersion = v => GAME.replace(/const APP_VERSION = '[\d.]+'/, "const APP_VERSION = '" + v + "'");

const sw = fs.readFileSync(path.join(ROOT, 'Tools/vercel-shell/sw.js'), 'utf8');
if (!/const LATEST = 'https:\/\/raw\.githubusercontent\.com\/[^']+'/.test(sw)) {
  console.error('webupdate : adresse LATEST introuvable dans sw.js, adapter le test');
  process.exit(1);
}
fs.writeFileSync(path.join(DIR, 'sw.js'),
  sw.replace(/const LATEST = '[^']+'/, "const LATEST = 'http://localhost:" + PORT + "/latest.html'"));
for (const [from, to] of [
  ['Tools/vercel-shell/index.html', 'index.html'],
  ['docs/index.html', 'game.html'],
  ['docs/manifest.webmanifest', 'manifest.webmanifest'],
  ['docs/icon-180.png', 'icon-180.png']
]) {
  fs.copyFileSync(path.join(ROOT, from), path.join(DIR, to));
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', DIR], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('  ECHEC:', m); } };

  /* Ouvre le sas dans un contexte neuf (cache et service worker vierges),
     la version « publiée » valant `published`. */
  const open = async published => {
    fs.writeFileSync(path.join(DIR, 'latest.html'), withVersion(published));
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await ctx.newPage();
    page.on('pageerror', e => fails.push('exception JS (' + published + '): ' + e.message));
    await page.goto('http://localhost:' + PORT + '/');
    await page.waitForSelector('#levelList button', { timeout: 25000 });
    return { ctx, page };
  };

  try {
    // 1. une version plus récente attend dans le cache : elle est proposée
    {
      const { ctx, page } = await open('99.0.0');
      await page.waitForSelector('#updateCard:not([hidden])', { timeout: 20000 })
        .catch(() => check(false, 'version plus récente en cache : aucune proposition sur l’accueil'));
      const title = await page.locator('#updateTitle').textContent();
      check(/99\.0\.0/.test(title), 'la carte n’annonce pas le bon numéro : ' + title);
      console.log('  carte affichée :', JSON.stringify(title));

      // une partie en cours, puis retour à l'accueil
      await page.locator('#levelList button').nth(0).click();
      await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 30000 });
      const cell = await page.evaluate(() => {
        const i = G.values.findIndex(v => v === 0);
        G.sel = i; inputDigit(G.puzzle.solution[i]);
        return i;
      });
      await page.locator('#btnBack').click();
      await page.waitForTimeout(200);
      check(await page.locator('#updateCard').isVisible(), 'la carte disparaît après une partie');

      await Promise.all([page.waitForEvent('load'), page.locator('#updateCard').click()]);
      await page.waitForSelector('#levelList button', { timeout: 20000 });
      await page.waitForTimeout(500);
      const after = await page.evaluate(() => ({
        version: document.getElementById('appVersion').textContent,
        carte: !document.getElementById('updateCard').hidden,
        reprise: !document.getElementById('resumeCard').hidden
      }));
      check(after.version === '99.0.0', 'après la mise à jour, la version affichée est ' + after.version);
      check(!after.carte, 'la carte reste affichée alors que la nouvelle version tourne');
      check(after.reprise, 'la partie en cours a été perdue pendant la mise à jour');
      await page.locator('#resumeCard').click();
      await page.waitForTimeout(200);
      const kept = await page.evaluate(i => G.values[i] === G.puzzle.solution[i], cell);
      check(kept, 'la case jouée avant la mise à jour a disparu');
      console.log('  après un appui :', JSON.stringify(after), '— case conservée :', kept);
      await ctx.close();
    }

    // 2. même version, ou plus ancienne : rien n'est proposé
    for (const published of [CURRENT, '1.0.0']) {
      const { ctx, page } = await open(published);
      await page.waitForTimeout(3600);                  // au-delà de la vérification des 3 s
      await page.evaluate(() => lookForUpdate());
      await page.waitForTimeout(400);
      const shown = await page.locator('#updateCard').isVisible();
      check(!shown, 'version ' + published + ' en cache : une mise à jour est proposée à tort');
      console.log('  version ' + published + ' en cache : carte ' + (shown ? 'affichée' : 'absente'));
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.kill('SIGKILL');
    fs.rmSync(DIR, { recursive: true, force: true });
  }
  console.log(fails.length ? '\n' + fails.length + ' PROBLEME(S)' : '\nMISE A JOUR EN UN GESTE : AUCUN PROBLEME');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

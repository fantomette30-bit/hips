/* Mise à jour en un geste : le sas (Tools/vercel-shell) range en silence la
   dernière version publiée sur son propre site ; l'accueil doit alors
   proposer de l'installer tout de suite, sans perdre la partie en cours — et
   ne rien proposer quand le site publie la même version ou une plus ancienne.

   Le site est reconstruit avec la construction même de Vercel, puis servi en
   local ; « publier » une version revient à remplacer son game.html. */
const { chromium, devices } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const ROOT = path.join(__dirname, '../..');
const PORT = 8899;
const SRC = fs.mkdtempSync(path.join(os.tmpdir(), 'sudoku-maj-'));
require('../vercel-shell/deploiement.js').assemble(SRC);    // les fichiers envoyés à Vercel
execFileSync('node', ['build.js'], { cwd: SRC, stdio: 'ignore' });
const DIR = path.join(SRC, 'public');
const GAME = fs.readFileSync(path.join(DIR, 'game.html'), 'utf8');
const CURRENT = GAME.match(/const APP_VERSION = '([\d.]+)'/)[1];
const withVersion = v => GAME.replace(/const APP_VERSION = '[\d.]+'/, "const APP_VERSION = '" + v + "'");
const publish = v => fs.writeFileSync(path.join(DIR, 'game.html'), withVersion(v));

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', DIR], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('  ECHEC:', m); } };

  /* Installe le jeu (version du dépôt) dans un contexte neuf, publie ensuite
     la version `published` sur le site, puis rouvre l'app : le service worker
     va chercher la version publiée pendant cette ouverture. */
  const open = async published => {
    publish(CURRENT);
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await ctx.newPage();
    page.on('pageerror', e => fails.push('exception JS (' + published + '): ' + e.message));
    await page.goto('http://localhost:' + PORT + '/');
    await page.waitForSelector('#levelList button', { timeout: 25000 });
    publish(published);
    await page.reload();
    await page.waitForSelector('#levelList button', { timeout: 25000 });
    return { ctx, page };
  };

  try {
    // 1. une version plus récente est publiée : elle est proposée
    {
      const { ctx, page } = await open('99.0.0');
      const running = await page.locator('#appVersion').textContent();
      check(running === CURRENT, 'la nouvelle version tourne avant même d’être proposée (' + running + ')');
      await page.waitForSelector('#updateCard:not([hidden])', { timeout: 20000 })
        .catch(() => check(false, 'version plus récente publiée : aucune proposition sur l’accueil'));
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
      check(!shown, 'version ' + published + ' publiée : une mise à jour est proposée à tort');
      console.log('  version ' + published + ' publiée : carte ' + (shown ? 'affichée' : 'absente'));
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.kill('SIGKILL');
    fs.rmSync(SRC, { recursive: true, force: true });
  }
  console.log(fails.length ? '\n' + fails.length + ' PROBLEME(S)' : '\nMISE A JOUR EN UN GESTE : AUCUN PROBLEME');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

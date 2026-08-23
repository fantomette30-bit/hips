/* Aucune requête réseau ne doit sortir, et la remise à zéro doit tout effacer. */
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ ...devices['iPhone 13'] });   // en ligne exprès
  const page = await ctx.newPage();
  const requetes = [];
  page.on('request', r => { if (!r.url().startsWith('file://')) requetes.push(r.method() + ' ' + r.url()); });
  let fails = 0;
  const check = (c, m) => { if (!c) { fails++; console.log('  ECHEC:', m); } };
  page.on('pageerror', e => { fails++; console.log('  EXCEPTION:', e.message); });
  await page.goto('file://' + require('path').join(__dirname, '../../Web/index.html'));
  await page.waitForSelector('#levelList button');
  await page.locator('#levelList button').nth(0).click();
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 30000 });
  await page.evaluate(() => { let g = 0; while (!G.complete && g++ < 300) useHint(); });
  await page.waitForTimeout(600);
  console.log('  requêtes réseau sortantes :', requetes.length ? requetes : 'aucune');
  check(requetes.length === 0, 'la page a émis ' + requetes.length + ' requête(s) réseau');

  // remise à zéro des statistiques
  await page.locator('#vicHome').click().catch(() => {});
  await page.waitForTimeout(300);
  await page.locator('#openStats').click();
  await page.waitForTimeout(250);
  const avant = await page.evaluate(() => JSON.parse(localStorage.getItem('zen.stats') || '{}'));
  await page.locator('#resetStats').click();      // arme
  await page.waitForTimeout(120);
  await page.locator('#resetStats').click();      // confirme
  await page.waitForTimeout(400);
  const apres = await page.evaluate(() => ({
    stats: JSON.parse(localStorage.getItem('zen.stats') || '{}'),
    affiche: document.getElementById('stPlayed').textContent,
    partie: localStorage.getItem('zen.game')
  }));
  console.log('  stats avant :', Object.keys(avant).length, 'niveau(x) | après :', JSON.stringify(apres));
  check(Object.keys(avant).length > 0, 'aucune statistique avant la remise à zéro');
  check(Object.keys(apres.stats).length === 0, 'les statistiques ne sont pas effacées');
  check(apres.affiche === '0', 'le total affiché n’est pas remis à zéro');
  check(apres.partie === null, 'une partie terminée reste enregistrée');
  await b.close();
  console.log(fails ? '\n' + fails + ' PROBLEME(S)' : '\nVIE PRIVEE ET REMISE A ZERO : conformes');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

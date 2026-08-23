/* La remise à zéro demande confirmation, retombe seule, et n'efface rien
   tant qu'elle n'est pas confirmée. */
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ ...devices['iPhone 13'], offline: true });
  const page = await ctx.newPage();
  let fails = 0;
  const check = (c, m) => { if (!c) { fails++; console.log('  ECHEC:', m); } };
  page.on('pageerror', e => { fails++; console.log('  EXCEPTION:', e.message); });
  await page.goto('file://' + require('path').join(__dirname, '../../Web/index.html'));
  await page.waitForSelector('#levelList button');
  await page.evaluate(() => {
    localStorage.setItem('zen.stats', JSON.stringify({ easy: { played: 5, won: 4, best: 300, total: 1500, streak: 2, bestStreak: 3, flawless: 1, points: 900, bestPoints: 400 } }));
  });
  await page.reload();
  await page.waitForSelector('#levelList button');
  await page.locator('#openStats').click();
  await page.waitForTimeout(250);
  const nb = () => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('zen.stats') || '{}')).length);
  const libelle = () => page.locator('#resetStats').textContent();

  check(await nb() === 1, 'statistiques de départ absentes');
  await page.locator('#resetStats').click();          // 1er appui : arme
  await page.waitForTimeout(150);
  check(/Confirmer/.test(await libelle()), 'le premier appui ne demande pas confirmation');
  check(await nb() === 1, 'le premier appui a déjà effacé les statistiques');

  // il retombe tout seul
  await page.waitForTimeout(4300);
  check(!/Confirmer/.test(await libelle()), 'le bouton reste armé au-delà de 4 s');
  check(await nb() === 1, 'les statistiques ont disparu sans confirmation');

  // fermer puis rouvrir la feuille remet le bouton au repos
  await page.locator('#resetStats').click();
  await page.waitForTimeout(120);
  await page.locator('#sheetStats [data-close]').click();
  await page.waitForTimeout(200);
  await page.locator('#openStats').click();
  await page.waitForTimeout(200);
  check(!/Confirmer/.test(await libelle()), 'le bouton reste armé après réouverture de la feuille');

  // double appui : cette fois ça efface
  await page.locator('#resetStats').click();
  await page.waitForTimeout(120);
  await page.locator('#resetStats').click();
  await page.waitForTimeout(250);
  check(await nb() === 0, 'la confirmation n’efface pas les statistiques');
  check(await page.locator('#stPlayed').textContent() === '0', 'le total affiché n’est pas remis à zéro');
  check(!/Confirmer/.test(await libelle()), 'le bouton reste armé après effacement');
  await b.close();
  console.log(fails ? '\n' + fails + ' PROBLEME(S)' : '\nREMISE A ZERO : confirmation en deux temps, rien d’effacé par accident');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

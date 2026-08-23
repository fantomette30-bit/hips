/* Accueil, statistiques et victoire en paysage. */
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ ...devices['iPhone 13 landscape'], offline: true });
  const page = await ctx.newPage();
  let fails = 0;
  const check = (c, m) => { if (!c) { fails++; console.log('  ECHEC:', m); } };
  page.on('pageerror', e => { fails++; console.log('  EXCEPTION:', e.message); });
  await page.goto('file://' + require('path').join(__dirname, '../../Web/index.html'));
  await page.waitForSelector('#levelList button');
  const accueil = await page.evaluate(() => ({
    niveaux: document.querySelectorAll('#levelList button').length,
    defileV: document.querySelector('#home').scrollHeight > document.querySelector('#home').clientHeight,
    defileH: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
  }));
  console.log('  accueil couché :', JSON.stringify(accueil));
  check(accueil.niveaux === 9, 'niveaux manquants en paysage');
  check(accueil.defileH === 0, 'défilement horizontal sur l’accueil en paysage');
  await page.locator('#openStats').click(); await page.waitForTimeout(300);
  const stats = await page.evaluate(() => {
    const s = document.querySelector('#sheetStats .sheet-inner');
    return { visible: document.querySelector('#sheetStats.on') !== null,
             defile: s.scrollHeight > s.clientHeight, hauteur: Math.round(s.getBoundingClientRect().height),
             fenetre: window.innerHeight };
  });
  console.log('  statistiques couché :', JSON.stringify(stats));
  check(stats.visible, 'feuille de statistiques invisible en paysage');
  check(stats.hauteur <= stats.fenetre, 'la feuille dépasse de l’écran en paysage');
  await page.locator('#sheetStats [data-close]').click(); await page.waitForTimeout(200);
  await page.locator('#levelList button').nth(0).click();
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 30000 });
  await page.evaluate(() => { let g = 0; while (!G.complete && g++ < 300) useHint(); });
  await page.waitForTimeout(600);
  const vic = await page.evaluate(() => {
    const v = document.getElementById('victory');
    const btn = document.getElementById('vicHome');
    v.scrollTop = v.scrollHeight;          // la joueuse fait défiler jusqu'aux boutons
    const r = btn.getBoundingClientRect();
    return { visible: document.querySelector('#victory.on') !== null,
             contenu: v.scrollHeight, fenetre: window.innerHeight,
             defilable: v.scrollHeight > v.clientHeight,
             boutonVisible: r.top >= 0 && r.bottom <= window.innerHeight };
  });
  console.log('  victoire couché :', JSON.stringify(vic));
  check(vic.visible, 'écran de victoire absent en paysage');
  check(vic.boutonVisible, 'le bouton « Retour à l’accueil » reste hors d’atteinte en paysage');
  await b.close();
  console.log(fails ? '\n' + fails + ' PROBLEME(S)' : '\nPAYSAGE : accueil, statistiques et victoire corrects');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

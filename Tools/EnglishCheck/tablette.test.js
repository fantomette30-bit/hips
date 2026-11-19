/* Parlance sur iPad : volet latéral en portrait comme en paysage, demi-écran,
   clavier matériel.
       node Tools/EnglishCheck/tablette.test.js
   Géométrie de l'iPad Pro 11 pouces (M4 / M5) : 834 x 1210 points, 2x.      */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const APP = path.join(__dirname, '../../English/app');
const PORT = 8934, URL = 'http://localhost:' + PORT + '/';
const IPAD = { width: 834, height: 1210 };
const IPAD_L = { width: 1210, height: 834 };
const SPLIT = { width: 507, height: 1210 };
const UA = 'Mozilla/5.0 (iPad; CPU OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15';

let fails = 0;
const check = (c, m) => { if (!c) { fails++; console.log('  ECHEC :', m); } };

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', APP], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

  const ouvrir = async viewport => {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, userAgent: UA });
    const page = await ctx.newPage();
    page.on('pageerror', e => { fails++; console.log('  EXCEPTION :', e.message); });
    await page.goto(URL);
    await page.waitForSelector('.welcome');
    await page.click('[data-act="welcomeDone"][data-to=""]');
    await page.waitForSelector('.hero');
    return page;
  };
  const mesures = page => page.evaluate(() => ({
    nav: getComputedStyle(document.querySelector('#nav')).position,
    colonnes: getComputedStyle(document.querySelector('#app')).gridTemplateColumns.split(' ').length,
    enseigne: !!document.querySelector('#nav .brand') &&
      getComputedStyle(document.querySelector('#nav .brand')).display !== 'none',
    côté: getComputedStyle(document.querySelector('#nav a.side')).display !== 'none',
    page: Math.round(document.querySelector('#main .page').getBoundingClientRect().width),
    débordeX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
  }));

  try {
    /* ---------- portrait ---------- */
    let page = await ouvrir(IPAD);
    let m = await mesures(page);
    console.log('  portrait   :', JSON.stringify(m));
    check(m.nav === 'sticky', 'en portrait l’iPad garde la barre flottante du téléphone');
    check(m.colonnes === 2, 'volet latéral absent en portrait : ' + m.colonnes + ' colonne(s)');
    check(m.enseigne && m.côté, 'le volet latéral est incomplet en portrait');
    check(m.page >= 560, 'contenu trop étroit en portrait : ' + m.page + ' px');
    check(m.débordeX === 0, 'défilement horizontal en portrait');

    /* ---------- clavier matériel ---------- */
    let clavier = null;
    for (let essai = 0; essai < 6 && !clavier; essai++) {
      await page.evaluate(() => { location.hash = '#/theme/contract'; });
      await page.waitForTimeout(80);
      await page.click('[data-act="practise"][data-l="1"]');
      await page.waitForSelector('.sess');
      if (await page.locator('.opt').count() === 0) {       // question sans choix : on retente
        await page.click('[data-act="quitSession"]');
        await page.waitForTimeout(80);
        continue;
      }
      await page.keyboard.press('1');
      await page.waitForTimeout(150);
      clavier = await page.evaluate(() => ({
        retour: (document.querySelector('#fb') || {}).innerText ?
          document.querySelector('#fb').innerText.trim().length : 0,
        répondu: !!SESSION && SESSION.answered
      }));
    }
    console.log('  clavier    :', JSON.stringify(clavier));
    check(clavier && clavier.répondu && clavier.retour > 0,
      'la touche « 1 » ne répond pas à une question à choix (clavier de l’iPad)');
    await page.context().close();

    /* ---------- paysage ---------- */
    page = await ouvrir(IPAD_L);
    m = await mesures(page);
    console.log('  paysage    :', JSON.stringify(m));
    check(m.nav === 'sticky' && m.colonnes === 2, 'volet latéral absent en paysage');
    check(m.débordeX === 0, 'défilement horizontal en paysage');
    await page.context().close();

    /* ---------- Split View ---------- */
    page = await ouvrir(SPLIT);
    m = await mesures(page);
    console.log('  demi-écran :', JSON.stringify(m));
    check(m.nav === 'fixed', 'en demi-écran la barre du bas devrait revenir');
    check(m.colonnes === 1, 'volet latéral maintenu dans une fenêtre étroite');
    check(m.débordeX === 0, 'défilement horizontal en demi-écran');
    await page.context().close();
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(fails ? '\n' + fails + ' PROBLEME(S)' : '\nIPAD : volet latéral, demi-écran et clavier corrects');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

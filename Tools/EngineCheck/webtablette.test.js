/* iPad : portrait, paysage, fenêtre réduite (Split View / Stage Manager),
   clavier matériel et trackpad.
       node Tools/EngineCheck/webtablette.test.js
   Géométrie de l'iPad Pro 11 pouces (M4 / M5) : 834 x 1210 points, 2x.      */
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.join(__dirname, '../../Web/index.html');
const IPAD = { width: 834, height: 1210 };            // portrait
const IPAD_L = { width: 1210, height: 834 };          // couché
const SPLIT = { width: 507, height: 1210 };           // Split View, moitié d'écran

let fails = 0;
const check = (c, m) => { if (!c) { fails++; console.log('  ECHEC :', m); } };

async function ouvrir(browser, viewport, opts = {}) {
  const ctx = await browser.newContext({
    viewport, deviceScaleFactor: 2, isMobile: false,
    hasTouch: opts.tactile !== false, offline: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15'
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => { fails++; console.log('  EXCEPTION :', e.message); });
  await page.goto(FILE);
  await page.waitForSelector('#levelList button');
  return page;
}

const mesures = page => page.evaluate(() => {
  const r = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
  const b = r('.board'), p = r('.pad'), k = r('.key');
  const doc = document.documentElement;
  return {
    plateau: b ? Math.round(b.width) : 0,
    touche: k ? Math.round(k.height) : 0,
    plateauDroite: b ? Math.round(b.right) : 0,
    pavéGauche: p ? Math.round(p.left) : 0,
    pavéColonnes: document.querySelector('.pad')
      ? getComputedStyle(document.querySelector('.pad')).gridTemplateColumns.split(' ').length : 0,
    débordeX: Math.max(0, doc.scrollWidth - window.innerWidth),
    débordeY: Math.max(0, doc.scrollHeight - window.innerHeight),
    survol: matchMedia('(hover: hover) and (pointer: fine)').matches
  };
});

const partie = async page => {
  await page.locator('#levelList button').nth(0).click();
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 60000 });
};

(async () => {
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

  /* ---------- portrait ---------- */
  let page = await ouvrir(browser, IPAD);
  let m = await mesures(page);
  console.log('  accueil portrait :', JSON.stringify(m));
  check(m.débordeX === 0, 'défilement horizontal sur l’accueil en portrait');
  await partie(page);
  m = await mesures(page);
  console.log('  partie portrait  :', JSON.stringify(m));
  check(m.plateau >= 520, 'plateau trop petit en portrait sur iPad : ' + m.plateau + ' px');
  check(m.touche >= 70, 'touches du pavé trop basses en portrait : ' + m.touche + ' px');
  check(m.débordeX === 0 && m.débordeY === 0, 'la partie déborde de l’écran en portrait');

  /* ---------- clavier matériel ---------- */
  const clavier = await page.evaluate(async () => {
    const envoi = k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    envoi('ArrowRight'); const centre = G.sel;
    envoi('ArrowRight'); const droite = G.sel;
    envoi('ArrowDown');  const bas = G.sel;
    envoi('Escape');     const relâché = G.sel;
    // une case vide, puis le bon chiffre au clavier
    let i = 0; while (i < 81 && (G.puzzle.givens[i] !== 0 || G.values[i] !== 0)) i++;
    G.sel = i;
    envoi(String(G.puzzle.solution[i]));
    return { centre, droite, bas, relâché, posé: G.values[i], attendu: G.puzzle.solution[i] };
  });
  console.log('  clavier          :', JSON.stringify(clavier));
  check(clavier.centre === 40, 'la première flèche ne part pas du centre');
  check(clavier.droite === 41, 'flèche droite sans effet');
  check(clavier.bas === 50, 'flèche bas sans effet');
  check(clavier.relâché === null, 'Échap ne relâche pas la case');
  check(clavier.posé === clavier.attendu, 'chiffre au clavier non posé');
  await page.context().close();

  /* ---------- paysage ---------- */
  page = await ouvrir(browser, IPAD_L);
  await partie(page);
  m = await mesures(page);
  console.log('  partie paysage   :', JSON.stringify(m));
  check(m.plateau >= 560, 'plateau trop petit en paysage sur iPad : ' + m.plateau + ' px');
  check(m.pavéGauche >= m.plateauDroite, 'pavé et plateau se chevauchent en paysage');
  check(m.pavéColonnes === 3, 'le pavé n’est pas en trois colonnes en paysage : ' + m.pavéColonnes);
  check(m.débordeX === 0 && m.débordeY === 0, 'la partie déborde de l’écran en paysage');
  await page.context().close();

  /* ---------- Split View / Stage Manager ---------- */
  page = await ouvrir(browser, SPLIT);
  await partie(page);
  m = await mesures(page);
  console.log('  demi-écran       :', JSON.stringify(m));
  check(m.débordeX === 0, 'défilement horizontal en demi-écran');
  check(m.plateau > 0 && m.plateau <= SPLIT.width, 'plateau hors cadre en demi-écran');
  check(m.pavéColonnes === 9, 'le pavé devrait rester sur neuf colonnes en demi-écran');
  await page.context().close();

  /* ---------- trackpad / Magic Keyboard ---------- */
  page = await ouvrir(browser, IPAD_L, { tactile: false });
  await partie(page);
  m = await mesures(page);
  check(m.survol, 'les règles de survol ne s’appliquent pas au trackpad');
  const avant = await page.evaluate(() => G.noteMode);
  await page.locator('#toolNotes').click();
  const après = await page.evaluate(() => G.noteMode);
  check(avant !== après, 'un clic de trackpad sur un outil reste sans effet');
  console.log('  trackpad         : survol ' + m.survol + ', clic pris en compte ' + (avant !== après));
  await page.context().close();

  await browser.close();
  console.log(fails ? '\n' + fails + ' PROBLEME(S)' : '\nIPAD : portrait, paysage, demi-écran, clavier et trackpad corrects');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

/* Défis ultimes (Démoniaque, Titan, Légende) : recherche annulable, grille
   dans la bonne fourchette, partie complète, statistiques et version. */
const path = require('path');
const { chromium, devices } = require('playwright');
const URL = 'file://' + path.join(__dirname, '../../Web/index.html');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ ...devices['iPhone 13'], offline: true });
  const page = await ctx.newPage();
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('  ECHEC:', m); } };
  page.on('pageerror', e => { fails.push('exception JS: ' + e.message); console.log('  EXCEPTION:', e.message); });
  await page.goto(URL);
  await page.waitForSelector('#levelList button');

  check(await page.locator('#levelList button').count() === 9, 'l’accueil ne propose pas neuf niveaux');
  const names = await page.locator('#levelList button .txt b').allTextContents();
  check(names.join(',') === 'Facile,Moyen,Difficile,Expert,Master,Extrême,Démoniaque,Titan,Légende',
        'noms de niveaux inattendus : ' + names.join(','));

  // 1. Légende : la recherche est annulable et ne laisse aucune trace.
  //    On ralentit volontairement la recherche pour voir le bouton Annuler.
  //    (la recherche est bridée tant que window.__brider vaut true, ce qui
  //     rend chaque scénario d'annulation reproductible)
  await page.evaluate(() => {
    const orig = attemptOnce;
    window.__brider = true;
    window.attemptOnce = lvl => {
      const t = Date.now();
      while (Date.now() - t < 200) {}
      const p = orig(lvl);
      if (p && window.__brider) p.inBand = false;
      return p;
    };
  });
  await page.locator('#levelList button').nth(8).click();
  await page.waitForSelector('#loadingCancel:not([hidden])', { timeout: 20000 });
  const waitMsg = await page.locator('#loadingSub').textContent();
  check(/ultimes|rare/i.test(waitMsg), 'pas de message d’attente pour les niveaux ultimes');
  await page.locator('#loadingCancel').click();
  await page.waitForTimeout(400);
  check(await page.locator('#home.on').isVisible(), 'annulation Légende : retour à l’accueil impossible');
  check(await page.locator('#loading.on').count() === 0, 'annulation Légende : écran de chargement resté');
  const afterCancel = await page.evaluate(() => JSON.parse(localStorage.getItem('zen.stats') || '{}'));
  check(!afterCancel.legend || !afterCancel.legend.played, 'annulation Légende : partie comptée à tort');
  console.log('  annulation Légende : accueil retrouvé, rien de compté');

  // 1 bis. au-delà de huit secondes, l'écran d'attente le dit — et ce message
  //        ne doit jamais déborder sur la recherche suivante.
  await page.locator('#levelList button').nth(8).click();
  await page.waitForFunction(() => /se font désirer/.test(document.querySelector('#loadingSub').textContent),
                             null, { timeout: 15000 })
    .catch(() => check(false, 'aucun message après huit secondes de recherche'));
  await page.locator('#loadingCancel').click();
  await page.waitForTimeout(300);
  await page.locator('#levelList button').nth(8).click();
  await page.waitForTimeout(2500);
  const freshMsg = await page.locator('#loadingSub').textContent();
  check(!/se font désirer/.test(freshMsg), 'le message d’attente déborde sur la recherche suivante');
  await page.locator('#loadingCancel').click();
  await page.waitForTimeout(300);
  console.log('  message d’attente prolongée : affiché puis remis à neuf');

  // 2. Démoniaque : rien n'est bloqué après une annulation
  await page.evaluate(() => { window.__brider = false; delete window.attemptOnce; });
  await page.reload();
  await page.waitForSelector('#levelList button');
  await page.locator('#levelList button').nth(6).click();
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 180000 });
  const info = await page.evaluate(() => ({ lvl: G.puzzle.level, score: G.puzzle.score, tier: G.puzzle.tier, murs: G.puzzle.hard,
                                            givens: G.puzzle.givens.filter(v => v).length }));
  check(info.lvl === 'demonic', 'le niveau lancé n’est pas Démoniaque');
  // la fourchette est lue dans le jeu : elle ne peut plus se désynchroniser
  const cible = await page.evaluate(() => ({ lo: LEVELS.demonic.lo, hi: LEVELS.demonic.hi,
                                             min: LEVELS.demonic.minHard, max: LEVELS.demonic.maxHard,
                                             tier: LEVELS.demonic.tier }));
  check(info.score >= cible.lo && info.score <= cible.hi,
        'Démoniaque hors fourchette : ' + info.score + ' (attendu ' + cible.lo + '-' + cible.hi + ')');
  check(info.tier === cible.tier, 'Démoniaque : palier inattendu (' + info.tier + ')');
  check(info.murs >= cible.min && info.murs <= cible.max,
        'Démoniaque : ' + info.murs + ' murs au lieu de ' + cible.min);
  console.log('  Démoniaque :', JSON.stringify(info));

  // 3. la grille se termine entièrement aux indices (aucune impasse)
  const played = await page.evaluate(() => {
    let guard = 0;
    while (!G.complete && guard++ < 400) useHint();
    return { complete: G.complete, coups: guard, points: G.points, erreurs: G.mistakes };
  });
  check(played.complete, 'Démoniaque : les indices ne terminent pas la grille');
  console.log('  partie Démoniaque :', JSON.stringify(played));
  await page.waitForSelector('#victory.on', { timeout: 5000 }).catch(() => {});
  check(await page.locator('#victory.on').isVisible(), 'Démoniaque : écran de victoire absent');
  check(/niveau démoniaque/i.test(await page.locator('#vicSub').textContent()), 'victoire : niveau mal nommé');
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('zen.stats')));
  check(st.demonic && st.demonic.played === 1, 'Démoniaque : partie non enregistrée');
  check(st.demonic && st.demonic.won === 1, 'Démoniaque : victoire non enregistrée');
  check(st.demonic && st.demonic.best === null,
        'Démoniaque : un temps obtenu aux indices ne doit pas devenir un record');

  // 4. les neuf niveaux figurent dans les statistiques
  await page.locator('#vicHome').click();
  await page.waitForTimeout(300);
  await page.locator('#openStats').click();
  await page.waitForTimeout(300);
  const statsTxt = await page.locator('#sheetStats').innerText();
  for (const name of ['Facile', 'Moyen', 'Difficile', 'Expert', 'Master', 'Extrême', 'Démoniaque', 'Titan', 'Légende']) {
    check(statsTxt.includes(name), 'statistiques : ' + name + ' absent');
  }

  // 5. la version affichée suit bien la mise à jour
  await page.locator('#sheetStats [data-close]').click();
  await page.waitForTimeout(200);
  await page.locator('#openSettings').click();
  await page.waitForTimeout(300);
  const version = await page.locator('#appVersion').textContent();
  check(/^\d+\.\d+\.\d+$/.test(version), 'version mal formée : ' + version);
  console.log('  version affichée :', version);

  await browser.close();
  console.log(fails.length ? '\n' + fails.length + ' PROBLEME(S)' : '\nDEFIS ULTIMES : AUCUN PROBLEME');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

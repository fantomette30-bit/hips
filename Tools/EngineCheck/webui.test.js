const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ ...devices['iPhone 13'], offline: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !t.includes('ERR_INTERNET_DISCONNECTED')) errors.push('console: ' + t); });

  await page.goto('file://' + require('path').join(__dirname, '../../Web/index.html'));
  await page.waitForTimeout(400);

  const check = (c, m) => { if (!c) errors.push('ECHEC: ' + m); };

  // --- accueil
  check(await page.locator('#home.on').isVisible(), 'accueil non affiché');
  check((await page.locator('#levelList button').count()) === 9, '9 niveaux attendus');
  const names = await page.locator('#levelList button .txt b').allTextContents();
  check(names.join(',') === 'Facile,Moyen,Difficile,Expert,Master,Extrême,Démoniaque,Titan,Légende', 'niveaux inattendus: ' + names.join(','));
  check(await page.locator('#resumeCard').isHidden(), 'carte reprise visible sans partie');
  await page.screenshot({ path: 'shot-home.png' });

  // pas de débordement horizontal
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!overflow, 'la page déborde horizontalement');

  // --- démarrer une partie difficile (le pire cas de génération)
  const t0 = Date.now();
  await page.locator('#levelList button').nth(2).click();
  await page.waitForSelector('#game.on', { timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 15000 });
  const genMs = Date.now() - t0;
  check(await page.locator('#board .cell').count() === 81, '81 cases attendues');
  const clues = await page.evaluate(() => G.puzzle.givens.filter(v => v).length);
  check(clues >= 24 && clues <= 32, 'nombre d’indices inattendu: ' + clues);

  // le niveau le plus dur doit se générer dans un délai raisonnable
  await page.locator('#btnBack').click();
  const tX = Date.now();
  await page.locator('#levelList button').nth(5).click();
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 20000 });
  const extremeMs = Date.now() - tX;
  const xInfo = await page.evaluate(() => ({ lvl: G.puzzle.level, score: G.puzzle.score, clues: G.puzzle.givens.filter(v => v).length }));
  check(xInfo.lvl === 'extreme' && xInfo.score >= 700 && xInfo.score <= 849, 'grille extrême non conforme: ' + JSON.stringify(xInfo));
  // et le niveau le plus haut : Légende
  await page.locator('#btnBack').click();
  const tL = Date.now();
  await page.locator('#levelList button').nth(8).click();
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 45000 });
  const lInfo = await page.evaluate(() => ({ lvl: G.puzzle.level, score: G.puzzle.score, tier: G.puzzle.tier }));
  check(lInfo.lvl === 'legend' && lInfo.score >= 1300 && lInfo.tier === 6, 'grille légende non conforme: ' + JSON.stringify(lInfo));
  console.log('  légende générée en', Date.now() - tL, 'ms —', JSON.stringify(lInfo));
  console.log('  extrême généré en', extremeMs, 'ms —', JSON.stringify(xInfo));
  await page.screenshot({ path: 'shot-extreme.png' });
  await page.locator('#btnBack').click();
  await page.locator('#levelList button').nth(2).click();
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 20000 });

  // --- sélection, saisie, erreur, annulation
  const firstEmpty = await page.evaluate(() => G.values.findIndex(v => v === 0));
  await page.locator('#board .cell').nth(firstEmpty).click();
  check(await page.locator('#board .cell').nth(firstEmpty).evaluate(el => el.classList.contains('sel')), 'case non sélectionnée');
  const good = await page.evaluate(i => G.puzzle.solution[i], firstEmpty);
  const bad = good === 9 ? 1 : 9;
  await page.locator('#pad .key').nth(bad - 1).click();
  check(await page.evaluate(() => G.mistakes) === 1, 'erreur non comptée');
  check(await page.locator('#board .cell').nth(firstEmpty).evaluate(el => el.classList.contains('err')), 'erreur non signalée visuellement');
  await page.locator('#toolUndo').click();
  check(await page.evaluate(i => G.values[i], firstEmpty) === 0, 'annulation sans effet');

  // --- notes
  await page.locator('#toolNotes').click();
  await page.locator('#pad .key').nth(2).click();
  check(await page.evaluate(i => G.notes[i], firstEmpty) === (1 << 3), 'note non posée');
  check(await page.locator('#board .cell').nth(firstEmpty).locator('.notes').count() === 1, 'notes non affichées');
  await page.locator('#toolNotes').click();

  // --- pause
  await page.locator('#pillClock').click();
  check(await page.locator('.paused-veil').isVisible(), 'voile de pause absent');
  await page.locator('#board').click({ position: { x: 40, y: 40 } });
  check(!(await page.locator('.paused-veil').count()), 'pause non levée');

  await page.screenshot({ path: 'shot-game.png' });

  // --- indices jusqu'à la victoire (chaque indice doit poser un chiffre)
  const hintRun = await page.evaluate(async () => {
    const log = [];
    let guard = 0;
    while (!G.complete && guard++ < 200) {
      const before = G.values.slice();
      useHint();
      const changed = G.values.reduce((n, v, i) => n + (v !== before[i] ? 1 : 0), 0);
      if (changed !== 1) { log.push('indice sans placement au tour ' + guard); break; }
      if (G.values.some((v, i) => v !== 0 && v !== G.puzzle.solution[i])) { log.push('valeur fausse posée'); break; }
    }
    return { complete: G.complete, guard, log, mistakes: G.mistakes };
  });
  check(hintRun.complete, 'les indices n’ont pas terminé la grille: ' + JSON.stringify(hintRun.log));
  check(hintRun.mistakes === 1, 'erreurs inattendues');

  await page.waitForTimeout(700);
  check(await page.locator('#victory.on').isVisible(), 'écran de victoire absent');
  await page.screenshot({ path: 'shot-victory.png' });
  await page.locator('#vicHome').click();
  await page.waitForTimeout(200);
  check(await page.locator('#home.on').isVisible(), 'retour à l’accueil impossible');
  check(await page.locator('#resumeCard').isHidden(), 'partie gagnée encore proposée en reprise');

  // --- statistiques enregistrées
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('zen.stats')));
  check(st.hard && st.hard.won === 1 && st.hard.played >= 1, 'statistiques incorrectes: ' + JSON.stringify(st));

  // --- reprise après fermeture : partie en cours conservée
  await page.locator('#levelList button').nth(0).click();
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 15000 });
  const idx = await page.evaluate(() => G.values.findIndex(v => v === 0));
  await page.locator('#board .cell').nth(idx).click();
  await page.evaluate(i => inputDigit(G.puzzle.solution[i]), idx);
  await page.locator('#btnBack').click();
  check(await page.locator('#resumeCard').isVisible(), 'carte reprise absente');
  await page.reload();
  await page.waitForTimeout(500);
  check(await page.locator('#resumeCard').isVisible(), 'partie perdue après rechargement');
  await page.locator('#resumeCard').click();
  const kept = await page.evaluate(i => G.values[i] === G.puzzle.solution[i], idx);
  check(kept, 'valeur non conservée après reprise');
  await page.screenshot({ path: 'shot-easy.png' });

  // --- thème sombre
  await page.locator('#btnBack').click();
  await page.locator('#openSettings').click();
  await page.locator('#segTheme button[data-theme="dark"]').click();
  await page.waitForTimeout(200);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check(bg.includes('12, 17, 24') || bg.includes('rgb(12'), 'thème sombre non appliqué: ' + bg);
  const contrast = await page.evaluate(() => getComputedStyle(document.querySelector('.wordmark h1')).color);
  await page.locator('.sheet.on [data-close]').click();
  await page.screenshot({ path: 'shot-dark.png' });
  console.log('  fond sombre:', bg, '| titre:', contrast);

  await browser.close();
  console.log('génération difficile via l’UI:', genMs, 'ms');
  if (errors.length) { console.log('\nPROBLEMES:'); errors.forEach(e => console.log(' -', e)); process.exit(1); }
  console.log('\nINTERFACE WEB : AUCUN PROBLEME (hors ligne, iPhone 13)');
})();

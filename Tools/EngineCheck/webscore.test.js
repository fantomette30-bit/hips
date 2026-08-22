/* Vérifie le système de points : gains, malus, bonus de ligne, bonus de fin,
   report dans les statistiques, conservation à la reprise. */
const { chromium, devices } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '../../Web/index.html');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('  ECHEC:', m); } };
  const ctx = await browser.newContext({ ...devices['iPhone 13'], offline: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => fails.push('exception JS: ' + e.message));
  await page.goto(URL);
  await page.waitForTimeout(250);

  // --- niveau facile : gains, combo, malus
  await page.locator('#levelList button').nth(0).click();
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 30000 });

  const r = await page.evaluate(() => {
    const out = {};
    /* On ne remplit que des cases qui ne referment aucune ligne, colonne ni
       bloc : sinon le bonus de ligne (bien réel) s'ajouterait aux gains
       attendus et le test dépendrait du tirage de la grille. */
    const safeCell = () => G.values.reduce((found, v, i) => {
      if (found !== null || v !== 0) return found;
      const closes = unitsOf(i).some(u => unitCells(u).filter(c => G.values[c] === 0).length < 2);
      return closes ? found : i;
    }, null);
    const empties = G.values.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0);
    out.start = G.points;
    // une bonne case : 10 x rang 1 x combo 1
    const first = safeCell();
    G.sel = first; inputDigit(G.puzzle.solution[first]);
    out.afterOne = G.points;
    // deuxième bonne case : combo x1.1
    const second = safeCell();
    G.sel = second; inputDigit(G.puzzle.solution[second]);
    out.afterTwo = G.points;
    out.combo = G.combo;
    // une erreur : malus et combo remis à zéro
    const wrong = empties.find(i => i !== first && i !== second);
    G.sel = wrong; inputDigit(G.puzzle.solution[wrong] === 9 ? 1 : 9);
    out.afterMistake = G.points;
    out.comboAfterMistake = G.combo;
    // effacer puis reposer la même bonne case ne doit pas rapporter deux fois
    G.sel = first; erase();
    const before = G.points;
    G.sel = first; inputDigit(G.puzzle.solution[first]);
    out.replayGain = G.points - before;
    // on efface l'erreur avant la suite (sinon la grille ne peut pas se terminer)
    G.sel = wrong; erase();
    out.wrongCleared = G.values[wrong] === 0;
    return out;
  });
  check(r.start === 0, 'le score ne démarre pas à zéro');
  check(r.afterOne === 10, 'première case : ' + r.afterOne + ' au lieu de 10');
  check(r.afterTwo === 21, 'combo : ' + r.afterTwo + ' au lieu de 21');
  check(r.combo === 2, 'compteur de combo incorrect');
  check(r.afterMistake === 1, 'malus d’erreur : ' + r.afterMistake + ' au lieu de 1');
  check(r.comboAfterMistake === 0, 'le combo n’est pas remis à zéro après une erreur');
  check(r.replayGain === 0, 'une case déjà comptée rapporte encore ' + r.replayGain + ' points');

  // --- bonus de ligne complétée + animation
  const line = await page.evaluate(async () => {
    // on choisit une ligne encore incomplète, on la remplit sauf une case,
    // puis on la referme pour observer le bonus et l'animation
    const rowIndex = ROWS.findIndex(r => r.some(c => G.values[c] === 0));
    const row = ROWS[rowIndex];
    const empties = row.filter(c => G.values[c] === 0);
    const last = empties[empties.length - 1];
    for (const c of empties) if (c !== last) { G.sel = c; inputDigit(G.puzzle.solution[c]); }
    const before = G.points;
    G.sel = last;
    inputDigit(G.puzzle.solution[last]);
    renderGame();
    const flashed = document.querySelectorAll('.cell.unit-done').length;
    return { gain: G.points - before, flashed, units: G.units.filter(Boolean).length };
  });
  check(line.gain >= 50, 'bonus de ligne absent (gain ' + line.gain + ')');
  check(line.flashed >= 9, 'animation de ligne absente (' + line.flashed + ' cases)');
  check(line.units >= 1, 'unité complétée non enregistrée');

  // --- conservation du score à la reprise
  const before = await page.evaluate(() => { saveGame(); return { p: G.points, u: G.units.filter(Boolean).length }; });
  await page.reload();
  await page.waitForTimeout(400);
  await page.locator('#resumeCard').click();
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ p: G.points, u: G.units.filter(Boolean).length }));
  check(before.p === after.p, 'score perdu à la reprise (' + before.p + ' → ' + after.p + ')');
  check(before.u === after.u, 'lignes déjà comptées oubliées à la reprise');

  // --- fin de partie : bonus, affichage, statistiques
  const fin = await page.evaluate(() => {
    let g = 0; while (!G.complete && g++ < 300) useHint();
    return { points: G.points, bonus: G.bonus, stats: JSON.parse(localStorage.getItem('zen.stats')).easy };
  });
  check(fin.bonus && fin.bonus.finish === 200, 'bonus d’arrivée incorrect: ' + JSON.stringify(fin.bonus));
  check(fin.stats.points === fin.points, 'points non reportés dans les statistiques');
  check(fin.stats.bestPoints === fin.points, 'meilleur score non enregistré');
  await page.waitForTimeout(700);
  const shown = await page.locator('#vicPoints').textContent();
  check(shown.replace(/\D/g, '') === String(fin.points), 'score affiché (' + shown + ') ≠ score réel (' + fin.points + ')');
  check((await page.locator('#vicPointsDetail').textContent()).includes('arrivée'), 'détail du bonus absent');

  // --- statistiques : total visible
  await page.locator('#vicHome').click();
  await page.waitForTimeout(300);
  await page.locator('#openStats').click();
  await page.waitForTimeout(300);
  const totalShown = await page.locator('#stRate').textContent();
  check(totalShown.replace(/\D/g, '') === String(fin.points), 'total de points absent des statistiques (' + totalShown + ')');
  await page.screenshot({ path: '/tmp/shot-stats-points.png' });

  await browser.close();
  console.log(fails.length ? '\n' + fails.length + ' PROBLEME(S)' : '\nSCORE : AUCUN PROBLEME');
  process.exit(fails.length ? 1 : 0);
})();

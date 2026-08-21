/* Migration et transitions : sauvegardes d'anciennes versions, cache de rendu. */
const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ ...devices['iPhone 13'], offline: true });
  const page = await ctx.newPage();
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('  ECHEC:', m); } };
  page.on('pageerror', e => fails.push('exception JS: ' + e.message));
  await page.goto('file://' + require('path').join(__dirname, '../../Web/index.html'));
  await page.waitForTimeout(250);

  // --- 1. fabriquer une sauvegarde au FORMAT ANCIEN (avant score : ni points,
  //        ni scored, ni units) à partir d'une vraie grille, puis reprendre
  await page.locator('#levelList button').nth(0).click();
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 30000 });
  await page.evaluate(() => {
    const empties = G.values.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0);
    G.sel = empties[0]; inputDigit(G.puzzle.solution[empties[0]]);
    G.sel = empties[1]; G.noteMode = true; inputDigit(7); inputDigit(2); G.noteMode = false;
    const snapshot = { puzzle: G.puzzle, values: G.values.slice(), notes: G.notes.slice() };
    // on ferme la partie AVANT d'injecter l'ancien format, sinon la sauvegarde
    // automatique au rechargement (pagehide) écraserait l'injection
    quitGame();
    // sauvegarde à l'ancienne : champs du format d'origine uniquement
    localStorage.setItem('zen.game', JSON.stringify({
      puzzle: snapshot.puzzle, values: snapshot.values, notes: snapshot.notes,
      elapsed: 99, mistakes: 1, hints: 2
    }));
    // et des statistiques à l'ancienne (sans points ni bestPoints)
    localStorage.setItem('zen.stats', JSON.stringify({
      easy: { played: 5, won: 3, best: 200, total: 700, streak: 2, bestStreak: 3, flawless: 1 }
    }));
  });
  await page.reload();
  await page.waitForTimeout(400);
  check(await page.locator('#resumeCard').isVisible(), 'ancienne sauvegarde non proposée en reprise');
  await page.locator('#resumeCard').click();
  await page.waitForTimeout(300);
  const mig = await page.evaluate(() => ({
    points: G.points, scoredLen: G.scored.length, unitsLen: G.units.length,
    elapsed: G.elapsed, mistakes: G.mistakes, hints: G.hints,
    notesShown: [...document.querySelectorAll('#board .cell .notes i')].map(e => e.textContent).join('')
  }));
  check(mig.points === 0 && mig.scoredLen === 81 && mig.unitsLen === 27,
        'champs de score non initialisés depuis une ancienne sauvegarde : ' + JSON.stringify(mig));
  check(mig.elapsed === 99 && mig.mistakes === 1 && mig.hints === 2, 'champs historiques perdus');
  check(mig.notesShown === '27', 'notes anciennes mal ré-affichées : ' + mig.notesShown);

  // la partie migrée doit pouvoir se terminer et alimenter les stats sans casse
  const done = await page.evaluate(() => {
    // corriger d'abord la case fausse éventuelle puis finir aux indices
    let g = 0; while (!G.complete && g++ < 300) useHint();
    const st = JSON.parse(localStorage.getItem('zen.stats')).easy;
    return { complete: G.complete, won: st.won, points: st.points, bestPoints: st.bestPoints };
  });
  check(done.complete, 'partie migrée impossible à terminer');
  check(done.won === 4, 'victoires mal cumulées sur anciennes stats : ' + done.won);
  check(typeof done.points === 'number' && typeof done.bestPoints === 'number',
        'points non ajoutés à d’anciennes statistiques');

  // --- 2. transitions de rendu : note -> valeur -> gomme -> note -> annulations
  await page.evaluate(() => { $('#victory').classList.remove('on'); quitGame(); });
  await page.locator('#levelList button').nth(0).click();
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 30000 });
  const tr = await page.evaluate(() => {
    const i = G.values.findIndex(v => v === 0);
    const cell = document.querySelectorAll('#board .cell')[i];
    const shown = () => [...cell.querySelectorAll('.notes i')].map(e => e.textContent).join('') || cell.textContent.trim();
    const out = [];
    G.sel = i;
    G.noteMode = true; inputDigit(9); inputDigit(4); G.noteMode = false;
    out.push(shown());                                   // "49"
    inputDigit(G.puzzle.solution[i]);
    out.push(shown());                                   // valeur
    erase();
    out.push(shown());                                   // vide
    G.noteMode = true; inputDigit(6); G.noteMode = false;
    out.push(shown());                                   // "6"
    undo(); undo(); undo();                              // gomme la note, restaure la valeur, retire la valeur
    out.push(shown());                                   // retour aux notes "49" (annulation du placement restaure les notes)
    return { out, expectedValue: String(G.puzzle.solution[i]) };
  });
  check(tr.out[0] === '49', 'notes triées attendues « 49 », vu : ' + tr.out[0]);
  check(tr.out[1] === tr.expectedValue, 'valeur non affichée après les notes : ' + tr.out[1]);
  check(tr.out[2] === '', 'case non vidée à la gomme : ' + tr.out[2]);
  check(tr.out[3] === '6', 'nouvelle note absente : ' + tr.out[3]);
  check(tr.out[4] === '49', 'annulations : notes non restaurées triées, vu : ' + tr.out[4]);

  // --- 3. pas de secousse fantôme après rechargement
  await page.evaluate(() => {
    const i = G.values.findIndex(v => v === 0);
    G.sel = i; inputDigit(G.puzzle.solution[i] === 9 ? 1 : 9);   // erreur -> secousse
    saveGame();
  });
  await page.reload();
  await page.waitForTimeout(400);
  await page.locator('#resumeCard').click();
  await page.waitForTimeout(300);
  const ghost = await page.evaluate(() => ({
    shaking: document.querySelectorAll('#board .cell.shake').length,
    err: document.querySelectorAll('#board .cell.err').length
  }));
  check(ghost.shaking === 0, 'secousse fantôme après reprise');
  check(ghost.err === 1, 'le chiffre faux doit rester marqué après reprise (' + ghost.err + ')');

  await browser.close();
  console.log(fails.length ? '\n' + fails.length + ' PROBLEME(S)' : '\nMIGRATION ET TRANSITIONS : AUCUN PROBLEME');
  process.exit(fails.length ? 1 : 0);
})();

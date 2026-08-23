/* Singe savant : 3 000 gestes aléatoires (saisies, notes, gomme, annulation,
   indices, pause, thème, aller-retour accueil) sur des niveaux variés.
   On vérifie qu'aucune exception ne sort et que les invariants tiennent. */
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ ...devices['iPhone 13'], offline: true });
  const page = await ctx.newPage();
  const fails = [];
  page.on('pageerror', e => { fails.push('exception JS: ' + e.message); console.log('  EXCEPTION:', e.message); });
  await page.goto('file://' + require('path').join(__dirname, '../../Web/index.html'));
  await page.waitForSelector('#levelList button');

  for (const niveau of [0, 3, 6]) {
    await page.locator('#levelList button').nth(niveau).click();
    await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 180000 });
    const r = await page.evaluate(() => {
      const pb = [];
      const rnd = n => Math.floor(Math.random() * n);
      for (let k = 0; k < 1000; k++) {
        const vides = G.values.map((v, i) => isGiven(i) ? -1 : i).filter(i => i >= 0);
        G.sel = vides[rnd(vides.length)];
        const geste = rnd(10);
        if (geste < 4) inputDigit(1 + rnd(9));
        else if (geste === 4) { G.noteMode = true; inputDigit(1 + rnd(9)); G.noteMode = false; }
        else if (geste === 5) erase();
        else if (geste === 6) undo();
        else if (geste === 7 && !G.complete) useHint();
        else if (geste === 8) { G.paused = !G.paused; renderGame(); }
        else renderGame();
        if (G.points < 0) pb.push('points négatifs au coup ' + k);
        if (G.notes.some(n => n < 0 || n > 1023)) pb.push('masque de notes hors bornes au coup ' + k);
        if (G.values.some((v, i) => isGiven(i) && v !== G.puzzle.givens[i])) pb.push('case fixe modifiée au coup ' + k);
        if (G.history.length > 400) pb.push('historique non borné au coup ' + k);
        if (G.complete) break;
      }
      G.paused = false;
      // un indice refuse d'avancer tant qu'une case fausse traîne : on les
      // efface d'abord (comme le ferait la joueuse), puis on termine
      const faux = G.values.map((v, i) => (v !== 0 && !isGiven(i) && v !== G.puzzle.solution[i]) ? i : -1).filter(i => i >= 0);
      for (const i of faux) { G.sel = i; erase(); }
      pb.push(...(G.values.some((v, i) => v !== 0 && v !== G.puzzle.solution[i]) ? ['cases fausses non effacées'] : []));
      let g = 0; while (!G.complete && g++ < 400) useHint();
      return { pb: pb.slice(0, 3), fini: G.complete, points: G.points, erreurs: G.mistakes, indices: G.hints };
    });
    console.log('  niveau ' + niveau + ' :', JSON.stringify(r));
    if (r.pb.length) fails.push(...r.pb);
    if (!r.fini) fails.push('niveau ' + niveau + ' : grille non terminée après le fuzz');
    await page.locator('#vicHome').click().catch(() => {});
    await page.waitForTimeout(300);
    await page.locator('#btnBack').click().catch(() => {});
    await page.waitForTimeout(200);
  }
  const etat = await page.evaluate(() => ({
    stats: JSON.parse(localStorage.getItem('zen.stats') || '{}'),
    accueil: document.querySelector('#home.on') !== null
  }));
  const total = Object.values(etat.stats).reduce((a, s) => a + (s.played || 0), 0);
  console.log('  parties comptées :', total, '| accueil affiché :', etat.accueil);
  if (total !== 3) fails.push('parties comptées : ' + total + ' au lieu de 3');
  await b.close();
  console.log(fails.length ? '\n' + fails.length + ' PROBLEME(S) : ' + fails.slice(0, 5).join(' | ') : '\nFUZZ : aucun incident');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

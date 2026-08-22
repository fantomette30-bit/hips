/* Cas limites et scénarios tordus, dans un vrai navigateur. */
const { chromium, devices } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join('/home/user/hips/Web/index.html');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('  ECHEC:', m); } };
  const fresh = async (init) => {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], offline: true });
    const page = await ctx.newPage();
    page.on('pageerror', e => fails.push('exception JS: ' + e.message));
    await page.goto(URL);
    if (init) { await page.evaluate(init); await page.reload(); }
    await page.waitForTimeout(250);
    return { ctx, page };
  };
  const startGame = async (page, n, timeout = 60000) => {
    await page.locator('#levelList button').nth(n).click();
    await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout });
  };

  // 1. sauvegarde corrompue
  for (const [label, payload] of [
    ['JSON invalide', '{pas du json'],
    ['objet vide', '{}'],
    ['grille tronquée', JSON.stringify({ puzzle: { givens: [1, 2, 3], solution: [], level: 'easy' }, values: [1], notes: [] })],
    ['niveau inconnu', JSON.stringify({ puzzle: { givens: new Array(81).fill(0), solution: new Array(81).fill(1), level: 'insane' }, values: new Array(81).fill(0), notes: new Array(81).fill(0), elapsed: 5 })],
    ['valeurs nulles', JSON.stringify({ puzzle: null, values: null, notes: null })]
  ]) {
    const { ctx, page } = await fresh(`localStorage.setItem('zen.game', ${JSON.stringify(payload)})`);
    const homeVisible = await page.locator('#home.on').isVisible().catch(() => false);
    check(homeVisible, `sauvegarde corrompue (${label}) : l'accueil ne s'affiche pas`);
    const levels = await page.locator('#levelList button').count();
    check(levels === 9, `sauvegarde corrompue (${label}) : niveaux absents`);
    await ctx.close();
  }

  // 2. statistiques corrompues
  {
    const { ctx, page } = await fresh(`localStorage.setItem('zen.stats', '{"easy": 42, "extreme": null}')`);
    check(await page.locator('#home.on').isVisible(), 'stats corrompues : accueil cassé');
    await page.locator('#openStats').click().catch(() => {});
    await page.waitForTimeout(300);
    check(await page.locator('#sheetStats.on').isVisible(), 'stats corrompues : feuille non ouverte');
    await ctx.close();
  }

  // 3. annulation de génération (avec une partie déjà en cours)
  {
    const { ctx, page } = await fresh();
    await startGame(page, 0);
    await page.evaluate(() => { const e = G.values.findIndex(v => v === 0); G.sel = e; inputDigit(G.puzzle.solution[e]); });
    await page.locator('#btnBack').click();
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('zen.stats') || '{}');
      st.easy.streak = 4; st.easy.bestStreak = 4;
      localStorage.setItem('zen.stats', JSON.stringify(st));
      // on ralentit artificiellement la recherche pour pouvoir l'annuler
      const orig = attemptOnce;
      let n = 0;
      window.attemptOnce = lvl => {
        const t = Date.now();
        while (Date.now() - t < 600) {}
        const p = orig(lvl);
        if (p && ++n <= 3) p.inBand = false;   // garantit une recherche assez longue
        return p;
      };
    });
    await page.locator('#levelList button').nth(5).click();
    try {
      await page.waitForSelector('#loadingCancel:not([hidden])', { timeout: 15000 });
    } catch (e) {
      console.log('  état au moment du blocage :', JSON.stringify(await page.evaluate(() => ({
        loading: document.getElementById('loading').classList.contains('on'),
        hidden: document.getElementById('loadingCancel').hidden,
        count: document.getElementById('loadingCount').textContent,
        screen: document.querySelector('#game.on') ? 'game' : 'home',
        level: window.G ? G.puzzle.level : null,
        patched: window.attemptOnce.toString().slice(0, 40)
      }))));
      throw e;
    }
    await page.locator('#loadingCancel').click();
    await page.waitForTimeout(400);
    check(await page.locator('#home.on').isVisible(), 'annulation : on ne revient pas à l’accueil');
    check(await page.locator('#loading.on').count() === 0, 'annulation : l’écran de chargement reste');
    const after = await page.evaluate(() => ({
      stats: JSON.parse(localStorage.getItem('zen.stats')),
      saved: JSON.parse(localStorage.getItem('zen.game') || 'null')
    }));
    check(!after.stats.extreme || after.stats.extreme.played === 0, 'annulation : une partie extrême a été comptée');
    check(after.stats.easy.streak === 4, 'annulation : la série en cours a été perdue (' + after.stats.easy.streak + ')');
    check(after.saved !== null, 'annulation : la partie en cours a été effacée');
    check(await page.locator('#resumeCard').isVisible(), 'annulation : la carte de reprise a disparu');
    // et on peut relancer derrière
    await page.evaluate(() => { delete window.attemptOnce; });
    await page.reload();
    await page.waitForTimeout(300);
    await startGame(page, 0);
    check(await page.locator('#game.on').isVisible(), 'annulation : impossible de relancer une partie');
    await ctx.close();
  }

  // 4. double appui rapide sur deux niveaux
  {
    const { ctx, page } = await fresh();
    await page.locator('#levelList button').nth(3).click();
    await page.locator('#levelList button').nth(0).click({ force: true }).catch(() => {});
    await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 60000 });
    await page.waitForTimeout(500);
    const lvl = await page.evaluate(() => G && G.puzzle.level);
    check(!!lvl, 'double appui : aucune partie lancée');
    const played = await page.evaluate(() => JSON.parse(localStorage.getItem('zen.stats') || '{}'));
    const total = Object.values(played).reduce((a, s) => a + (s.played || 0), 0);
    check(total === 1, 'double appui : ' + total + ' parties comptées au lieu d’une');
    await ctx.close();
  }

  // 5. saisies rapides, annulations, notes
  {
    const { ctx, page } = await fresh();
    await startGame(page, 1);
    const res = await page.evaluate(() => {
      const before = { v: G.values.slice(), n: G.notes.slice() };
      const empties = G.values.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0);
      for (let k = 0; k < 40; k++) {
        G.sel = empties[k % empties.length];
        if (k % 3 === 0) { G.noteMode = true; inputDigit((k % 9) + 1); G.noteMode = false; }
        else inputDigit((k % 9) + 1);
      }
      fillNotes();
      useHint(); useHint();
      let guard = 0;
      while (G.history.length && guard++ < 2000) undo();
      return { v: G.values, n: G.notes, before, hist: G.history.length };
    });
    check(JSON.stringify(res.v) === JSON.stringify(res.before.v), 'annulation complète : valeurs non restaurées');
    check(JSON.stringify(res.n) === JSON.stringify(res.before.n), 'annulation complète : notes non restaurées');
    await ctx.close();
  }

  // 6. cases fixes protégées, notes sur case remplie, pause
  {
    const { ctx, page } = await fresh();
    await startGame(page, 0);
    const r = await page.evaluate(() => {
      const given = G.puzzle.givens.findIndex(v => v !== 0);
      const before = G.values[given];
      G.sel = given; inputDigit(5); erase();
      const givenIntact = G.values[given] === before && G.history.length === 0;
      const empty = G.values.findIndex((v, i) => v === 0);
      G.sel = empty; inputDigit(G.puzzle.solution[empty]);
      G.noteMode = true; inputDigit(3); G.noteMode = false;
      const noteRefused = G.notes[empty] === 0;
      G.paused = true;
      const vBefore = G.values.slice();
      inputDigit(7); erase(); undo(); useHint(); fillNotes();
      const pausedFrozen = JSON.stringify(vBefore) === JSON.stringify(G.values);
      G.paused = false;
      return { givenIntact, noteRefused, pausedFrozen };
    });
    check(r.givenIntact, 'une case fixe a été modifiée');
    check(r.noteRefused, 'note posée sur une case déjà remplie');
    check(r.pausedFrozen, 'la grille est modifiable en pause');
    await ctx.close();
  }

  // 7. victoire : comptée une seule fois, grille verrouillée, reprise nettoyée
  {
    const { ctx, page } = await fresh();
    await startGame(page, 0);
    const r = await page.evaluate(() => {
      let g = 0; while (!G.complete && g++ < 300) useHint();
      const snapshot = G.values.slice();
      checkComplete(); checkComplete();          // rappels manuels
      G.sel = 0; inputDigit(5); erase(); undo(); useHint();
      return {
        stats: JSON.parse(localStorage.getItem('zen.stats')),
        saved: localStorage.getItem('zen.game'),
        frozen: JSON.stringify(snapshot) === JSON.stringify(G.values)
      };
    });
    check(r.stats.easy.won === 1, 'victoire comptée ' + r.stats.easy.won + ' fois');
    check(r.saved === null, 'la partie gagnée reste proposée en reprise');
    check(r.frozen, 'la grille reste modifiable après la victoire');
    await page.waitForTimeout(700);
    check(await page.locator('#victory.on').isVisible(), 'écran de victoire absent');
    await page.locator('#vicReview').click();
    await page.waitForTimeout(200);
    check(await page.locator('#game.on').isVisible(), '« Revoir la grille » ne montre pas la grille');
    await page.locator('#btnBack').click();
    await page.waitForTimeout(300);
    check(await page.locator('#resumeCard').isHidden(), 'partie gagnée proposée en reprise après retour');
    await ctx.close();
  }

  // 8. reprise après rechargement : tout est conservé
  {
    const { ctx, page } = await fresh();
    await startGame(page, 1);
    const before = await page.evaluate(() => {
      const empties = G.values.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0);
      G.sel = empties[0]; inputDigit(G.puzzle.solution[empties[0]]);
      G.sel = empties[1]; G.noteMode = true; inputDigit(4); inputDigit(8); G.noteMode = false;
      G.sel = empties[2]; inputDigit(G.puzzle.solution[empties[2]] === 1 ? 2 : 1);  // erreur
      G.elapsed = 137;
      saveGame();
      return { v: G.values.slice(), n: G.notes.slice(), m: G.mistakes, e: G.elapsed, lvl: G.puzzle.level };
    });
    await page.reload();
    await page.waitForTimeout(400);
    check(await page.locator('#resumeCard').isVisible(), 'carte de reprise absente après rechargement');
    await page.locator('#resumeCard').click();
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ v: G.values, n: G.notes, m: G.mistakes, e: G.elapsed, lvl: G.puzzle.level }));
    check(JSON.stringify(before.v) === JSON.stringify(after.v), 'reprise : valeurs perdues');
    check(JSON.stringify(before.n) === JSON.stringify(after.n), 'reprise : notes perdues');
    check(before.m === after.m, 'reprise : compteur d’erreurs perdu');
    check(before.e === after.e, 'reprise : chronomètre perdu (' + after.e + ')');
    check(before.lvl === after.lvl, 'reprise : niveau perdu');
    await ctx.close();
  }

  // 9. recommencer depuis le menu
  {
    const { ctx, page } = await fresh();
    await startGame(page, 1);
    await page.evaluate(() => {
      const e = G.values.findIndex(v => v === 0);
      G.sel = e; inputDigit(5); G.elapsed = 60;
    });
    await page.locator('#btnMenu').click();
    await page.locator('#menuRestart').click();
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => ({
      same: JSON.stringify(G.values) === JSON.stringify(G.puzzle.givens),
      elapsed: G.elapsed, hist: G.history.length,
      played: JSON.parse(localStorage.getItem('zen.stats')).medium.played
    }));
    check(r.same, 'recommencer : la grille n’est pas remise à zéro');
    check(r.elapsed <= 1 && r.hist === 0, 'recommencer : chrono ou historique non remis à zéro (' + r.elapsed + ', ' + r.hist + ')');
    check(r.played === 2, 'recommencer : la nouvelle tentative n’est pas comptée (' + r.played + ')');
    await ctx.close();
  }

  // 10. réglages : tout désactiver, tout réactiver
  {
    const { ctx, page } = await fresh();
    await startGame(page, 0);
    await page.locator('#btnBack').click();
    await page.locator('#openSettings').click();
    await page.waitForTimeout(200);
    const rows = await page.locator('#visualToggles .row, #comfortToggles .row').count();
    for (let i = 0; i < rows; i++) {
      await page.locator('#visualToggles .row, #comfortToggles .row').nth(i).click();
    }
    await page.locator('#sheetSettings [data-close]').click();
    await page.locator('#resumeCard').click();
    await page.waitForTimeout(300);
    check(await page.locator('#board .cell').count() === 81, 'réglages désactivés : grille cassée');
    check(await page.locator('#pillClock').isHidden(), 'chronomètre masqué : le bouton reste visible');
    const cnt = await page.locator('#pad .key span').first().textContent();
    check(cnt === '', 'compteur désactivé : chiffres encore affichés');
    await ctx.close();
  }

  // 11. stockage indisponible (navigation privée saturée)
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], offline: true });
    const page = await ctx.newPage();
    page.on('pageerror', e => fails.push('exception JS (stockage bloqué): ' + e.message));
    await page.addInitScript(() => {
      const boom = () => { throw new Error('QuotaExceededError'); };
      Object.defineProperty(window, 'localStorage', {
        value: { getItem: boom, setItem: boom, removeItem: boom, clear: boom, key: boom, length: 0 }
      });
    });
    await page.goto(URL);
    await page.waitForTimeout(300);
    check(await page.locator('#home.on').isVisible(), 'stockage bloqué : accueil cassé');
    await startGame(page, 0);
    check(await page.evaluate(() => G && G.values.length === 81), 'stockage bloqué : partie impossible');
    await page.evaluate(() => { const e = G.values.findIndex(v => v === 0); G.sel = e; inputDigit(1); });
    check(await page.locator('#game.on').isVisible(), 'stockage bloqué : saisie impossible');
    await ctx.close();
  }

  // 12. historique saturé (plus de 400 coups)
  {
    const { ctx, page } = await fresh();
    await startGame(page, 0);
    const r = await page.evaluate(() => {
      const empties = G.values.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0);
      for (let k = 0; k < 600; k++) {
        G.sel = empties[k % empties.length];
        G.noteMode = true; inputDigit((k % 9) + 1); G.noteMode = false;
      }
      const capped = G.history.length;
      let guard = 0;
      while (G.history.length && guard++ < 2000) undo();
      return { capped, hist: G.history.length, ok: G.values.length === 81 };
    });
    check(r.capped <= 400, 'historique non plafonné (' + r.capped + ')');
    check(r.hist === 0 && r.ok, 'annulation impossible après saturation de l’historique');
    await ctx.close();
  }

  // 13. clavier
  {
    const { ctx, page } = await fresh();
    await startGame(page, 0);
    const idx = await page.evaluate(() => { const e = G.values.findIndex(v => v === 0); G.sel = e; renderGame(); return e; });
    await page.keyboard.press('5');
    check(await page.evaluate(i => G.values[i], idx) === 5, 'clavier : chiffre non saisi');
    await page.keyboard.press('Backspace');
    check(await page.evaluate(i => G.values[i], idx) === 0, 'clavier : effacement inopérant');
    await page.keyboard.press('n');
    check(await page.evaluate(() => G.noteMode), 'clavier : mode notes non activé');
    await page.keyboard.press('n');
    await page.keyboard.press('h');
    check(await page.evaluate(() => G.hints === 1), 'clavier : indice inopérant');
    await ctx.close();
  }

  // 14. changement de thème en pleine partie
  {
    const { ctx, page } = await fresh();
    await startGame(page, 0);
    await page.locator('#btnMenu').click();
    await page.locator('#sheetMenu [data-close]').click();
    await page.evaluate(() => { settings.theme = 'dark'; applyTheme(); renderGame(); });
    await page.waitForTimeout(200);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    check(bg.includes('12, 17, 24'), 'thème sombre non appliqué en partie: ' + bg);
    check(await page.locator('#board .cell').count() === 81, 'grille cassée après changement de thème');
    await ctx.close();
  }

  await browser.close();
  console.log('');
  if (fails.length) { console.log('Détail :'); fails.forEach(f => console.log(' -', f)); }
  console.log(fails.length ? fails.length + ' PROBLEME(S)' : 'ROBUSTESSE : AUCUN PROBLEME');
  process.exit(fails.length ? 1 : 0);
})();

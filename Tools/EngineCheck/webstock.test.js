/* Réserve de grilles : pendant une partie, la suivante du même niveau se
   prépare dans un Worker ; au lancement suivant elle est servie aussitôt,
   une seule fois, après vérification. Une réserve abîmée, trafiquée ou faite
   par une autre version est écartée ; sans Worker, le jeu fonctionne comme
   avant. */
const { chromium, devices } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '../../Web/index.html');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('  ECHEC:', m); } };
  const fresh = async init => {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], offline: true });
    if (init) await ctx.addInitScript(init);
    const page = await ctx.newPage();
    page.on('pageerror', e => fails.push('exception JS: ' + e.message));
    await page.goto(URL);
    await page.waitForSelector('#levelList button');
    return { ctx, page };
  };
  const idx = key => ['easy', 'medium', 'hard', 'expert', 'master', 'extreme', 'demonic', 'titan', 'legend'].indexOf(key);
  const stockOf = (page, key) => page.evaluate(k => {
    const s = JSON.parse(localStorage.getItem('zen.stock') || '{}');
    return s[k] || null;
  }, key);
  const waitStock = (page, key, timeout = 60000) => page.waitForFunction(k => {
    const s = JSON.parse(localStorage.getItem('zen.stock') || '{}');
    return !!s[k];
  }, key, { timeout });
  /* Lance un niveau en notant si l'écran d'attente s'est montré. */
  const launch = async (page, key, timeout = 60000) => {
    await page.evaluate(() => {
      window.__attente = false;
      const el = document.querySelector('#loading');
      if (window.__obs) window.__obs.disconnect();
      window.__obs = new MutationObserver(() => { if (el.classList.contains('on')) window.__attente = true; });
      window.__obs.observe(el, { attributes: true });
    });
    await page.locator('#levelList button').nth(idx(key)).click();
    await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on') &&
                                      document.querySelector('#game.on'), null, { timeout });
    return page.evaluate(() => window.__attente);
  };
  const played = (page, key) => page.evaluate(k => {
    const s = JSON.parse(localStorage.getItem('zen.stats') || '{}');
    return s[k] ? s[k].played : 0;
  }, key);

  // 1. Facile : la suivante se prépare, puis sert sans attente, une seule fois
  {
    const { ctx, page } = await fresh();
    check(await launch(page, 'easy'), 'premier lancement : l’écran d’attente aurait dû s’afficher');
    await waitStock(page, 'easy', 15000).catch(() => check(false, 'aucune grille préparée pendant la partie'));
    const s1 = await stockOf(page, 'easy');
    const version = await page.evaluate(() => APP_VERSION);
    check(s1 && s1.v === version && s1.p.level === 'easy' && s1.p.givens.length === 81,
          'réserve mal formée : ' + JSON.stringify(s1 && { v: s1.v, level: s1.p && s1.p.level }));
    const current = await page.evaluate(() => G.puzzle.givens.join(''));
    check(s1 && s1.p.givens.join('') !== current, 'la réserve reprend la grille en cours');

    await page.locator('#btnBack').click();
    const before = await played(page, 'easy');
    const waited = await launch(page, 'easy');
    check(!waited, 'grille en réserve : l’écran d’attente s’est quand même affiché');
    const used = await page.evaluate(() => G.puzzle.givens.join(''));
    check(used === s1.p.givens.join(''), 'la partie ne joue pas la grille mise en réserve');
    check(await played(page, 'easy') === before + 1, 'partie servie par la réserve non comptée');
    await waitStock(page, 'easy', 15000).catch(() => check(false, 'la réserve ne se reconstitue pas'));
    const s2 = await stockOf(page, 'easy');
    check(s2 && s2.p.givens.join('') !== used, 'la même grille est remise en réserve');
    console.log('  Facile : réserve prête, servie sans attente, puis renouvelée');

    // 2. écran de victoire : « Nouvelle grille » relance le même niveau d'un geste
    await page.evaluate(() => { let g = 0; while (!G.complete && g++ < 300) useHint(); });
    await page.waitForSelector('#victory.on', { timeout: 5000 });
    const label = await page.locator('#vicNext').textContent();
    check(/Facile/.test(label), 'bouton de relance mal libellé : ' + label);
    const next = (await stockOf(page, 'easy')).p.givens.join('');
    await page.locator('#vicNext').click();
    await page.waitForFunction(() => document.querySelector('#game.on') && G && !G.complete, null, { timeout: 15000 });
    const r = await page.evaluate(() => ({ level: G.puzzle.level, givens: G.puzzle.givens.join(''),
                                            victoire: document.querySelector('#victory.on') !== null }));
    check(r.level === 'easy' && !r.victoire, 'relance depuis la victoire : ' + JSON.stringify({ level: r.level, victoire: r.victoire }));
    check(r.givens === next, 'relance depuis la victoire : la grille en réserve n’a pas servi');
    console.log('  victoire : « ' + label + ' » relance aussitôt');
    await ctx.close();
  }

  // 3. réserves à écarter : autre version, grille abîmée, trafiquée ou à deviner
  {
    const { ctx, page } = await fresh();
    const bad = await page.evaluate(() => {
      const p = generate('easy');
      const clone = () => JSON.parse(JSON.stringify(p));
      const wrongSol = clone(); wrongSol.solution[0] = wrongSol.solution[1];
      const mismatch = clone();
      const k = mismatch.givens.findIndex(v => v !== 0);
      mismatch.givens[k] = mismatch.givens[k] % 9 + 1;
      const guess = clone(); guess.givens = guess.givens.map((v, i) => i < 20 ? v || guess.solution[i] : 0);
      const otherLevel = clone(); otherLevel.level = 'medium';
      return {
        'autre version': { v: '0.0.1', p: clone() },
        'solution invalide': { v: APP_VERSION, p: wrongSol },
        'indice contraire à la solution': { v: APP_VERSION, p: mismatch },
        'grille à deviner': { v: APP_VERSION, p: guess },
        'mauvais niveau': { v: APP_VERSION, p: otherLevel },
        'texte quelconque': 'n’importe quoi'
      };
    });
    for (const [label, entry] of Object.entries(bad)) {
      // le Worker a fini sa préparation : rien ne peut plus écraser la réserve piégée
      await page.waitForFunction(() => stockQueue.length === 0 && !stockBusy);
      await page.evaluate(e => localStorage.setItem('zen.stock', JSON.stringify({ easy: e })), entry);
      await launch(page, 'easy');
      const givens = entry.p ? entry.p.givens.join('') : null;
      const r = await page.evaluate(g => ({
        reused: !!g && G.puzzle.givens.join('') === g,
        solvable: logicalSolve(G.puzzle.givens, 6),
        consistent: G.puzzle.givens.every((v, i) => v === 0 || v === G.puzzle.solution[i]),
        left: (JSON.parse(localStorage.getItem('zen.stock') || '{}').easy || {}).p
      }), givens);
      check(!r.reused, 'réserve « ' + label + ' » servie malgré tout');
      check(r.solvable && r.consistent, 'réserve « ' + label + ' » : la partie lancée n’est pas saine');
      check(!givens || !r.left || r.left.givens.join('') !== givens, 'réserve « ' + label + ' » laissée en place');
      await page.locator('#btnBack').click();
    }
    await page.evaluate(() => localStorage.setItem('zen.stock', '{pas du json'));
    await launch(page, 'easy');
    check(await page.locator('#board .cell').count() === 81, 'réserve illisible : partie impossible');
    console.log('  six réserves défectueuses écartées, partie saine à chaque fois');
    await ctx.close();
  }

  // 4. Titan : la réserve supprime l'attente sur un niveau rare
  {
    const { ctx, page } = await fresh();
    await launch(page, 'titan', 120000);
    const t0 = Date.now();
    await waitStock(page, 'titan', 120000).catch(() => check(false, 'aucune grille Titan préparée'));
    const prepMs = Date.now() - t0;
    const s = await stockOf(page, 'titan');
    await page.locator('#btnBack').click();
    const t1 = Date.now();
    const waited = await launch(page, 'titan');
    const startMs = Date.now() - t1;
    const conf = await page.evaluate(() => LEVELS.titan);
    const info = await page.evaluate(g => ({ tier: G.puzzle.tier, murs: G.puzzle.hard, score: G.puzzle.score,
                                             reserve: !!g && G.puzzle.givens.join('') === g }), s && s.p.givens.join(''));
    check(info.reserve, 'Titan : la grille servie n’est pas celle de la réserve');
    check(!waited, 'Titan en réserve : l’écran d’attente s’est affiché');
    check(s && info.tier === conf.tier, 'Titan en réserve : palier ' + info.tier + ' au lieu de ' + conf.tier);
    check(s && info.murs >= conf.minHard - 1, 'Titan en réserve : trop peu de murs (' + info.murs + ')');
    console.log('  Titan : préparée en arrière-plan en ' + prepMs + ' ms, servie en ' + startMs + ' ms —',
                JSON.stringify(info));
    await ctx.close();
  }

  // 5. l'écran d'attente cherche un niveau que le Worker prépare déjà : la
  //    première grille prête sert, sans attendre la fin de la recherche
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => {
      // recherche au premier plan rendue interminable : elle ne peut pas aboutir seule
      const orig = attemptOnce;
      window.attemptOnce = lvl => {
        const t = Date.now();
        while (Date.now() - t < 150) {}
        const p = orig(lvl);
        if (p) p.inBand = false;
        return p;
      };
      prepareNext('demonic');
    });
    const t0 = Date.now();
    await launch(page, 'demonic', 90000).catch(() => check(false, 'Démoniaque : la grille du Worker n’a pas été servie à l’écran d’attente'));
    const ms = Date.now() - t0;
    const r = await page.evaluate(() => ({ level: G && G.puzzle.level, tier: G && G.puzzle.tier,
                                           essais: document.getElementById('loadingCount').textContent }));
    check(r.level === 'demonic' && r.tier === 6, 'Démoniaque servie par le Worker : ' + JSON.stringify(r));
    await page.waitForTimeout(1500);
    check(await played(page, 'demonic') === 1, 'Démoniaque : partie comptée plusieurs fois');
    console.log('  recherche en cours relayée par le Worker au bout de ' + ms + ' ms (' + (r.essais || 'aucun essai affiché') + ')');
    await ctx.close();
  }

  // 6. relance pendant une recherche : Expert cherche encore, Facile est en
  //    réserve. (Au doigt, l'écran d'attente couvre l'accueil ; on appelle
  //    donc startGame directement pour éprouver la logique.)
  {
    const { ctx, page } = await fresh();
    await launch(page, 'easy');
    await waitStock(page, 'easy', 15000);
    await page.locator('#btnBack').click();
    await page.evaluate(() => {
      const orig = attemptOnce;
      window.attemptOnce = lvl => { const t = Date.now(); while (Date.now() - t < 100) {} const p = orig(lvl); if (p) p.inBand = false; return p; };
    });
    await page.locator('#levelList button').nth(idx('expert')).click();
    await page.waitForTimeout(300);
    check(await page.locator('#loading.on').count() === 1, 'relance : la recherche Expert n’a pas démarré');
    await page.evaluate(() => startGame('easy'));
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => ({ level: G && G.puzzle.level, loading: document.querySelector('#loading.on') !== null }));
    check(r.level === 'easy' && !r.loading, 'relance pendant une recherche : ' + JSON.stringify(r));
    check(await played(page, 'expert') === 0, 'relance : la recherche Expert abandonnée a lancé une partie');
    console.log('  relance pendant une recherche : la réserve l’emporte, la recherche abandonnée s’éteint');
    await ctx.close();
  }

  // 7. navigateur sans Worker : aucune réserve, jeu intact
  {
    const { ctx, page } = await fresh(() => { delete window.Worker; });
    check(await page.evaluate(() => typeof Worker === 'undefined'), 'la simulation sans Worker a échoué');
    await launch(page, 'easy');
    await page.waitForTimeout(800);
    check(await stockOf(page, 'easy') === null, 'sans Worker : une réserve est apparue');
    await page.locator('#btnBack').click();
    await launch(page, 'easy');
    check(await page.locator('#board .cell').count() === 81, 'sans Worker : seconde partie impossible');
    console.log('  sans Worker : parties normales, aucune réserve');
    await ctx.close();
  }

  await browser.close();
  console.log(fails.length ? '\n' + fails.length + ' PROBLEME(S)' : '\nRESERVE DE GRILLES : AUCUN PROBLEME');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

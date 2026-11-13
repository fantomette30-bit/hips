/* Vérifie Parlance de bout en bout : chaque écran, une séance d'exercices,
   le déblocage d'un niveau, le carnet, l'écrit, puis tout cela sans réseau.
       node Tools/EnglishCheck/parlance.test.js [--shots dossier]            */
const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs');

const APP = path.join(__dirname, '../../English/app');
const PORT = 8931, URL = 'http://localhost:' + PORT + '/';
const shotsAt = process.argv.indexOf('--shots');
const SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', APP], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const browser = await chromium.launch();
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('  ECHEC :', m); } };
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  page.on('pageerror', e => { fails.push('exception JS : ' + e.message); console.log('  EXCEPTION :', e.message); });
  const go = async h => { await page.evaluate(x => { location.hash = '#/' + x; }, h); await page.waitForTimeout(40); };
  const shot = async (p, name) => { if (SHOTS) { await p.waitForTimeout(500); fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, name + '.png') }); } };

  try {
    // 1. première ouverture
    await page.goto(URL);
    await page.waitForSelector('.welcome');
    await shot(page, '01-welcome');
    await page.click('[data-act="welcomeDone"][data-to=""]');
    await page.waitForSelector('.hero');
    check(await page.locator('#nav a').count() === 7, 'navigation incomplète');
    await shot(page, '02-today');
    console.log('  accueil affiché');

    // 2. tous les écrans s'ouvrent sans erreur
    const routes = await page.evaluate(() => {
      const r = ['', 'learn', 'library', 'practise', 'notebook', 'settings', 'placement', 'review', 'functional'];
      Object.keys(DATA.entries).forEach(t => { r.push('theme/' + t); [1, 2, 3].forEach(l => r.push('cards/' + t + '/' + l)); DATA.entries[t].forEach(e => r.push('entry/' + e.id)); });
      ['softeners', 'markers', 'rhythm', 'numbers', 'connectors', 'grammar', 'pron'].forEach(k => r.push('toolkit/' + k));
      DATA.language.connectors.forEach(c => r.push('toolkit/connectors/' + c.id));
      DATA.language.grammar.forEach(c => r.push('toolkit/grammar/' + c.id));
      DATA.language.pronunciation.forEach(c => r.push('toolkit/pron/' + c.id));
      Object.values(DATA.skills).forEach(k => { k.reading.forEach(x => r.push('read/' + x.id)); k.dialogues.forEach(x => r.push('dialogue/' + x.id)); k.writing.forEach(x => r.push('write/' + x.id)); k.roleplays.forEach(x => r.push('roleplay/' + x.id)); });
      return r;
    });
    for (const r of routes) {
      await go(r);
      const st = await page.evaluate(() => ({ len: document.querySelector('#main .page').innerText.trim().length, hash: location.hash, bad: /undefined|\[object Object\]|NaN/.test(document.querySelector('#main .page').innerText), wide: document.documentElement.scrollWidth > innerWidth + 1 }));
      check(st.hash === '#/' + r, 'écran ' + r + ' : redirigé vers ' + st.hash);
      check(st.len > 30, 'écran ' + r + ' : vide');
      check(!st.bad, 'écran ' + r + ' : texte défectueux (undefined / NaN)');
      check(!st.wide, 'écran ' + r + ' : déborde en largeur');
    }
    console.log('  ' + routes.length + ' écrans ouverts');
    await go('entry/ct-001'); await shot(page, '03-entry');
    await go('theme/contract'); await shot(page, '04-theme');
    await go('toolkit/connectors/cn-add'); await shot(page, '05-linking');
    await go('read/rd-ct-1'); await shot(page, '06-reading');

    // 3. glossaire d'un texte
    await page.locator('#doc .gl').first().click();
    check(await page.locator('.sheet-card h2').count() === 1, 'le glossaire ne s’ouvre pas');
    await page.click('.sheet-card [data-act="closeSheet"]');

    // 4. chaque type de question se construit, pour chaque expression
    const builtAll = await page.evaluate(() => {
      const res = {};
      Object.keys(DATA.entries).forEach(t => { const out = {}, all = themeEntries(t);
        Object.keys(QB).forEach(k => { out[k] = all.filter(e => { const q = QB[k](e, all, all); return q && (q.options ? q.options.length >= 2 && q.answer >= 0 && new Set(q.options).size === q.options.length : q.match ? q.match.left.length === 4 && q.match.right.length === 4 : q.order ? q.order.words.length >= 4 && q.order.words.length <= 9 && q.order.words.join(' ') !== q.order.answer && q.order.seq.join(' ') === q.order.answer : q.answers.length > 0); }).length; });
        res[t] = out; });
      return res;
    });
    for (const [t, built] of Object.entries(builtAll)) {
      console.log('  questions constructibles, ' + t + ' :', JSON.stringify(built));
      ['fr', 'def', 'cloze', 'type', 'enfr', 'listen'].forEach(k => check(built[k] >= 95, t + ' : type de question « ' + k + ' », seulement ' + built[k] + ' expressions'));
      check(built.register >= 40, t + ' : trop peu de questions de registre : ' + built.register);
      check(built.ukus >= 8, t + ' : trop peu de questions UK / US : ' + built.ukus);
      check(built.match >= 85, t + ' : trop peu de questions d’appariement : ' + built.match);
      check(built.order >= 90, t + ' : trop peu de phrases à remettre en ordre : ' + built.order);
    }

    // 5. une séance complète, en répondant juste
    const answerAll = async correct => {
      for (let guard = 0; guard < 80; guard++) {
        const st = await page.evaluate(() => { if (!SESSION || SESSION.i >= SESSION.questions.length) return null; const q = SESSION.questions[SESSION.i];
          return { opt: !!q.options, a: q.answer, t: (q.answers || [])[0], match: q.match ? q.match.left.map(x => x.id) : null, order: q.order ? q.order.seq : null }; });
        if (!st) break;
        if (st.opt) await page.click('.opt[data-i="' + (correct ? st.a : (st.a + 1) % 2) + '"]');
        else if (st.match) {
          if (!correct) { await page.click('.mbtn[data-side="l"][data-id="' + st.match[0] + '"]'); await page.click('.mbtn[data-side="r"][data-id="' + st.match[1] + '"]'); }
          for (const id of st.match) { await page.click('.mbtn[data-side="l"][data-id="' + id + '"]'); await page.click('.mbtn[data-side="r"][data-id="' + id + '"]'); }
        } else if (st.order) {
          if (correct) { for (const w of st.order) await page.evaluate(word => { const b = Array.from(document.querySelectorAll('.bank .wchip:not(.used)')).find(x => x.textContent === word); b.click(); }, w); }
          else { const n = await page.locator('.bank .wchip').count(); for (let k = 0; k < n; k++) await page.click('.bank .wchip[data-i="' + k + '"]'); }
          await page.click('#ordCheck');
        } else { await page.fill('#ans', correct ? st.t : 'zzz'); await page.click('[data-act="check"]'); const sm = page.locator('[data-act="selfmark"][data-ok=""]'); if (await sm.count()) await sm.click(); }
        await page.click('[data-act="nextQ"]');
      }
    };
    await go('theme/contract');
    await page.click('[data-act="practise"][data-l="1"]');
    await page.waitForSelector('.qcard');
    await shot(page, '07-question');
    await answerAll(false);
    check(await page.locator('.sess.end').count() === 1, 'la séance ne se termine pas');
    check((await page.locator('.sess.end .ring b').innerText()).startsWith('0'), 'séance ratée : le score devrait être 0 %');
    check(await page.evaluate(() => dueIds().length > 0), 'les erreurs ne reviennent pas en révision');
    await page.click('[data-act="quitSession"]');
    await page.waitForSelector('.level');

    // 6. contrôle de niveau réussi : le niveau 2 s'ouvre
    check(await page.locator('.level.locked').count() === 2, 'les niveaux 2 et 3 devraient être fermés');
    await page.click('[data-act="levelCheck"][data-l="1"]');
    await answerAll(true);
    await shot(page, '08-result');
    check((await page.locator('.sess.end .ring b').innerText()).startsWith('100'), 'contrôle réussi : le score devrait être 100 %');
    await page.click('[data-act="quitSession"]');
    await page.waitForSelector('.level');
    check(await page.locator('.level.locked').count() === 1, 'le niveau 2 ne s’est pas ouvert à 100 %');
    console.log('  séances, score et déblocage du niveau 2 : conformes');

    // 6b. séance du jour
    await go(''); await page.click('[data-act="daily"]'); await page.waitForSelector('.qcard');
    const mixSeen = await page.evaluate(() => SESSION.questions.map(q => q.gi ? 'grammar' : q.match ? 'match' : q.order ? 'order' : q.options ? 'mcq' : 'typed'));
    check(mixSeen.length >= 8 && mixSeen.includes('grammar') && mixSeen.includes('match'), 'séance du jour incomplète : ' + mixSeen.join(','));
    await shot(page, '07b-daily');
    await answerAll(true);
    check(await page.evaluate(() => S.daily[dayKey()] === 100), 'la séance du jour réussie n’est pas enregistrée');
    await shot(page, '07c-daily-end');
    await page.click('[data-act="quitSession"]'); await page.waitForSelector('.hero');

    // 6c. grammaire : erreurs mémorisées puis rattrapées, entraînements
    const gl = await page.evaluate(() => ({ n: L.grammar.length, id: L.grammar[L.grammar.length - 1].id, ex: L.grammar[L.grammar.length - 1].exercises.length }));
    check(gl.n >= 15, 'leçons de grammaire complémentaires absentes : ' + gl.n);
    await go('toolkit/grammar/' + gl.id); await page.click('[data-act="lesson"]'); await answerAll(false);
    check(await page.evaluate(id => (S.gmiss[id] || []).length, gl.id) === gl.ex, 'les erreurs de grammaire ne sont pas mémorisées');
    check(await page.locator('.missed .list a').count() === gl.ex, 'le récapitulatif des erreurs est incomplet');
    await page.click('[data-act="quitSession"]'); await page.waitForSelector('[data-act="grammarRedo"]');
    await page.click('[data-act="grammarRedo"]'); await answerAll(true);
    check(await page.evaluate(id => !S.gmiss[id], gl.id), 'les erreurs rattrapées restent en mémoire');
    await page.click('[data-act="quitSession"]');
    await go('toolkit/grammar'); await shot(page, '07d-grammar');
    await page.click('[data-act="spotMistake"]'); await page.waitForSelector('.qcard'); await answerAll(true);
    check((await page.locator('.sess.end .ring b').innerText()).startsWith('100'), '« Spot the mistake » : le bon choix n’est pas reconnu');
    await page.click('[data-act="quitSession"]'); await page.waitForSelector('[data-act="grammarWorkout"]');
    await page.click('[data-act="grammarWorkout"]'); await page.waitForSelector('.qcard');
    check(await page.evaluate(() => SESSION.questions.length) === 12, 'l’entraînement de grammaire ne compte pas 12 questions');
    await answerAll(true); await page.click('[data-act="quitSession"]');
    console.log('  séance du jour, suivi des erreurs de grammaire et entraînements : conformes');

    // 6d. recherche et favoris
    await go('search'); await page.fill('#q', 'reclassement');
    check(await page.locator('#results .list a').count() >= 3, 'la recherche en français ne trouve rien');
    await page.fill('#q', 'notice period');
    check(/notice/i.test(await page.locator('#results .list a').first().innerText()), 'la recherche en anglais ne classe pas le bon résultat en tête');
    await shot(page, '07e-search');
    await go('entry/ct-001'); await page.click('[data-act="star"]');
    await go('notebook'); check(await page.locator('[data-act="starDrill"]').count() === 1, 'l’expression favorite n’apparaît pas dans le carnet');
    await go('entry/ct-001'); await page.click('[data-act="star"]');

    // 7. révision espacée
    await go('review');
    await page.click('[data-act="reveal"]'); await shot(page, '09-review');
    const before = await page.evaluate(() => dueIds().length);
    await page.click('[data-act="rate"][data-q="2"]');
    check(await page.evaluate(() => dueIds().length) === before - 1, 'la carte notée « Good » reste due');

    // 8. écrit : phrases à compléter, puis texte libre conservé
    const w1 = await page.evaluate(() => DATA.skills.contract.writing.find(w => w.stage === 1));
    await go('write/' + w1.id);
    for (let i = 0; i < w1.gaps.length; i++) await page.fill('.gap input[data-i="' + i + '"]', w1.gaps[i].answer);
    await page.click('[data-act="checkGaps"]');
    check(await page.locator('.gap input.ok').count() === w1.gaps.length, 'les bonnes réponses de l’écrit ne sont pas reconnues');
    check(await page.locator('#model .doc').count() === 1, 'le corrigé modèle ne s’affiche pas');
    const w3 = await page.evaluate(() => DATA.skills.contract.writing.find(w => w.stage === 3).id);
    await go('write/' + w3);
    await page.fill('#draft', 'Dear Ms Carter, further to our call, please find my note below.');
    await page.click('[data-act="showModel"]');
    check(await page.locator('#model mark.cm').count() >= 3, 'les passages commentés du modèle ne sont pas repérés');
    await shot(page, '10-writing');

    // 9. carnet personnel
    await go('notebook');
    await page.fill('#nbText', 'Let us park that for now.'); await page.fill('#nbNote', 'remettre à plus tard');
    await page.click('[data-act="noteAdd"]');
    check(await page.locator('.notes .note').count() === 1, 'l’entrée du carnet n’apparaît pas');
    check(await page.evaluate(() => dueIds().some(id => id.startsWith('nb-'))), 'le carnet ne rejoint pas la révision');

    // 10. réglages : variété, thème sombre
    await go('settings');
    await page.click('[data-act="set"][data-k="variety"][data-v="us"]');
    await go('entry/ct-084');
    check((await page.locator('.entry h1').innerText()).trim() === await page.evaluate(() => ENTRY['ct-084'].term.us), 'la variété américaine n’est pas appliquée');
    await go('settings'); await page.click('[data-act="set"][data-k="theme"][data-v="dark"]');
    await go(''); await shot(page, '11-today-dark');
    await go('entry/ct-084'); await shot(page, '12-entry-dark-us');

    // 11. test de positionnement
    await go('placement'); await page.click('[data-act="placementStart"]');
    await answerAll(true);
    const pl = await page.evaluate(() => S.placement);
    check(pl && pl.est === 'C1' && pl.unlock === 2, 'test de positionnement : résultat inattendu ' + JSON.stringify(pl));
    await page.click('[data-act="quitSession"]');

    // 12. hors connexion : relance complète sans réseau ni serveur
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => navigator.serviceWorker.controller || caches.keys().then(k => k.length > 0));
    await page.waitForTimeout(600);
    await page.evaluate(() => saveNow());
    await ctx.setOffline(true); server.kill();
    await page.reload();
    await page.waitForSelector('.hero');
    check(await page.evaluate(() => S.notebook.length === 1 && S.levels['contract:1'] === 100 && S.settings.variety === 'us'), 'la progression n’a pas survécu au rechargement hors ligne');
    await go('theme/contract'); await page.click('[data-act="practise"][data-l="2"]'); await answerAll(true);
    check(await page.locator('.sess.end').count() === 1, 'séance impossible hors connexion');
    console.log('  hors connexion : application relancée, progression intacte, séance terminée');

    // 13. grands écrans
    if (SHOTS) {
      await ctx.setOffline(false);
      const html = 'file://' + path.join(APP, 'index.html');
      for (const [name, opt] of [['13-ipad', { ...devices['iPad Pro 11 landscape'] }], ['14-mac', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }]]) {
        const c2 = await browser.newContext(opt), p2 = await c2.newPage();
        await p2.goto(html); await p2.evaluate(() => { S.welcomed = true; saveNow(); location.hash = '#/learn'; }); await p2.waitForTimeout(300);
        await p2.screenshot({ path: path.join(SHOTS, name + '.png') }); await c2.close();
      }
    }
  } catch (e) { fails.push('arrêt : ' + e.message); console.log('  ARRÊT :', e.message); }

  await browser.close(); server.kill();
  console.log(fails.length ? '\n' + fails.length + ' défaut(s)' : '\nParlance : tout est conforme');
  process.exit(fails.length ? 1 : 0);
})();

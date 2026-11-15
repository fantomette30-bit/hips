/* Revue point par point des fonctionnalités de Parlance.
   La voix de l'appareil est remplacée par une doublure qui enregistre ce qu'on lui
   demande de dire ; le micro est celui, factice, de Chromium. Chaque ligne du
   compte rendu correspond à une fonctionnalité réellement exercée.
       node Tools/EnglishCheck/features.test.js [--shots dossier]                */
const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs'), os = require('os');

const APP = path.join(__dirname, '../../English/app');
const PORT = 8937, URL = 'http://localhost:' + PORT + '/';
const at = process.argv.indexOf('--shots'), SHOTS = at > 0 ? process.argv[at + 1] : null;

const FAKE_SPEECH = () => {
  window.__spoken = []; window.__cancels = 0; window.__mute = false;
  const fake = {
    speaking: false, pending: false,
    _voices: [{ name: 'Bells', lang: 'en-US', localService: true }, { name: 'Samantha', lang: 'en-US', localService: true }, { name: 'Eddy (English (UK))', lang: 'en-GB', localService: true },
      { name: 'Daniel', lang: 'en-GB', localService: true }, { name: 'Thomas', lang: 'fr-FR', localService: true }],
    getVoices() { return this._voices; }, addEventListener() { }, resume() { }, pause() { },
    speak(u) {
      window.__spoken.push({ text: u.text, lang: u.lang, voice: u.voice ? u.voice.name : null, rate: u.rate, volume: u.volume });
      if (window.__mute) return;
      this.speaking = true;
      setTimeout(() => { if (u.onstart) u.onstart({}); setTimeout(() => { this.speaking = false; if (u.onend) u.onend({}); }, 25); }, 8);
    },
    cancel() { window.__cancels++; this.speaking = false; }
  };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; this.volume = 1; this.rate = 1; this.pitch = 1; };
};

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', APP], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx = await browser.newContext({ ...devices['iPhone 13'], permissions: ['microphone'], acceptDownloads: true });
  await ctx.addInitScript(FAKE_SPEECH);
  const page = await ctx.newPage();
  const jsErrors = []; page.on('pageerror', e => jsErrors.push(e.message));
  const results = [];
  const point = async (label, fn) => {
    const before = jsErrors.length;
    try { const note = await fn(); if (jsErrors.length > before) throw new Error('exception JS : ' + jsErrors[jsErrors.length - 1]); results.push([true, label, note || '']); console.log('  ✓ ' + label + (note ? ' — ' + note : '')); }
    catch (e) { results.push([false, label, e.message.split('\n')[0]]); console.log('  ✗ ' + label + ' : ' + e.message.split('\n')[0]); }
  };
  const must = (c, m) => { if (!c) throw new Error(m); };
  const go = async h => { await page.evaluate(x => { if (location.hash === '#/' + x) render(); else location.hash = '#/' + x; }, h); await page.waitForTimeout(60); };
  const spoken = () => page.evaluate(() => window.__spoken.filter(u => u.volume > 0));
  const resetSpoken = () => page.evaluate(() => { window.__spoken = []; window.__cancels = 0; });
  const shot = async name => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.waitForTimeout(450); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); } };
  const aligned = sel => page.evaluate(s => Array.from(document.querySelectorAll(s)).every(g => { const r = Array.from(g.children).filter(c => c.offsetParent).map(c => c.getBoundingClientRect()); return r.every(x => Math.abs(x.top - r[0].top) < 1.5 && Math.abs(x.height - r[0].height) < 1.5); }), sel);
  const answerAll = async correct => {
    for (let guard = 0; guard < 80; guard++) {
      const st = await page.evaluate(() => { if (!SESSION || SESSION.i >= SESSION.questions.length) return null; const q = SESSION.questions[SESSION.i];
        return { opt: !!q.options, a: q.answer, t: (q.answers || [])[0], match: q.match ? q.match.left.map(x => x.id) : null, order: q.order ? q.order.seq : null }; });
      if (!st) break;
      if (st.opt) await page.click('.opt[data-i="' + (correct ? st.a : (st.a + 1) % 2) + '"]');
      else if (st.match) { for (const id of st.match) { await page.click('.mbtn[data-side="l"][data-id="' + id + '"]'); await page.click('.mbtn[data-side="r"][data-id="' + id + '"]'); } }
      else if (st.order) { for (const w of st.order) await page.evaluate(word => Array.from(document.querySelectorAll('.bank .wchip:not(.used)')).find(x => x.textContent === word).click(), w); await page.click('#ordCheck'); }
      else { await page.fill('#ans', correct ? st.t : 'zzz'); await page.click('[data-act="check"]'); const sm = page.locator('[data-act="selfmark"][data-ok=""]'); if (await sm.count()) await sm.click(); }
      await page.click('[data-act="nextQ"]');
    }
    must(await page.locator('.sess.end').count() === 1, 'la séance ne se termine pas');
  };
  const quit = async () => { await page.click('[data-act="quitSession"]'); await page.waitForTimeout(80); };

  await page.goto(URL);
  console.log('\nDémarrage et navigation');
  await point('Premier lancement : choix de la variété, test de positionnement proposé', async () => {
    await page.waitForSelector('.welcome'); await shot('01-welcome');
    await page.click('[data-act="setVar"][data-v="us"]'); must(await page.evaluate(() => S.settings.variety) === 'us', 'variété non enregistrée');
    await page.click('[data-act="setVar"][data-v="uk"]'); await page.click('[data-act="welcomeDone"][data-to=""]'); await page.waitForSelector('.hero');
  });
  await point('Cinq onglets, recherche et réglages accessibles depuis chaque écran principal', async () => {
    for (const [h, sel] of [['learn', '.tgrid'], ['library', 'details.fold'], ['practise', 'details.fold'], ['notebook', '#nbText'], ['', '.hero']]) { await page.click('#nav a[href="#/' + h + '"]'); await page.waitForSelector(sel); must(await page.locator('.tools a').count() === 2, 'outils absents sur ' + (h || 'accueil')); }
    await page.click('.tools a[href="#/settings"]'); await page.waitForSelector('#sound'); await page.click('.head a.ib'); await page.waitForSelector('.hero');
  });

  console.log('\nSon');
  await point('Haut-parleur : la phrase est lue, avec la bonne voix britannique', async () => {
    await go('entry/ct-001'); await resetSpoken();
    await page.locator('.entry .ipa .ib').first().click(); await page.waitForTimeout(150);
    const s = await spoken(); must(s.length === 1, 'aucune lecture demandée'); must(s[0].text === 'permanent contract', 'texte lu : ' + s[0].text);
    must(s[0].lang === 'en-GB' && s[0].voice === 'Daniel', 'voix choisie : ' + s[0].voice + ' / ' + s[0].lang);
    must(await page.evaluate(() => window.__cancels) === 0, 'cancel() appelé avant la lecture alors que rien ne jouait');
    return 'voix ' + s[0].voice;
  });
  await point('Accent américain et lecture ralentie', async () => {
    await resetSpoken(); await page.locator('.entry .ipa.alt .ib').first().click(); await page.waitForTimeout(150);
    let s = await spoken(); must(s[0].lang === 'en-US' && s[0].voice === 'Samantha', 'voix américaine : ' + s[0].voice);
    await resetSpoken(); await page.locator('.entry .ipa .ib[data-slow]').first().click(); await page.waitForTimeout(150);
    s = await spoken(); must(Math.abs(s[0].rate - 0.62) < 0.01, 'débit ralenti : ' + s[0].rate);
  });
  await point('Voix fantaisie écartées, première lecture déverrouillée par un geste', async () => {
    const v = await page.evaluate(() => ({ uk: Speech.voice('uk').name, us: Speech.voice('us').name, unlocked: Speech.unlocked, silent: window.__spoken.length }));
    must(v.uk === 'Daniel' && v.us === 'Samantha', 'voix retenues : ' + v.uk + ', ' + v.us); must(v.unlocked, 'pas de déverrouillage au premier geste');
  });
  await point('Si la voix ne démarre pas : second essai sans voix imposée, puis message d’aide', async () => {
    await resetSpoken(); await page.evaluate(() => { window.__mute = true; Speech.warned = false; });
    await page.locator('.entry .ipa .ib').first().click(); await page.waitForTimeout(4300);
    const s = await spoken(); must(s.length === 2 && s[1].voice === null, 'pas de second essai sans voix : ' + JSON.stringify(s.map(x => x.voice)));
    must(/No sound/.test(await page.locator('#toast').innerText()), 'message d’aide absent');
    await page.evaluate(() => { window.__mute = false; });
  });
  await point('Enchaîner deux lectures : la première est arrêtée, la seconde part', async () => {
    await resetSpoken(); const b = page.locator('.entry .ex .ib'); await b.nth(0).click(); await b.nth(2).click(); await page.waitForTimeout(250);
    const s = await spoken(); must(s.length === 2, s.length + ' lecture(s) au lieu de 2');
  });

  console.log('\nApprendre');
  await point('Thèmes regroupés, fiche complète (registres, UK / US, explication de la notion française)', async () => {
    await go('learn'); must(await page.locator('.tcard').count() === 18, 'nombre de thèmes'); await shot('02-learn');
    await go('entry/ct-001'); for (const sel of ['.reg-formal', '.reg-everyday', '.explain', '.colloc', 'details.fr']) must(await page.locator('.entry ' + sel).count() >= 1, sel + ' absent'); await shot('03-entry');
  });
  await point('Fiche : favori, suivante, précédente', async () => {
    await page.click('[data-act="star"]'); must(await page.evaluate(() => !!S.stars['ct-001']), 'favori non enregistré');
    await page.click('.pager a.btn:not(.ghost)'); await page.waitForTimeout(80); must(await page.evaluate(() => location.hash) !== '#/entry/ct-001', 'bouton Next sans effet');
    await page.click('.pager a.btn.ghost'); await page.waitForTimeout(80); must(await page.evaluate(() => location.hash) === '#/entry/ct-001', 'bouton Previous sans effet');
  });
  await point('Fiche : s’enregistrer puis se réécouter', async () => {
    await page.click('.entry [data-act="rec"]'); await page.waitForSelector('.entry [data-act="rec"].live'); await page.waitForTimeout(500);
    await page.click('.entry [data-act="rec"]'); await page.waitForSelector('.entry audio');
    must((await page.locator('.entry audio').getAttribute('src')).startsWith('blob:'), 'pas d’enregistrement à réécouter');
  });
  await point('Thème : étude, séance mixte, contrôle de niveau et déblocage', async () => {
    await go('theme/contract'); must(await page.locator('.level.locked').count() === 2, 'niveaux 2 et 3 non verrouillés'); await shot('04-theme');
    await page.click('[data-act="practise"][data-l="1"]'); await answerAll(true); await quit();
    await page.waitForSelector('.level'); await page.click('[data-act="levelCheck"][data-l="1"]'); await answerAll(true); await quit(); await page.waitForSelector('.level');
    must(await page.locator('.level.locked').count() === 1, 'niveau 2 non débloqué');
  });
  for (const [k, name] of [['match', 'appariement'], ['order', 'remise en ordre'], ['register', 'registre'], ['ukus', 'UK / US'], ['listen', 'écoute'], ['dictation', 'dictée'], ['type', 'rappel écrit']]) {
    await point('Exercice ciblé : ' + name, async () => {
      await go('theme/contract'); await resetSpoken(); await page.click('[data-act="drill"][data-k="' + k + '"]'); await page.waitForSelector('.qcard');
      if (k === 'match') await shot('05-match'); if (k === 'order') await shot('06-order');
      if (k === 'listen' || k === 'dictation') { await page.waitForTimeout(500); must((await spoken()).length >= 1, 'la question n’est pas lue à voix haute'); }
      await answerAll(true); await quit();
    });
  }
  await point('Séance du jour', async () => { await go(''); await page.click('[data-act="daily"]'); await page.waitForSelector('.qcard'); await answerAll(true); must(await page.evaluate(() => S.daily[dayKey()] === 100), 'non enregistrée'); await shot('07-end'); await quit(); });
  await point('Révision espacée : retourner la carte, noter, prochain rappel affiché', async () => {
    await page.evaluate(() => { S.srs['ct-002'] = { i: 0, e: 2.5, r: 0, l: 0, d: dayNum() }; save(); RV = null; }); await go('review');
    await page.click('[data-act="reveal"]'); must(/tomorrow/.test(await page.locator('.rate').innerText()), 'prochain rappel non affiché'); await shot('08-review');
    const n = await page.evaluate(() => dueIds().length); await page.click('[data-act="rate"][data-q="2"]'); must(await page.evaluate(() => dueIds().length) === n - 1, 'carte toujours due');
  });

  console.log('\nBoîte à outils');
  await point('Mots de liaison : fiche par registre et exercices', async () => { await go('toolkit/connectors/cn-add'); must(await page.locator('.card.reg-formal .conn').count() >= 2, 'registre soutenu vide'); await shot('09-linking'); await page.click('[data-act="lesson"]'); await answerAll(true); await quit(); must(await page.evaluate(() => !!S.done['cn-add']), 'non validé'); });
  await point('Tact, marqueurs de l’oral, rythme (révéler la version naturelle), chiffres et dates', async () => {
    for (const [r, sel] of [['toolkit/softeners', '.conn'], ['toolkit/markers', '.conn'], ['toolkit/numbers', '.written']]) { await go(r); must(await page.locator(sel).count() >= 5, r + ' vide'); }
    await go('toolkit/rhythm'); await page.locator('details.reveal summary').first().click(); must(await page.locator('details.reveal[open] .natural').count() === 1, 'version naturelle non révélée');
  });
  await point('Grammaire : 24 leçons, leçon avec erreurs types, exercices, erreurs à refaire', async () => {
    await go('toolkit/grammar'); must(await page.locator('.list a').count() === 24, 'nombre de leçons'); await shot('10-grammar');
    await go('toolkit/grammar/gr-future'); must(await page.locator('.wrong').count() >= 6, 'erreurs types absentes'); await shot('11-lesson');
    await page.click('[data-act="lesson"]'); await answerAll(false); await quit(); await page.waitForSelector('[data-act="grammarRedo"]');
    await page.click('[data-act="grammarRedo"]'); await answerAll(true); await quit(); must(await page.evaluate(() => !S.gmiss['gr-future']), 'erreurs non soldées');
  });
  await point('Grammaire : entraînement mixte et « Spot the mistake »', async () => { await go('toolkit/grammar'); await page.click('[data-act="grammarWorkout"]'); await answerAll(true); await quit(); await page.waitForSelector('[data-act="spotMistake"]'); await page.click('[data-act="spotMistake"]'); await answerAll(true); await quit(); });
  await point('Prononciation : écoute dans les deux accents, paires minimales, validation', async () => {
    const id = await page.evaluate(() => L.pronunciation[0].id); await go('toolkit/pron/' + id); await resetSpoken();
    await page.locator('.pr .ib[data-v="us"]').first().click(); await page.waitForTimeout(120); must((await spoken())[0].lang === 'en-US', 'accent américain non respecté');
    await page.click('[data-act="markDone"]'); must(await page.evaluate(i => !!S.done[i], id), 'non validée');
  });

  console.log('\nBibliothèque');
  await point('Lecture : glossaire, jargon juridique décodé, lecture chronométrée, questions', async () => {
    await go('read/rd-ct-1'); await shot('12-reading');
    await page.locator('#doc .gl').first().click(); must(await page.locator('.sheet-card h2').count() === 1, 'glossaire'); await page.click('.sheet-card [data-act="closeSheet"]');
    await page.locator('#doc .lg').first().click(); must(/plain English/.test(await page.locator('.sheet-card').innerText()), 'jargon non décodé'); await page.click('.sheet-card [data-act="closeSheet"]');
    await page.click('[data-act="skim"]'); await page.waitForTimeout(1200); must(/5\d s/.test(await page.locator('[data-act="skim"]').innerText()), 'chronomètre arrêté');
    await page.click('[data-act="readQ"]'); await answerAll(true); await quit(); must(await page.evaluate(() => !!S.done['rd-ct-1']), 'non validée');
  });
  await point('Dialogue : lecture intégrale dans le bon accent, texte masquable, questions', async () => {
    const d = await page.evaluate(() => { const x = DATA.skills.contract.dialogues.find(y => y.variety === 'us'); return { id: x.id, n: x.lines.length }; });
    await go('dialogue/' + d.id); await resetSpoken(); await shot('13-dialogue');
    await page.click('[data-act="playAll"]'); await page.waitForFunction(n => window.__spoken.filter(u => u.volume > 0).length >= n, d.n, { timeout: 15000 });
    const s = await spoken(); must(s.every(u => u.lang === 'en-US'), 'accent du dialogue'); must(new Set(s.map(u => u.text)).size === d.n, 'répliques lues : ' + s.length + ' / ' + d.n);
    await page.click('[data-act="toggleText"]'); must(await page.locator('#dlg.notext').count() === 1, 'texte non masqué');
    await page.click('[data-act="dlgQ"]'); await answerAll(true); await quit();
  });

  console.log('\nS’exercer');
  await point('Écrit, temps 1 : phrases à compléter et corrigé modèle', async () => {
    const w = await page.evaluate(() => DATA.skills.contract.writing.find(x => x.stage === 1)); await go('write/' + w.id);
    for (let i = 0; i < w.gaps.length; i++) await page.fill('.gap input[data-i="' + i + '"]', w.gaps[i].answer);
    await page.click('[data-act="checkGaps"]'); must(await page.locator('.gap input.ok').count() === w.gaps.length, 'réponses non reconnues'); must(await page.locator('#model .doc').count() === 1, 'corrigé absent');
  });
  await point('Écrit, temps 2 et 3 : brouillon conservé, corrigé commenté, grille, copie', async () => {
    const id = await page.evaluate(() => DATA.skills.contract.writing.find(x => x.stage === 3).id); await go('write/' + id);
    await page.fill('#draft', 'Dear Mr Lambert, further to our meeting, I am writing to confirm the change.'); await page.evaluate(() => saveNow()); await page.reload(); await page.waitForSelector('#draft');
    must((await page.inputValue('#draft')).startsWith('Dear Mr Lambert'), 'brouillon perdu au rechargement'); must(/14 words/.test(await page.locator('#wc').innerText()), 'compteur de mots');
    await page.click('[data-act="showModel"]'); must(await page.locator('#model mark.cm').count() >= 3 && await page.locator('#model .checkline').count() >= 4, 'corrigé ou grille incomplets'); await shot('14-writing');
    must(await aligned('.row'), 'boutons Copier / Corriger mal alignés');
  });
  await point('Jeu de rôle : écoute, réponse enregistrée au chronomètre, modèle, tours suivants', async () => {
    const r = await page.evaluate(() => { const x = DATA.skills.contract.roleplays[0]; return { id: x.id, n: x.turns.length, say: x.turns[0].say }; });
    await go('roleplay/' + r.id); await resetSpoken(); await page.waitForTimeout(600); must((await spoken()).some(u => u.text === r.say), 'la question n’est pas lue');
    for (let t = 0; t < r.n; t++) {
      await page.click('[data-act="rpAnswer"]'); await page.waitForSelector('#rpCount'); await page.waitForTimeout(700); await page.click('[data-act="rpStop"]'); await page.waitForSelector('[data-act="rpNext"]');
      if (t === 0) { must(await page.locator('audio[src^="blob:"]').count() === 1, 'enregistrement absent'); await shot('15-roleplay'); }
      await page.click('[data-act="rpNext"]'); await page.waitForTimeout(120);
    }
    must(await page.evaluate(i => !!S.done[i], r.id), 'jeu de rôle non validé');
  });
  await point('Formules de réunion et d’appel, par thème', async () => { await go('functional'); must(await page.locator('details.fold').count() === 18 && await page.locator('details.fold[open] .phrase').count() >= 20, 'contenu incomplet'); });

  console.log('\nCarnet, recherche');
  await point('Carnet : ajouter, doublon refusé, exercice, favoris, supprimer', async () => {
    await go('notebook'); await page.fill('#nbText', 'Let us park that for now.'); await page.fill('#nbNote', 'remettre à plus tard'); await page.click('[data-act="noteAdd"]');
    await page.fill('#nbText', 'Let us park that for now.'); await page.click('[data-act="noteAdd"]'); must(await page.locator('.notes .note').count() === 1, 'doublon accepté');
    must(await page.locator('[data-act="starDrill"]').count() === 1, 'favoris absents'); await shot('16-notebook');
    await page.click('[data-act="noteDrill"]'); await answerAll(true); await quit(); await page.waitForSelector('[data-act="noteDel"]');
    await page.click('[data-act="noteDel"]'); must(await page.locator('.notes .note').count() === 0, 'non supprimé');
  });
  await point('Recherche en français et en anglais, dans tout le contenu', async () => {
    await go('search'); await page.fill('#q', 'reclassement'); must(await page.locator('#results .list a').count() >= 3, 'français');
    await page.fill('#q', 'notice period'); must(/notice/i.test(await page.locator('#results .list a').first().innerText()), 'anglais');
    await page.fill('#q', 'although'); must(await page.locator('#results h3').count() >= 1, 'grammaire et mots de liaison non cherchés'); await shot('17-search');
  });

  console.log('\nRéglages');
  await point('Boutons alignés (Export / Import, test du son British / American)', async () => { await go('settings'); await shot('18-settings'); must(await aligned('.two'), 'boutons côte à côte de tailles ou de hauteurs différentes'); must(await aligned('.inline'), 'champ et bouton du code d’accès mal alignés'); await page.evaluate(() => window.scrollTo(0, 900)); await shot('19-settings-bas'); });
  await point('Variété, aide en français, objectif quotidien, taille du texte, mode sombre', async () => {
    await page.click('[data-act="set"][data-k="variety"][data-v="us"]'); await go('entry/ct-084'); must((await page.locator('.entry h1').innerText()).trim() === await page.evaluate(() => ENTRY['ct-084'].term.us), 'variété');
    await go('settings'); await page.click('[data-act="set"][data-k="frHelp"][data-v="true"]'); await go('entry/ct-084'); must(await page.locator('.entry details.fr[open]').count() >= 1, 'aide en français');
    await go('settings'); await page.click('[data-act="set"][data-k="goal"][data-v="20"]'); await go(''); must(/of 20 min/.test(await page.locator('.weekcard .ring').innerText()), 'objectif');
    await go('settings'); await page.click('[data-act="set"][data-k="scale"][data-v="1.25"]'); must(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize) === '21.25px', 'taille du texte');
    await page.click('[data-act="set"][data-k="theme"][data-v="dark"]'); must(await page.evaluate(() => getComputedStyle(document.body).colorScheme) === 'dark', 'mode sombre'); await shot('20-dark');
    await page.click('[data-act="set"][data-k="scale"][data-v="1"]'); await page.click('[data-act="set"][data-k="theme"][data-v="light"]'); await page.click('[data-act="set"][data-k="variety"][data-v="uk"]'); await page.click('[data-act="set"][data-k="frHelp"][data-v="false"]');
  });
  await point('Débit de lecture et choix de la voix', async () => {
    await page.click('[data-act="set"][data-k="rate"][data-v="0.85"]'); await page.selectOption('select[data-k="voiceUk"]', 'Eddy (English (UK))'); await resetSpoken();
    await page.click('#sound [data-act="say"][data-v="uk"]'); await page.waitForTimeout(150); const s = await spoken();
    must(Math.abs(s[0].rate - 0.85) < 0.01 && s[0].voice === 'Eddy (English (UK))', 'débit ' + s[0].rate + ', voix ' + s[0].voice);
    await page.selectOption('select[data-k="voiceUk"]', ''); await page.click('[data-act="set"][data-k="rate"][data-v="1"]');
  });
  await point('Export puis import de la progression', async () => {
    await go('settings'); const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="exportData"]')]);
    const f = path.join(os.tmpdir(), 'parlance-export-' + Date.now() + '.json'); await dl.saveAs(f); const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    must(data.v === 1 && data.levels['contract:1'] === 100 && data.online.code === '', 'export incomplet ou code d’accès exporté');
    await page.evaluate(() => { S.levels = {}; S.stars = {}; saveNow(); }); await page.setInputFiles('#importFile', f); await page.waitForTimeout(400);
    must(await page.evaluate(() => S.levels['contract:1'] === 100 && !!S.stars['ct-001']), 'progression non restaurée');
  });
  await point('Test de positionnement', async () => { await go('placement'); await page.click('[data-act="placementStart"]'); await answerAll(true); must(await page.evaluate(() => S.placement && S.placement.est === 'C1'), 'résultat'); await quit(); });
  await point('Version affichée, vérification des mises à jour, bandeau de nouvelle version', async () => {
    await go('settings'); const about = await page.locator('.card.set').last().innerText(); must(/Parlance 0\.4\.1/.test(about) && /Build 20\d\d-\d\d-\d\d \d\d:\d\d UTC/.test(about), 'version ou date de construction absente : ' + about.slice(0, 80));
    await page.click('[data-act="checkUpdate"]'); await page.waitForFunction(() => /latest version|installed app|downloading/.test(document.querySelector('#toast').textContent), null, { timeout: 8000 });
    await page.evaluate(() => window.dispatchEvent(new Event('parlance-update'))); must(await page.locator('#update [data-act="reload"]').count() === 1, 'bandeau absent');
    return about.match(/Build [^·]+/)[0].trim();
  });
  await point('Mise en page : boutons alignés et aucun débordement, sur tous les types d’écran', async () => {
    const d = await page.evaluate(() => ({ rd: DATA.skills.contract.reading[0].id, dl: DATA.skills.contract.dialogues[0].id, wr: DATA.skills.contract.writing.find(w => w.stage === 2).id, rp: DATA.skills.contract.roleplays[1].id }));
    for (const r of ['', 'learn', 'theme/contract', 'cards/contract/1', 'entry/ct-005', 'toolkit/grammar', 'toolkit/grammar/gr-shall', 'toolkit/connectors', 'toolkit/pron', 'library', 'read/' + d.rd, 'dialogue/' + d.dl, 'practise', 'write/' + d.wr, 'roleplay/' + d.rp, 'functional', 'freewrite', 'corrections', 'notebook', 'search', 'settings', 'placement', 'review']) {
      await go(r); must(await aligned('.row, .two, .inline, .rate, .stats, .pager'), 'boutons mal alignés sur l’écran « ' + (r || 'accueil') + ' »');
      must(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'débordement en largeur sur « ' + (r || 'accueil') + ' »');
      must(await page.evaluate(() => Array.from(document.querySelectorAll('.btn')).every(b => b.scrollWidth <= b.clientWidth + 1)), 'texte de bouton tronqué sur « ' + (r || 'accueil') + ' »');
    }
  });
  await point('Effacer toute la progression, après confirmation', async () => {
    await go('settings'); await page.click('[data-act="resetAsk"]'); must(await page.locator('.sheet-card [data-act="resetDo"]').count() === 1, 'pas de confirmation'); await page.click('.sheet-card [data-act="closeSheet"]');
    must(await page.evaluate(() => S.welcomed), 'effacé sans confirmation'); await page.click('[data-act="resetAsk"]'); await page.click('[data-act="resetDo"]'); await page.waitForSelector('.welcome');
  });

  await browser.close(); server.kill();
  const ko = results.filter(r => !r[0]);
  console.log('\n' + (results.length - ko.length) + ' points conformes sur ' + results.length + (jsErrors.length ? ' · exceptions JS : ' + jsErrors.length : ''));
  process.exit(ko.length ? 1 : 0);
})();

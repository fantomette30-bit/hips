/* Une vraie partie, jouée comme une joueuse : sélection de cases, saisie au
   pavé, notes au verrou, une erreur, une annulation, la gomme, un indice,
   puis la victoire — et on vérifie score, statistiques et sauvegarde. */
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ ...devices['iPhone 13'], offline: true });
  const page = await ctx.newPage();
  let fails = 0;
  const check = (c, m) => { if (!c) { fails++; console.log('  ECHEC:', m); } };
  page.on('pageerror', e => { fails++; console.log('  EXCEPTION:', e.message); });
  await page.goto('file://' + require('path').join(__dirname, '../../Web/index.html'));
  await page.waitForSelector('#levelList button');
  await page.locator('#levelList button').nth(2).click();          // Difficile
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 60000 });
  const cell = i => page.locator('#board .cell').nth(i);
  const key = d => page.locator('#pad .key').nth(d - 1);
  const etat = () => page.evaluate(() => ({ pts: G.points, err: G.mistakes, ind: G.hints, vides: G.values.filter(v => v === 0).length }));

  // notes au verrou sur trois cases
  const libres = await page.evaluate(() => G.values.map((v, i) => (v === 0 && !isGiven(i)) ? i : -1).filter(i => i >= 0));
  await page.locator('#toolNotes').click();
  await key(7).click();
  for (const i of libres.slice(0, 3)) { await cell(i).click(); await page.waitForTimeout(40); }
  const notes3 = await page.evaluate(l => l.slice(0, 3).map(i => (G.notes[i] >> 7) & 1), libres);
  check(notes3.every(x => x === 1), 'les notes au verrou ne se posent pas : ' + JSON.stringify(notes3));
  await page.locator('#toolNotes').click();                        // retour en saisie

  // une saisie correcte au pavé
  const c0 = libres[5];
  await cell(c0).click();
  const bon = await page.evaluate(i => G.puzzle.solution[i], c0);
  await key(bon).click();
  await page.waitForTimeout(120);
  const apres1 = await etat();
  check(await page.evaluate(i => G.values[i], c0) === bon, 'la saisie ne pose pas le chiffre');
  check(apres1.pts > 0, 'aucun point pour une bonne case');

  // une erreur volontaire, puis correction
  const c1 = libres[6];
  await cell(c1).click();
  const faux = await page.evaluate(i => (G.puzzle.solution[i] % 9) + 1, c1);
  await key(faux).click();
  await page.waitForTimeout(150);
  const apres2 = await etat();
  check(apres2.err === 1, 'l’erreur n’est pas comptée');
  check(await cell(c1).evaluate(e => e.classList.contains('err')), 'le chiffre faux n’est pas signalé');
  await page.locator('#toolErase').click();
  await page.waitForTimeout(100);
  check(await page.evaluate(i => G.values[i], c1) === 0, 'la gomme n’efface pas le chiffre faux');

  // annulation : on revient sur la bonne saisie
  await page.locator('#toolUndo').click();
  await page.waitForTimeout(120);

  // un indice
  await page.locator('#toolHint').click();
  await page.waitForTimeout(200);
  await page.locator('#toolHint').click();
  await page.waitForTimeout(200);
  const apres3 = await etat();
  check(apres3.ind >= 1, 'l’indice n’est pas compté');

  // sauvegarde puis reprise en cours de partie
  await page.locator('#btnBack').click();
  await page.waitForTimeout(300);
  check(await page.locator('#resumeCard').isVisible(), 'la carte de reprise est absente');
  await page.locator('#resumeCard').click();
  await page.waitForTimeout(400);
  const repris = await etat();
  check(repris.pts === apres3.pts && repris.err === apres3.err, 'la reprise perd le score ou les erreurs');

  // l'annulation a remis le chiffre faux : l'indice doit refuser d'avancer
  const faussesAvant = await page.evaluate(() => G.values.filter((v, i) => v !== 0 && v !== G.puzzle.solution[i]).length);
  check(faussesAvant === 1, 'l’annulation n’a pas restauré le chiffre faux');
  const avantIndice = await page.evaluate(() => G.values.filter(v => v !== 0).length);
  await page.locator('#toolHint').click();
  await page.waitForTimeout(200);
  check(await page.evaluate(() => G.values.filter(v => v !== 0).length) === avantIndice,
        'l’indice avance alors qu’une case fausse traîne');
  check(await page.locator('#hintBanner').isVisible(), 'l’indice ne signale pas la case fausse');
  console.log('  indice sur grille fausse : il signale au lieu d’avancer');

  // on efface les cases fausses (comme le ferait la joueuse) puis on termine
  await page.evaluate(() => {
    G.values.forEach((v, i) => { if (v !== 0 && !isGiven(i) && v !== G.puzzle.solution[i]) { G.sel = i; erase(); } });
    let g = 0; while (!G.complete && g++ < 400) useHint();
  });
  await page.waitForTimeout(700);
  check(await page.locator('#victory.on').isVisible(), 'écran de victoire absent');
  const bilan = await page.evaluate(() => ({
    stats: JSON.parse(localStorage.getItem('zen.stats') || '{}'),
    partie: localStorage.getItem('zen.game'),
    pts: +document.getElementById('vicPoints').textContent.replace(/\s/g, '')
  }));
  check(bilan.stats.hard && bilan.stats.hard.won === 1, 'victoire non enregistrée');
  check(bilan.stats.hard.best === null, 'un temps obtenu aux indices est devenu un record');
  check(bilan.partie === null, 'la partie terminée reste en sauvegarde');
  check(bilan.pts > 0, 'aucun point à l’arrivée');
  console.log('  partie complète : ' + bilan.pts + ' points, ' + bilan.stats.hard.played + ' partie(s) comptée(s)');

  await b.close();
  console.log(fails ? '\n' + fails + ' PROBLEME(S)' : '\nPARTIE REELLE : saisie, notes au verrou, erreur, gomme, annulation, indice, reprise, victoire');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

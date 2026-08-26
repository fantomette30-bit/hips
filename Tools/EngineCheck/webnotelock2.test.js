/* Le verrou face aux autres commandes : pause, gomme, indice, remplissage
   automatique, recommencer, sortie de partie, victoire. */
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
  await page.locator('#levelList button').nth(0).click();
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 30000 });
  const key = d => page.locator('#pad .key').nth(d - 1);
  const verrou = () => page.evaluate(() => noteLock);
  const libres = await page.evaluate(() => G.values.map((v, i) => (v === 0 && !isGiven(i)) ? i : -1).filter(i => i >= 0));

  await page.locator('#toolNotes').click();
  await key(4).click();
  await page.waitForTimeout(80);

  // 1. en pause, toucher une case relance la partie sans poser de note
  await page.locator('#pillClock').click();
  await page.waitForTimeout(120);
  check(await page.evaluate(() => G.paused) === true, 'la pause ne s’active pas');
  const avantPause = await page.evaluate(i => G.notes[i], libres[5]);
  check(await page.locator('.paused-veil').count() === 1, 'le voile de pause est absent');
  await page.locator('.paused-veil').click();      // « touchez pour reprendre »
  await page.waitForTimeout(150);
  check(await page.evaluate(() => G.paused) === false, 'toucher la grille ne relance pas la partie');
  check(await page.evaluate(i => G.notes[i], libres[5]) === avantPause, 'une note a été posée pendant la pause');
  console.log('  pause : la grille reprend sans poser de note');

  // 2. gomme : efface les notes de la case, le verrou reste
  await page.locator('#board .cell').nth(libres[0]).click();
  await page.waitForTimeout(80);
  check(await page.evaluate(i => G.notes[i], libres[0]) !== 0, 'la note n’a pas été posée');
  await page.locator('#toolErase').click();
  await page.waitForTimeout(100);
  check(await page.evaluate(i => G.notes[i], libres[0]) === 0, 'la gomme n’efface pas la note');
  check(await verrou() === 4, 'la gomme relâche le verrou');

  // 3. remplissage automatique des notes puis pose : rien ne casse
  await page.locator('#btnMenu').click();
  await page.waitForTimeout(200);
  await page.locator('#menuNotes').click();
  await page.waitForTimeout(250);
  const cerclees = await page.locator('#board .cell.noted').count();
  check(cerclees > 0, 'aucune case cerclée après le remplissage des notes');
  check(await verrou() === 4, 'le remplissage relâche le verrou');
  await page.locator('#board .cell').nth(libres[1]).click();
  await page.waitForTimeout(100);
  console.log('  remplissage automatique : ' + cerclees + ' cases cerclées, verrou conservé');

  // 4. indice : il pose un chiffre, le verrou survit
  await page.locator('#toolHint').click().catch(() => {});
  await page.waitForTimeout(200);
  check(await verrou() === 4, 'l’indice relâche le verrou');

  // 5. recommencer : le verrou est relâché
  await page.locator('#btnMenu').click();
  await page.waitForTimeout(200);
  await page.locator('#menuRestart').click().catch(() => {});
  await page.waitForTimeout(300);
  check(await verrou() === 0, 'le verrou survit à « recommencer »');
  console.log('  recommencer : verrou relâché');

  // 6. quitter puis reprendre : pas de verrou fantôme
  await page.locator('#toolNotes').click();
  await page.waitForTimeout(80);
  await key(6).click();
  await page.waitForTimeout(80);
  await page.locator('#btnBack').click();
  await page.waitForTimeout(300);
  await page.locator('#resumeCard').click();
  await page.waitForTimeout(400);
  check(await verrou() === 0, 'un verrou fantôme subsiste après reprise');
  const noteMode = await page.evaluate(() => G.noteMode);
  const avantReprise = await page.evaluate(i => G.notes[i], libres[2]);
  await page.locator('#board .cell').nth(libres[2]).click();
  await page.waitForTimeout(100);
  check(await page.evaluate(i => G.notes[i], libres[2]) === avantReprise, 'une note se pose sans verrou après reprise');
  console.log('  reprise : aucun verrou fantôme (mode notes ' + (noteMode ? 'actif' : 'inactif') + ')');

  // 7. partie terminée : plus rien ne bouge
  await page.evaluate(() => { let g = 0; while (!G.complete && g++ < 300) useHint(); });
  await page.waitForTimeout(600);
  const apres = await page.evaluate(() => ({ complete: G.complete, verrou: noteLock }));
  check(apres.complete, 'la grille ne se termine pas');
  await page.locator('#board .cell').nth(libres[3]).click({ force: true }).catch(() => {});
  await page.waitForTimeout(120);
  check(await page.evaluate(() => G.complete) === true, 'la grille terminée a été modifiée');

  await b.close();
  console.log(fails ? '\n' + fails + ' PROBLEME(S)' : '\nVERROU ET AUTRES COMMANDES : aucun conflit');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

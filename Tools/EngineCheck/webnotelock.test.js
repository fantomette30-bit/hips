/* Verrou de note : garder un chiffre en main et le poser d'un appui. */
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

  const cellules = await page.evaluate(() => G.values.map((v, i) => (v === 0 && !isGiven(i)) ? i : -1).filter(i => i >= 0).slice(0, 4));
  const note = i => page.evaluate(k => G.notes[k], i);
  const key = d => page.locator('#pad .key').nth(d - 1);

  // 1. mode notes + appui sur le 3 : le chiffre est gardé en main
  await page.locator('#toolNotes').click();
  await key(3).click();
  await page.waitForTimeout(120);
  check(await page.evaluate(() => noteLock) === 3, 'le chiffre n’est pas gardé en main');
  check(await key(3).evaluate(e => e.classList.contains('locked')), 'la touche gardée en main n’est pas mise en avant');
  check(await key(3).getAttribute('aria-pressed') === 'true', 'aria-pressed absent sur la touche gardée');

  // 2. on touche trois cases : la note 3 s'y pose sans repasser par le pavé
  for (const i of cellules.slice(0, 3)) {
    await page.locator('#board .cell').nth(i).click();
    await page.waitForTimeout(60);
  }
  for (const i of cellules.slice(0, 3)) check((await note(i)) & (1 << 3), 'note 3 absente de la case ' + i);
  check(await page.evaluate(() => noteLock) === 3, 'le verrou s’est relâché tout seul');

  // 3. re-toucher une case retire la note (bascule)
  await page.locator('#board .cell').nth(cellules[0]).click();
  await page.waitForTimeout(80);
  check(!((await note(cellules[0])) & (1 << 3)), 'la note n’est pas retirée au second appui');

  // 4. annuler restaure la note
  await page.locator('#toolUndo').click();
  await page.waitForTimeout(100);
  check((await note(cellules[0])) & (1 << 3), 'l’annulation ne restaure pas la note');

  // 5. changer de chiffre : le 5 prend la main
  await key(5).click();
  await page.waitForTimeout(80);
  check(await page.evaluate(() => noteLock) === 5, 'le nouveau chiffre ne prend pas la main');
  check(!(await key(3).evaluate(e => e.classList.contains('locked'))), 'l’ancienne touche reste mise en avant');
  await page.locator('#board .cell').nth(cellules[3]).click();
  await page.waitForTimeout(80);
  check((await note(cellules[3])) & (1 << 5), 'la note 5 ne se pose pas');

  // 6. second appui sur le même chiffre : on relâche, les cases se contentent de se sélectionner
  await key(5).click();
  await page.waitForTimeout(80);
  check(await page.evaluate(() => noteLock) === 0, 'le second appui ne relâche pas le verrou');
  const avant = await note(cellules[1]);
  await page.locator('#board .cell').nth(cellules[1]).click();
  await page.waitForTimeout(80);
  check(await note(cellules[1]) === avant, 'une case est modifiée alors que rien n’est gardé en main');
  check(await page.evaluate(() => G.sel) === cellules[1], 'la case n’est pas sélectionnée');

  // 7. quitter le mode notes relâche le verrou
  await key(7).click();
  await page.waitForTimeout(60);
  await page.locator('#toolNotes').click();
  await page.waitForTimeout(80);
  check(await page.evaluate(() => noteLock) === 0, 'le verrou survit à la sortie du mode notes');
  check(await page.evaluate(() => G.noteMode) === false, 'le mode notes ne s’est pas désactivé');

  // 8. hors mode notes, le pavé pose bien un chiffre comme avant
  await page.locator('#board .cell').nth(cellules[2]).click();
  await page.waitForTimeout(60);
  const bon = await page.evaluate(i => G.puzzle.solution[i], cellules[2]);
  await key(bon).click();
  await page.waitForTimeout(80);
  check(await page.evaluate(i => G.values[i], cellules[2]) === bon, 'la saisie normale ne fonctionne plus');

  // 9. cases fixes et cases remplies ignorées par le verrou
  await page.locator('#toolNotes').click();
  await key(2).click();
  await page.waitForTimeout(60);
  const fixe = await page.evaluate(() => G.values.findIndex((v, i) => isGiven(i)));
  const avantFixe = await page.evaluate(i => ({ v: G.values[i], n: G.notes[i] }), fixe);
  await page.locator('#board .cell').nth(fixe).click();
  await page.waitForTimeout(80);
  const apresFixe = await page.evaluate(i => ({ v: G.values[i], n: G.notes[i] }), fixe);
  check(JSON.stringify(avantFixe) === JSON.stringify(apresFixe), 'une case fixe a été modifiée');
  const remplie = cellules[2];
  const avantRemplie = await page.evaluate(i => ({ v: G.values[i], n: G.notes[i] }), remplie);
  await page.locator('#board .cell').nth(remplie).click();
  await page.waitForTimeout(80);
  const apresRemplie = await page.evaluate(i => ({ v: G.values[i], n: G.notes[i] }), remplie);
  check(JSON.stringify(avantRemplie) === JSON.stringify(apresRemplie), 'une case déjà remplie a reçu une note');

  await b.close();
  console.log(fails ? '\n' + fails + ' PROBLEME(S)' : '\nVERROU DE NOTE : chiffre gardé en main, pose d’un appui, relâche propre');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

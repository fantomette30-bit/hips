/* Vérifie la nouvelle règle des notes et le signal d'erreur sans couleur. */
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
  await page.locator('#levelList button').nth(0).click();
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 30000 });

  // --- notes : ordre croissant, sans trous, quel que soit l'ordre de saisie
  const notes = await page.evaluate(() => {
    const empty = G.values.findIndex(v => v === 0);
    G.sel = empty; G.noteMode = true;
    inputDigit(8); inputDigit(3); inputDigit(5);          // saisies dans le désordre
    G.noteMode = false;
    const cell = document.querySelectorAll('#board .cell')[empty];
    const shown = [...cell.querySelectorAll('.notes i')].map(e => e.textContent);
    const st = getComputedStyle(cell.querySelector('.notes'));
    return { empty, shown, display: st.display, count: shown.length };
  });
  check(notes.shown.join('') === '358', 'notes non triées : ' + notes.shown.join(','));
  check(notes.count === 3, notes.count + ' éléments affichés pour 3 notes (pas de cases vides attendues)');
  check(notes.display === 'flex', 'disposition des notes inattendue : ' + notes.display);

  // retirer une note conserve l'ordre
  const after = await page.evaluate(i => {
    G.sel = i; G.noteMode = true; inputDigit(3); G.noteMode = false;
    const cell = document.querySelectorAll('#board .cell')[i];
    return [...cell.querySelectorAll('.notes i')].map(e => e.textContent).join('');
  }, notes.empty);
  check(after === '58', 'ordre perdu après retrait : ' + after);

  // neuf notes tiennent dans la case sans déborder
  const nine = await page.evaluate(i => {
    G.sel = i; G.noteMode = true;
    for (let d = 1; d <= 9; d++) if (!has(G.notes[i], d)) inputDigit(d);
    G.noteMode = false;
    const cell = document.querySelectorAll('#board .cell')[i];
    const n = cell.querySelector('.notes');
    return { count: n.children.length, fits: n.scrollHeight <= cell.clientHeight + 1 };
  }, notes.empty);
  check(nine.count === 9 && nine.fits, 'neuf notes ne tiennent pas dans la case');
  await page.evaluate(i => { G.sel = i; erase(); }, notes.empty);

  // --- erreur : secousse immédiate + soulignement ondulé permanent
  const err = await page.evaluate(() => {
    const empty = G.values.findIndex(v => v === 0);
    G.sel = empty;
    inputDigit(G.puzzle.solution[empty] === 9 ? 1 : 9);
    const cell = document.querySelectorAll('#board .cell')[empty];
    const st = getComputedStyle(cell);
    return {
      empty,
      shaking: cell.classList.contains('shake'),
      err: cell.classList.contains('err'),
      deco: st.textDecorationLine + ' ' + st.textDecorationStyle
    };
  });
  check(err.shaking, 'pas de secousse à la saisie d’un chiffre faux');
  check(err.err, 'classe d’erreur absente');
  check(err.deco.includes('underline') && err.deco.includes('wavy'),
        'soulignement ondulé absent : ' + err.deco);

  // la secousse s'arrête, le soulignement reste
  await page.waitForTimeout(800);
  const later = await page.evaluate(i => {
    const cell = document.querySelectorAll('#board .cell')[i];
    const st = getComputedStyle(cell);
    return { shaking: cell.classList.contains('shake'), deco: st.textDecorationStyle };
  }, err.empty);
  check(!later.shaking, 'la secousse ne s’arrête pas');
  check(later.deco === 'wavy', 'le soulignement disparaît après la secousse');

  // une deuxième erreur au même endroit secoue à nouveau
  const again = await page.evaluate(i => {
    G.sel = i;
    const d1 = G.values[i];
    const wrong2 = [9, 8, 7, 6, 5, 4, 3, 2, 1].find(d => d !== d1 && d !== G.puzzle.solution[i]);
    inputDigit(wrong2);
    return document.querySelectorAll('#board .cell')[i].classList.contains('shake');
  }, err.empty);
  check(again, 'pas de secousse à la deuxième erreur sur la même case');

  // une bonne saisie ne déclenche ni secousse ni soulignement
  const good = await page.evaluate(i => {
    G.sel = i; erase();
    inputDigit(G.puzzle.solution[i]);
    const cell = document.querySelectorAll('#board .cell')[i];
    return { shaking: cell.classList.contains('shake'), err: cell.classList.contains('err') };
  }, err.empty);
  check(!good.shaking && !good.err, 'une bonne saisie déclenche le signal d’erreur');

  await browser.close();
  console.log(fails.length ? '\n' + fails.length + ' PROBLEME(S)' : '\nNOTES ET ERREURS : AUCUN PROBLEME');
  process.exit(fails.length ? 1 : 0);
})();

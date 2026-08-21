/* Non-régression des défauts trouvés par la revue adversariale. */
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ ...devices['iPhone 13'], offline: true });
  const p = await ctx.newPage();
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('  ECHEC:', m); } };
  p.on('pageerror', e => fails.push('exception JS: ' + e.message));
  await p.goto('file://' + require('path').join(__dirname, '../../Web/index.html'));
  await p.waitForTimeout(250);
  await p.locator('#levelList button').nth(0).click();
  await p.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 30000 });

  // — note unique = chiffre saisi : la valeur doit s'afficher
  const r6 = await p.evaluate(() => {
    const i = G.values.findIndex(v => v === 0);
    const d = G.puzzle.solution[i];
    G.sel = i; G.noteMode = true; inputDigit(d); G.noteMode = false;
    inputDigit(d);
    const cell = document.querySelectorAll('#board .cell')[i];
    return { domNotes: !!cell.querySelector('.notes'), text: cell.textContent.trim(), d };
  });
  check(!r6.domNotes && r6.text === String(r6.d), 'note unique = valeur : affichage bloqué (' + JSON.stringify(r6) + ')');

  // — secousse immédiate malgré pop, et sur une note identique
  const r7 = await p.evaluate(() => {
    const i = G.values.findIndex(v => v === 0);
    G.sel = i; inputDigit(G.puzzle.solution[i] === 9 ? 1 : 9);
    const cell = document.querySelectorAll('#board .cell')[i];
    const anim = getComputedStyle(cell).animationName;
    G.sel = i; erase();
    return { anim };
  });
  check(r7.anim.includes('cellShake'), 'la secousse ne démarre pas immédiatement (animation: ' + r7.anim + ')');

  // — flash = montant réellement appliqué
  const r5 = await p.evaluate(() => {
    G.points = 5;
    const i = G.values.findIndex(v => v === 0);
    G.sel = i; inputDigit(G.puzzle.solution[i] === 9 ? 1 : 9);
    const partial = document.getElementById('pointsFlash').textContent;
    G.sel = i; erase();
    G.points = 0;
    document.getElementById('pointsFlash').textContent = '';
    G.sel = i; inputDigit(G.puzzle.solution[i] === 9 ? 1 : 9);
    const empty = document.getElementById('pointsFlash').textContent;
    G.sel = i; erase();
    return { partial, empty };
  });
  check(r5.partial === '-5', 'flash au plancher partiel : ' + r5.partial + ' (attendu -5)');
  check(r5.empty === '', 'flash affiché alors que rien n’est déduit : « ' + r5.empty + ' »');

  // — indice sur case fausse : une seule charge, avec malus
  const r2 = await p.evaluate(() => {
    G.points = 500;
    const i = G.values.findIndex(v => v === 0);
    G.sel = i; inputDigit(G.puzzle.solution[i] === 9 ? 1 : 9);
    const h0 = G.hints, p0 = G.points;
    useHint(); useHint(); useHint();
    const r = { dh: G.hints - h0, dp: G.points - p0 };
    G.sel = i; erase();
    return r;
  });
  check(r2.dh === 1, 'indices comptés ' + r2.dh + ' fois pour le même signalement');
  check(r2.dp === -30, 'malus d’indice incorrect : ' + r2.dp + ' (attendu -30)');

  // — combo : atteint x2 et survit à une reprise
  const r13 = await p.evaluate(() => {
    G.combo = 11;
    const i = G.values.findIndex(v => v === 0);
    const before = G.points;
    G.scored[i] = 0;
    G.sel = i; inputDigit(G.puzzle.solution[i]);
    return G.points - before;
  });
  check(r13 === 20, 'multiplicateur maximal : +' + r13 + ' (attendu +20 = x2)');
  await p.evaluate(() => { G.combo = 7; saveGame(); });
  await p.reload();
  await p.waitForTimeout(350);
  await p.locator('#resumeCard').click();
  await p.waitForTimeout(250);
  check(await p.evaluate(() => G.combo) === 7, 'combo perdu à la reprise');

  // — victoire : restart inopérant, pas de double comptage
  const r1 = await p.evaluate(() => {
    let g = 0; while (!G.complete && g++ < 300) useHint();
    const won1 = JSON.parse(localStorage.getItem('zen.stats')).easy.won;
    $('#victory').classList.remove('on');
    restart();
    return { won1, blocked: G.complete, intact: !G.values.some((v, i) => v !== G.puzzle.solution[i]) };
  });
  check(r1.blocked && r1.intact, 'restart() reste possible après la victoire');

  // — migration : pas de refarming après reprise d'une ancienne sauvegarde
  await p.evaluate(() => quitGame());
  await p.locator('#levelList button').nth(0).click();
  await p.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 30000 });
  const r12 = await p.evaluate(() => {
    const i = G.values.findIndex(v => v === 0);
    G.sel = i; inputDigit(G.puzzle.solution[i]);
    const snap = { puzzle: G.puzzle, values: G.values.slice(), notes: G.notes.slice() };
    quitGame();
    localStorage.setItem('zen.game', JSON.stringify({ puzzle: snap.puzzle, values: snap.values, notes: snap.notes, elapsed: 10, mistakes: 0, hints: 0 }));
    resumeGame();
    const before = G.points;
    G.sel = i; erase(); inputDigit(G.puzzle.solution[i]);
    return G.points - before;
  });
  check(r12 === 0, 'refarming possible sur sauvegarde migrée : +' + r12);

  // — secousse dans une nouvelle partie sur une case déjà secouée
  const rSeq = await p.evaluate(() => {
    const i = G.values.findIndex(v => v === 0);
    G.sel = i; inputDigit(G.puzzle.solution[i] === 9 ? 1 : 9);   // secousse n°1
    G.sel = i; erase();
    quitGame();
    resumeGame();                                                 // nouvel objet G
    G.sel = i; inputDigit(G.puzzle.solution[i] === 9 ? 1 : 9);   // doit re-secouer
    return document.querySelectorAll('#board .cell')[i].classList.contains('shake');
  });
  check(rSeq, 'pas de secousse dans une nouvelle partie sur une case déjà secouée');

  await b.close();
  console.log(fails.length ? '\n' + fails.length + ' PROBLEME(S)' : '\nNON-REGRESSION REVUE : AUCUN PROBLEME');
  process.exit(fails.length ? 1 : 0);
})();

/* Les neuf lignes de la grille doivent avoir la même hauteur, qu'elles soient
   pleines, vides ou seulement annotées. On laisse les animations retomber
   avant de mesurer (une case qui « pop » est momentanément réduite). */
const { chromium, devices } = require('playwright');
const FILE = process.env.FILE || require('path').join(__dirname, '../../Web/index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ ...devices['iPhone 13'], offline: true });
  const page = await ctx.newPage();
  await page.goto('file://' + FILE);
  await page.waitForSelector('#levelList button');
  await page.locator('#levelList button').nth(0).click();
  await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 30000 });

  const hauteurs = async () => {
    await page.waitForTimeout(500);                       // les animations retombent
    return page.evaluate(() => {
      const c = document.querySelectorAll('#board .cell');
      const h = [];
      for (let r = 0; r < 9; r++) {
        // on prend la case la plus haute de la ligne : c'est la hauteur de ligne
        let max = 0;
        for (let k = 0; k < 9; k++) max = Math.max(max, c[r * 9 + k].getBoundingClientRect().height);
        h.push(Math.round(max * 10) / 10);
      }
      return h;
    });
  };

  const etats = {};
  etats.brut = await hauteurs();
  await page.evaluate(() => {
    for (let i = 0; i < 81; i++) { G.values[i] = (i < 36 || i >= 45) ? G.puzzle.solution[i] : 0; G.notes[i] = 0; }
    for (let i = 36; i < 45; i++) G.puzzle.givens[i] = 0;
    renderGame();
  });
  etats.ligneVide = await hauteurs();
  await page.evaluate(() => { G.notes[40] = 1 << 1; renderGame(); });
  etats.uneNote = await hauteurs();
  await page.evaluate(() => { G.values[40] = G.puzzle.solution[40]; renderGame(); });
  etats.unChiffre = await hauteurs();

  let pire = 0;
  for (const [tag, h] of Object.entries(etats)) {
    const ecart = Math.round((Math.max(...h) - Math.min(...h)) * 10) / 10;
    pire = Math.max(pire, ecart);
    console.log('  ' + tag.padEnd(11), JSON.stringify(h), '| écart', ecart, 'px');
  }
  await b.close();
  console.log(pire > 1 ? '\nLIGNES INEGALES : jusqu’à ' + pire + ' px d’écart' : '\nLIGNES : toutes de même hauteur');
  process.exit(pire > 1 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

/* Petits conforts de la 1.10 : notes du chiffre suivi mises en évidence,
   couleur de la barre du navigateur fidèle au thème imposé, stockage protégé
   dans l'app installée, écran de victoire tenant sur petit écran. */
const { chromium, devices } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '../../Web/index.html');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('  ECHEC:', m); } };
  const fresh = async (opts = {}, init) => {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], offline: true, ...opts });
    if (init) await ctx.addInitScript(init);
    const page = await ctx.newPage();
    page.on('pageerror', e => fails.push('exception JS: ' + e.message));
    await page.goto(URL);
    await page.waitForSelector('#levelList button');
    return { ctx, page };
  };
  const start = async page => {
    await page.locator('#levelList button').nth(0).click();
    await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on') && G, null, { timeout: 30000 });
  };

  // 1. notes du chiffre suivi
  {
    const { ctx, page } = await fresh();
    await start(page);
    /* On note, dans quatre cases vides, le chiffre d'une case donnée et un
       autre chiffre — par le pavé et la case, comme au doigt. */
    const plan = await page.evaluate(() => {
      const given = G.puzzle.givens.findIndex(v => v !== 0);
      const d = G.values[given], other = d === 9 ? 1 : d + 1;
      const empties = [];
      for (let i = 0; i < 81 && empties.length < 4; i++) if (G.values[i] === 0) empties.push(i);
      return { given, d, other, empties };
    });
    await page.locator('#toolNotes').click();
    for (const e of plan.empties.slice(0, 3)) {
      await page.locator('#board .cell').nth(e).click();
      await page.locator('#pad .key').nth(plan.d - 1).click();       // verrou + note
      await page.locator('#pad .key').nth(plan.d - 1).click();       // relâche le verrou
      await page.locator('#board .cell').nth(e).click();
    }
    await page.locator('#board .cell').nth(plan.empties[3]).click();
    await page.locator('#pad .key').nth(plan.other - 1).click();
    await page.locator('#pad .key').nth(plan.other - 1).click();
    await page.locator('#toolNotes').click();                       // sortie du mode Notes

    const focus = () => page.evaluate(() => [...document.querySelectorAll('#board .notes i.f')]
      .map(el => ({ cell: +el.closest('.cell').dataset.i, txt: el.textContent,
                    weight: getComputedStyle(el).fontWeight })));
    await page.locator('#board .cell').nth(plan.given).click();
    let f = await focus();
    check(f.length === 3, 'case ' + plan.d + ' choisie : ' + f.length + ' note(s) mise(s) en évidence au lieu de 3');
    check(f.every(x => x.txt === String(plan.d)), 'une autre note que le ' + plan.d + ' est mise en évidence');
    check(f.every(x => +x.weight >= 700), 'la note mise en évidence n’est pas en gras');
    check(f.every(x => plan.empties.slice(0, 3).includes(x.cell)), 'mise en évidence dans une case sans cette note');
    console.log('  case ' + plan.d + ' choisie :', f.length, 'notes mises en évidence');

    // une case vide choisie : rien n'est mis en avant
    await page.locator('#board .cell').nth(plan.empties[3]).click();
    check((await focus()).length === 0, 'case vide choisie : des notes restent mises en évidence');

    // verrou de note : le chiffre gardé en main est suivi
    await page.locator('#toolNotes').click();
    await page.locator('#board .cell').nth(plan.empties[3]).click();   // désélectionne
    await page.locator('#pad .key').nth(plan.other - 1).click();
    f = await focus();
    check(f.length === 1 && f[0].txt === String(plan.other), 'verrou sur ' + plan.other + ' : mise en évidence ' + JSON.stringify(f));
    await page.locator('#pad .key').nth(plan.other - 1).click();       // relâche
    await page.locator('#toolNotes').click();

    // réglage « Surligner les chiffres identiques » coupé : plus de mise en évidence
    await page.locator('#btnBack').click();
    await page.locator('#openSettings').click();
    await page.waitForTimeout(150);
    await page.locator('#visualToggles .row', { hasText: 'chiffres identiques' }).click();
    await page.locator('#sheetSettings [data-close]').click();
    await page.locator('#resumeCard').click();
    await page.waitForTimeout(200);
    await page.locator('#board .cell').nth(plan.given).click();
    check((await focus()).length === 0, 'réglage coupé : les notes sont encore mises en évidence');
    // …mais le verrou, lui, reste suivi : il fait partie du geste de saisie
    await page.locator('#toolNotes').click();
    await page.locator('#board .cell').nth(plan.given).click();
    await page.locator('#pad .key').nth(plan.d - 1).click();
    check((await focus()).length === 3, 'réglage coupé : le chiffre verrouillé n’est plus suivi');
    console.log('  case vide, verrou et réglage coupé : comportements attendus');
    await ctx.close();
  }

  // 2. couleur de la barre du navigateur (balises theme-color)
  {
    const { ctx, page } = await fresh({ colorScheme: 'light' });
    const metas = () => page.evaluate(() => [...document.querySelectorAll('meta[name="theme-color"]')].map(m => m.content));
    const choose = async t => {
      await page.locator('#openSettings').click();
      await page.locator('#segTheme button[data-theme="' + t + '"]').click();
      await page.locator('#sheetSettings [data-close]').click();
      await page.waitForTimeout(100);
    };
    let m = await metas();
    check(m.length >= 1 && m.every(c => c === '#EDEFF3'), 'auto + système clair : ' + m.join(', '));
    await choose('dark');
    m = await metas();
    check(m.every(c => c === '#0C1118'), 'Sombre imposé sous système clair : ' + m.join(', '));
    await page.emulateMedia({ colorScheme: 'dark' });
    await choose('light');
    m = await metas();
    check(m.every(c => c === '#EDEFF3'), 'Clair imposé sous système sombre : ' + m.join(', '));
    await choose('auto');
    m = await metas();
    check(m.every(c => c === '#0C1118'), 'auto + système sombre : ' + m.join(', '));
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(150);
    m = await metas();
    check(m.every(c => c === '#EDEFF3'), 'auto, bascule du système vers clair : ' + m.join(', '));
    console.log('  barre du navigateur : fidèle au thème dans les cinq cas');
    await ctx.close();
  }

  // 3. stockage protégé : demandé dans l'app installée seulement
  const STORAGE = persisted => `(() => {
    window.__persist = { asked: 0, checked: 0 };
    const s = navigator.storage;
    s.persisted = () => { window.__persist.checked++; return Promise.resolve(${persisted}); };
    s.persist = () => { window.__persist.asked++; return Promise.resolve(true); };
  })()`;
  for (const [label, installed, persisted, want] of [
    ['onglet Safari', false, false, 0],
    ['app installée', true, false, 1],
    ['app installée, déjà protégée', true, true, 0]
  ]) {
    const init = STORAGE(persisted) + (installed ? ';Object.defineProperty(navigator, "standalone", { get: () => true });' : '');
    const { ctx, page } = await fresh({}, init);
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => window.__persist);
    check(r.asked === want, label + ' : persist() appelé ' + r.asked + ' fois au lieu de ' + want);
    console.log('  ' + label + ' : persist() ×' + r.asked);
    await ctx.close();
  }

  // 4. écran de victoire : les trois boutons tiennent sans défiler, du SE au Pro Max
  for (const device of ['iPhone SE', 'iPhone 13', 'iPhone 13 Pro Max']) {
    const ctx = await browser.newContext({ ...devices[device], offline: true });
    const page = await ctx.newPage();
    page.on('pageerror', e => fails.push('exception JS: ' + e.message));
    await page.goto(URL);
    await page.waitForSelector('#levelList button');
    await start(page);
    await page.evaluate(() => { let g = 0; while (!G.complete && g++ < 300) useHint(); });
    await page.waitForSelector('#victory.on', { timeout: 5000 });
    const r = await page.evaluate(() => {
      const box = id => document.getElementById(id).getBoundingClientRect();
      const inside = b => b.top >= 0 && b.bottom <= window.innerHeight && b.left >= 0 && b.right <= window.innerWidth;
      const v = document.getElementById('victory');
      return { next: inside(box('vicNext')), home: inside(box('vicHome')), review: inside(box('vicReview')),
               scroll: v.scrollHeight > v.clientHeight + 1,
               oneLine: box('vicHome').height < 60 && box('vicReview').height < 60 };
    });
    check(r.next && r.home && r.review && !r.scroll, device + ' : écran de victoire incomplet ' + JSON.stringify(r));
    check(r.oneLine, device + ' : libellés des boutons sur deux lignes');
    console.log('  victoire sur ' + device + ' :', JSON.stringify(r));
    await ctx.close();
  }

  await browser.close();
  console.log(fails.length ? '\n' + fails.length + ' PROBLEME(S)' : '\nCONFORT 1.10 : AUCUN PROBLEME');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

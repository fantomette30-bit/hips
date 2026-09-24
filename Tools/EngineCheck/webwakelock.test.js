/* Écran allumé pendant la partie (API Screen Wake Lock) : le verrou est pris
   pendant le jeu effectif et rendu partout ailleurs — pause, accueil,
   victoire, arrière-plan, cinq minutes sans geste — puis repris au geste
   suivant. Le réglage permet de s'en passer, et un refus du navigateur
   n'entraîne jamais de redemandes en boucle. */
const { chromium, devices } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '../../Web/index.html');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('  ECHEC:', m); } };

  /* Faux verrou : il compte les demandes et les verrous tenus, et peut
     refuser sur commande. `hidden` simule le passage en arrière-plan. */
  const STUB = () => {
    const s = window.__wl = { requests: 0, held: [], refuse: false, hidden: false };
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => s.hidden });
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: {
      request(type) {
        s.requests++;
        if (s.refuse) return Promise.reject(new DOMException('refusé', 'NotAllowedError'));
        const lock = new EventTarget();
        lock.type = type; lock.released = false;
        lock.release = () => {
          if (!lock.released) {
            lock.released = true;
            s.held = s.held.filter(l => l !== lock);
            lock.dispatchEvent(new Event('release'));
          }
          return Promise.resolve();
        };
        s.held.push(lock);
        return Promise.resolve(lock);
      }
    } });
  };
  /* mode : 'faux' (verrou simulé), 'reel' (celui de Chromium) ou 'absent'
     (navigateur qui ne connaît pas l'API) */
  const fresh = async (mode = 'faux') => {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], offline: true });
    if (mode === 'faux') await ctx.addInitScript(STUB);
    if (mode === 'absent') await ctx.addInitScript(() => { delete Navigator.prototype.wakeLock; });
    const page = await ctx.newPage();
    page.on('pageerror', e => fails.push('exception JS: ' + e.message));
    await page.goto(URL);
    await page.waitForSelector('#levelList button');
    return { ctx, page };
  };
  const start = async (page, n = 0) => {
    await page.locator('#levelList button').nth(n).click();
    await page.waitForFunction(() => !document.querySelector('#loading').classList.contains('on'), null, { timeout: 30000 });
    await page.waitForTimeout(100);
  };
  const held = page => page.evaluate(() => window.__wl.held.length);
  const requests = page => page.evaluate(() => window.__wl.requests);

  // 1. cycle complet d'une partie
  {
    const { ctx, page } = await fresh();
    check(await held(page) === 0 && await requests(page) === 0, 'accueil : verrou demandé hors partie');
    await start(page);
    check(await held(page) === 1, 'partie lancée : écran non maintenu allumé');

    await page.locator('#pillClock').click();                 // pause
    await page.waitForTimeout(100);
    check(await held(page) === 0, 'pause : verrou non rendu');
    await page.locator('.paused-veil').click();               // toucher la grille reprend la partie
    await page.waitForTimeout(100);
    check(await held(page) === 1, 'reprise après pause : verrou non repris');

    await page.locator('#btnBack').click();
    await page.waitForTimeout(100);
    check(await held(page) === 0, 'retour à l’accueil : verrou non rendu');
    await page.locator('#resumeCard').click();
    await page.waitForTimeout(100);
    check(await held(page) === 1, 'reprise de la partie sauvegardée : verrou non repris');
    check(await held(page) <= 1, 'plusieurs verrous tenus à la fois');

    // passage en arrière-plan : le système rend l'écran, on le reprend au retour
    await page.evaluate(() => {
      window.__wl.hidden = true;
      window.__wl.held.slice().forEach(l => l.release());      // ce que fait le système
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(150);
    check(await held(page) === 0, 'arrière-plan : verrou encore tenu');
    await page.evaluate(() => { window.__wl.hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(150);
    check(await held(page) === 1, 'retour au premier plan : verrou non repris');

    // cinq minutes sans geste : l'écran peut de nouveau se mettre en veille
    await page.evaluate(() => { lastGesture = Date.now() - 5 * 60 * 1000 - 1000; });
    await page.waitForTimeout(1300);                            // un tic de chronomètre
    check(await held(page) === 0, 'inactivité : verrou non rendu au bout de cinq minutes');
    const before = await requests(page);
    await page.waitForTimeout(2200);
    check(await requests(page) === before, 'inactivité : le verrou est redemandé sans geste');
    await page.locator('#board .cell').nth(40).click();
    await page.waitForTimeout(100);
    check(await held(page) === 1, 'geste après inactivité : verrou non repris');

    // victoire : l'écran est rendu
    await page.evaluate(() => { let g = 0; while (!G.complete && g++ < 300) useHint(); });
    await page.waitForTimeout(200);
    check(await held(page) === 0, 'victoire : verrou non rendu');
    console.log('  cycle de partie : pris, rendu en pause, à l’accueil, en arrière-plan, après 5 min et à la victoire');
    await ctx.close();
  }

  // 2. réglage désactivé : aucune demande ; réactivé : de nouveau tenu
  {
    const { ctx, page } = await fresh();
    await page.locator('#openSettings').click();
    await page.waitForTimeout(150);
    const row = page.locator('#comfortToggles .row', { hasText: 'Garder l’écran allumé' });
    check(await row.count() === 1, 'réglage « Garder l’écran allumé » absent');
    await row.click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('zen.settings')).keepAwake);
    check(saved === false, 'réglage non enregistré');
    await page.locator('#sheetSettings [data-close]').click();
    await start(page);
    await page.locator('#board .cell').nth(10).click();
    await page.waitForTimeout(150);
    check(await requests(page) === 0, 'réglage désactivé : le verrou est quand même demandé');
    await page.locator('#btnBack').click();
    await page.locator('#openSettings').click();
    await page.waitForTimeout(150);
    await row.click();
    await page.locator('#sheetSettings [data-close]').click();
    await page.locator('#resumeCard').click();
    await page.waitForTimeout(150);
    check(await held(page) === 1, 'réglage réactivé : verrou non pris');
    console.log('  réglage : respecté dans les deux sens');
    await ctx.close();
  }

  // 3. refus du navigateur : pas de redemande à chaque seconde
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => { window.__wl.refuse = true; });
    await start(page);
    await page.waitForTimeout(3200);
    const n = await requests(page);
    check(n === 1, 'refus : ' + n + ' demandes en trois secondes au lieu d’une');
    await page.evaluate(() => { window.__wl.refuse = false; });
    await page.locator('#board .cell').nth(20).click();       // un geste : on retente
    await page.waitForTimeout(150);
    check(await held(page) === 1, 'refus levé : verrou non repris au geste suivant');
    console.log('  refus : une seule demande, reprise au geste suivant');
    await ctx.close();
  }

  // 4. navigateur sans l'API : réglage masqué, jeu intact
  {
    const { ctx, page } = await fresh('absent');
    const supported = await page.evaluate(() => 'wakeLock' in navigator);
    check(!supported, 'la simulation d’un navigateur sans API a échoué');
    await page.locator('#openSettings').click();
    await page.waitForTimeout(150);
    check(await page.locator('#comfortToggles .row', { hasText: 'écran' }).count() === 0,
          'sans API : le réglage est proposé pour rien');
    await page.locator('#sheetSettings [data-close]').click();
    await start(page);
    check(await page.locator('#board .cell').count() === 81, 'sans API : la partie ne démarre pas');
    console.log('  sans API : réglage masqué, partie normale');
    await ctx.close();
  }

  // 5. le vrai verrou de Chromium : pris en partie, rendu à l'accueil
  {
    const { ctx, page } = await fresh('reel');
    await start(page);
    const real = await page.evaluate(() => !!wakeLock && wakeLock.released === false);
    check(real, 'API réelle : verrou non obtenu en partie');
    await page.locator('#btnBack').click();
    await page.waitForTimeout(150);
    check(await page.evaluate(() => wakeLock === null), 'API réelle : verrou non rendu à l’accueil');
    console.log('  API réelle de Chromium : verrou pris puis rendu');
    await ctx.close();
  }

  await browser.close();
  console.log(fails.length ? '\n' + fails.length + ' PROBLEME(S)' : '\nECRAN ALLUME : AUCUN PROBLEME');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

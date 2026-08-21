/* Le mode Auto doit suivre le réglage clair/sombre du téléphone, en direct,
   même quand la page arrive avec un thème imposé par son enveloppe. */
const { chromium, devices } = require('playwright');
(async () => {
  const fails = [];
  const expect = (label, isDark, wantDark) => {
    const ok = isDark === wantDark;
    console.log(' ', label, ':', ok ? 'ok' : 'ECHEC');
    if (!ok) fails.push(label);
  };
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ ...devices['iPhone 13'], colorScheme: 'light' });
  const p = await ctx.newPage();
  const bg = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const dark = c => c.includes('12, 17, 24');
  await p.goto('file://' + require('path').join(__dirname, '../../Web/index.html'));
  await p.waitForTimeout(250);

  expect('auto + système clair', dark(await bg()), false);
  await p.emulateMedia({ colorScheme: 'dark' });
  await p.waitForTimeout(150);
  expect('auto + bascule système sombre', dark(await bg()), true);
  await p.emulateMedia({ colorScheme: 'light' });
  await p.waitForTimeout(150);
  expect('auto + retour système clair', dark(await bg()), false);

  // choix manuel Sombre, puis retour Auto
  await p.locator('#openSettings').click();
  await p.locator('#segTheme button[data-theme="dark"]').click();
  await p.waitForTimeout(150);
  expect('choix Sombre', dark(await bg()), true);
  await p.locator('#segTheme button[data-theme="auto"]').click();
  await p.waitForTimeout(150);
  expect('retour Auto', dark(await bg()), false);
  await p.locator('#sheetSettings [data-close]').click();

  // rechargement en auto
  await p.reload(); await p.waitForTimeout(300);
  expect('rechargé en auto', dark(await bg()), false);

  // scénario « hôte » : la page arrive avec data-theme="dark" déjà posé sur <html>
  // (c'est ce que fait l'enveloppe claude.ai quand le thème Claude est sombre)
  await p.evaluate(() => localStorage.removeItem('zen.settings'));
  await p.route('**/index.html', async route => {
    const fs = require('fs');
    route.fulfill({ contentType: 'text/html', body: '' });
  }).catch(() => {});
  await p.unroute('**/index.html').catch(() => {});
  const p2 = await ctx.newPage();
  await p2.addInitScript(() => {
    const stamp = () => document.documentElement && document.documentElement.setAttribute('data-theme', 'dark');
    if (document.documentElement) stamp();
    else new MutationObserver((m, o) => { if (document.documentElement) { stamp(); o.disconnect(); } }).observe(document, { childList: true });
  });
  await p2.goto('file://' + require('path').join(__dirname, '../../Web/index.html'));
  await p2.waitForTimeout(300);
  const bg2 = await p2.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect('hôte sombre + auto + système clair', dark(bg2), false);
  await b.close();
  console.log(fails.length ? '\n' + fails.length + ' PROBLEME(S)' : '\nTHEME AUTO : AUCUN PROBLEME');
  process.exit(fails.length ? 1 : 0);
})();

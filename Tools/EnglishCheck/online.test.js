/* Vérifie la correction en ligne sans dépenser un centime : le vrai relais
   (Tools/vercel-parlance/api/correct.js) tourne avec une API Claude et un
   stockage simulés. On contrôle le code d'accès, le compteur, le plafond
   bloquant, la file d'attente hors connexion et l'affichage dans l'application.
       NODE_PATH=<dossier contenant @anthropic-ai/sdk et @vercel/blob> node Tools/EnglishCheck/online.test.js */
const Module = require('module');
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');

const APP = path.join(__dirname, '../../English/app');
const RELAY = path.join(__dirname, '../vercel-parlance/api/correct.js');
const fails = []; const check = (c, m) => { if (!c) { fails.push(m); console.log('  ECHEC :', m); } };

/* ---- doublures : API Claude et Vercel Blob ---- */
const calls = [];
let nextUsage = { input_tokens: 2000, output_tokens: 1500 }, nextStop = 'end_turn';
const RESULT = { corrected: 'I sent the contract yesterday.', changes: [{ original: 'I have sent', corrected: 'I sent', type: 'grammar', explanation_fr: 'Repère passé : prétérit.' }], native_version: 'I sent the contract over yesterday.', register_fr: 'Registre adapté.', fluency_fr: 'Fluide.', priorities_fr: ['Prétérit avec un repère passé'] };
class APIError extends Error {}
class FakeAnthropic {
  constructor(o) { this.o = o; const create = async p => { calls.push(p); if (this.o.apiKey === 'bad') throw new FakeAnthropic.AuthenticationError('auth');
      const isChat = JSON.stringify(p.output_config.format.schema).includes('tip_fr');
      return { model: p.model, stop_reason: nextStop, usage: nextUsage, content: [{ type: 'text', text: JSON.stringify(isChat ? { reply: 'Fine, go on.', tip_fr: 'Bien.' } : RESULT) }] }; };
    this.messages = { create }; this.beta = { messages: { create } }; }
}
['AuthenticationError', 'RateLimitError', 'BadRequestError'].forEach(n => { FakeAnthropic[n] = class extends APIError {}; });
const store = new Map(); let etagN = 0;
const blob = {
  async get(p) { const o = store.get(p); if (!o) return null; return { statusCode: 200, stream: new Response(o.body).body, blob: { etag: o.etag } }; },
  async put(p, body, opt) { const o = store.get(p); if (opt.ifMatch && (!o || o.etag !== opt.ifMatch)) { const e = new Error('precondition failed'); e.name = 'BlobPreconditionFailedError'; throw e; } store.set(p, { body, etag: 'e' + (++etagN) }); return {}; }
};
const origLoad = Module._load;
Module._load = function (req, ...rest) { if (req === '@anthropic-ai/sdk') return FakeAnthropic; if (req === '@vercel/blob') return blob; return origLoad.call(this, req, ...rest); };

Object.assign(process.env, { ANTHROPIC_API_KEY: 'test', ACCESS_CODE: 'sesame-42', BLOB_READ_WRITE_TOKEN: 'x', MONTHLY_CAP_USD: '20' });
const handler = require(RELAY);
const spent = () => { const o = [...store.values()][0]; return o ? JSON.parse(o.body).usd : 0; };

/* ---- serveur : application + relais ---- */
const PORT = 8933;
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/correct')) return handler(req, res);
  const f = path.join(APP, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!f.startsWith(APP) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
});
const api = (method, body, code) => fetch('http://localhost:' + PORT + '/api/correct', { method, headers: { 'Content-Type': 'application/json', 'X-Access-Code': code == null ? 'sesame-42' : code }, body: body ? JSON.stringify(body) : undefined }).then(async r => ({ status: r.status, data: await r.json() }));

(async () => {
  await new Promise(r => server.listen(PORT, r));
  try {
    // 1. relais seul
    let r = await api('GET', null, 'wrong');
    check(r.status === 401, 'mauvais code accepté (GET)');
    r = await api('POST', { kind: 'write', text: 'Hello' }, 'wrong');
    check(r.status === 401 && calls.length === 0, 'mauvais code : l’API ne doit pas être appelée');
    r = await api('POST', { kind: 'write', text: 'I have sent the contract yesterday.', variety: 'uk', quality: 'best' });
    check(r.status === 200 && r.data.result.corrected === RESULT.corrected, 'correction refusée : ' + JSON.stringify(r.data));
    const c1 = 4 * 2000 / 1e6 + 20 * 1500 / 1e6;
    check(Math.abs(r.data.cost - c1) < 1e-9, 'coût mal calculé : ' + r.data.cost + ' au lieu de ' + c1);
    check(Math.abs(spent() - c1) < 1e-6, 'compteur faux après un appel : ' + spent());
    check(calls[0].model === 'claude-opus-5-5' && calls[0].fallbacks === 'default' && calls[0].output_config.effort === 'low', 'paramètres de l’appel « Best » inattendus');
    r = await api('POST', { kind: 'write', text: 'Hi there', quality: 'economy' });
    check(calls[1].model === 'claude-haiku-5-5' && !('fallbacks' in calls[1]), 'qualité « Economy » non appliquée');
    r = await api('POST', { kind: 'write', text: 'x'.repeat(7000) });
    check(r.status === 413 && calls.length === 2, 'texte trop long non refusé');
    console.log('  relais : code d’accès, coût, compteur, choix du modèle conformes');

    // 2. plafond : on place le compteur juste sous 20 $
    store.set([...store.keys()][0], { body: JSON.stringify({ usd: 19.95, calls: 10 }), etag: 'e' + (++etagN) });
    const before = calls.length;
    r = await api('POST', { kind: 'write', text: 'One more please.', quality: 'best' });
    check(r.status === 402 && r.data.error === 'cap', 'le plafond n’a pas bloqué la correction « Best »');
    check(calls.length === before, 'l’API a été appelée malgré le plafond');
    check(spent() <= 20, 'compteur au-dessus du plafond : ' + spent());
    r = await api('POST', { kind: 'write', text: 'Cheap one.', quality: 'economy' });
    check(r.status === 200, 'une correction « Economy » tenant dans le reste du budget devrait passer');
    check(spent() <= 20, 'compteur au-dessus du plafond après « Economy » : ' + spent());
    // réponse coupée : le coût réel est décompté, rien n'est perdu
    store.set([...store.keys()][0], { body: JSON.stringify({ usd: 1, calls: 0 }), etag: 'e' + (++etagN) });
    nextStop = 'max_tokens';
    r = await api('POST', { kind: 'write', text: 'Truncated.' });
    check(r.status === 502 && r.data.error === 'truncated' && Math.abs(spent() - (1 + c1)) < 1e-6, 'réponse tronquée : coût mal décompté (' + spent() + ')');
    nextStop = 'end_turn';
    // vingt appels en parallèle près du plafond : jamais de dépassement
    store.set([...store.keys()][0], { body: JSON.stringify({ usd: 19.5, calls: 0 }), etag: 'e' + (++etagN) });
    const burst = await Promise.all(Array.from({ length: 20 }, () => api('POST', { kind: 'write', text: 'Burst.' })));
    check(spent() <= 20 + 1e-9, 'appels simultanés : plafond dépassé (' + spent() + ')');
    console.log('  plafond : bloquant, y compris pour 20 appels simultanés (' + burst.filter(b => b.status === 200).length + ' acceptés, compteur ' + spent().toFixed(4) + ' $)');
    store.set([...store.keys()][0], { body: JSON.stringify({ usd: 0.5, calls: 3 }), etag: 'e' + (++etagN) });

    // 3. dans l'application
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await ctx.newPage();
    page.on('pageerror', e => fails.push('exception JS : ' + e.message));
    await page.goto('http://localhost:' + PORT + '/');
    await page.evaluate(() => { S.welcomed = true; saveNow(); location.hash = '#/settings'; });
    await page.waitForSelector('#oCode');
    await page.fill('#oCode', 'sesame-42'); await page.click('[data-act="saveCode"]');
    await page.waitForFunction(() => /This month: \$0\.50 of \$20\.00/.test(document.body.innerText), null, { timeout: 8000 }).catch(() => {});
    check(/This month: \$0\.50 of \$20\.00/.test(await page.innerText('body')), 'le budget du mois ne s’affiche pas dans les réglages');
    check(await page.evaluate(() => !JSON.stringify(Object.assign({}, S, { online: Object.assign({}, S.online, { code: '' }) })).includes('sesame-42')), 'le code d’accès se retrouverait dans l’export');

    // écrit : envoi après confirmation et anonymisation
    const w = await page.evaluate(() => DATA.skills.contract.writing.find(x => x.stage === 2).id);
    await page.evaluate(id => { location.hash = '#/write/' + id; }, w);
    await page.fill('#draft', 'Dear Mr Smith, I have sent the contract to John Carter yesterday (john.carter@acme.com).');
    const n0 = calls.length;
    await page.click('[data-act="online"]');
    await page.waitForSelector('#sendText');
    check(calls.length === n0, 'un envoi est parti sans confirmation');
    check(await page.locator('.warnline').count() === 1, 'les noms et l’adresse ne sont pas signalés');
    await page.click('[data-act="anonymiseNow"]');
    const anon = await page.inputValue('#sendText');
    check(!/Smith|Carter|john\.carter/.test(anon) && /\[Name\]/.test(anon) && /\[Email\]/.test(anon), 'anonymisation incomplète : ' + anon);
    await page.click('[data-act="sendNow"]');
    await page.waitForSelector('#model .doc ins', { timeout: 8000 });
    check(!/Smith|Carter/.test(calls[calls.length - 1].messages[0].content), 'un nom est parti vers l’API');
    check(await page.locator('#model .cmlist li').count() === 1, 'les corrections expliquées ne s’affichent pas');
    check(await page.evaluate(() => S.corrections.length === 1 && S.notebook.some(n => n.text === 'I sent') && S.errors.Grammar >= 1), 'la correction n’alimente pas l’historique, le carnet ou le tableau de bord');
    console.log('  écrit : confirmation, anonymisation, affichage, carnet conformes');

    // hors connexion : mise en file d'attente, puis envoi sur confirmation
    await page.evaluate(() => { location.hash = '#/freewrite'; });
    await page.waitForSelector('#fw');
    await page.fill('#fw', 'We has a meeting with the works council.');
    await ctx.setOffline(true);
    await page.click('[data-act="freeSend"]'); await page.click('[data-act="sendNow"]');
    check(await page.evaluate(() => S.queue.length === 1), 'le texte n’est pas mis en attente hors connexion');
    await ctx.setOffline(false);
    await page.evaluate(() => { location.hash = '#/practise'; });
    await page.waitForSelector('[data-act="flushQueue"]');
    const n1 = calls.length;
    await page.click('[data-act="flushQueue"]');
    check(calls.length === n1, 'la file d’attente est partie sans confirmation');
    await page.click('[data-act="sendNow"]');
    await page.waitForFunction(() => S.corrections.length === 2, null, { timeout: 8000 }).catch(() => {});
    check(await page.evaluate(() => S.corrections.length === 2 && S.queue.length === 0), 'la correction en attente n’a pas abouti');
    console.log('  hors connexion : file d’attente et envoi sur confirmation conformes');

    // conversation : désactivée par défaut
    await page.evaluate(() => { location.hash = '#/practise'; });
    check(await page.locator('a[href="#/converse"]').count() === 0, 'la conversation devrait être désactivée par défaut');
    await page.evaluate(() => { S.online.converse = true; location.hash = '#/converse'; });
    await page.locator('[data-act="convStart"]').first().click();
    await page.waitForSelector('.bubble.them p', { timeout: 8000 });
    await page.fill('#convIn', 'I think we should consult the works council first.');
    await page.click('[data-act="convSay"]');
    await page.waitForFunction(() => document.querySelectorAll('.bubble').length >= 3, null, { timeout: 8000 });
    await page.click('[data-act="convEnd"]');
    await page.waitForFunction(() => S.corrections.length === 3, null, { timeout: 8000 }).catch(() => {});
    check(await page.evaluate(() => S.corrections.length === 3), 'le bilan de la conversation n’est pas enregistré');
    console.log('  conversation : désactivée par défaut, échange et bilan conformes');

    // budget épuisé : message clair, rien n'est appelé
    store.set([...store.keys()][0], { body: JSON.stringify({ usd: 20, calls: 99 }), etag: 'e' + (++etagN) });
    await page.evaluate(() => { location.hash = '#/freewrite'; });
    await page.waitForSelector('#fw');
    await page.fill('#fw', 'Another text.');
    const n2 = calls.length;
    await page.click('[data-act="freeSend"]'); await page.click('[data-act="sendNow"]');
    await page.waitForSelector('#fwOut .warn', { timeout: 8000 });
    check(/budget is used up/.test(await page.innerText('#fwOut')) && calls.length === n2, 'plafond atteint : message absent ou API appelée');
    console.log('  budget épuisé : message affiché, aucun appel');
    await browser.close();
  } catch (e) { fails.push('arrêt : ' + e.message); console.log('  ARRÊT :', e.message); }
  server.close();
  console.log(fails.length ? '\n' + fails.length + ' défaut(s)' : '\nCorrection en ligne : tout est conforme');
  process.exit(fails.length ? 1 : 0);
})();

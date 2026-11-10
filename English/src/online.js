/* Parlance — online correction (étape 3).
   Tout passe par le relais /api/correct, qui garde la clé API, vérifie le code
   d'accès et applique le plafond mensuel. Rien ne part sans un geste explicite. */
const RELAY = 'api/correct';
const TYPE_LABEL = { grammar: 'Grammar', vocabulary: 'Vocabulary', register: 'Register', linking: 'Linking words', calque: 'French calque', spelling: 'Spelling', punctuation: 'Punctuation', style: 'Style' };
const ONLINE_ERR = {
  code: 'The access code is missing or wrong. Enter it in Settings › Online correction.',
  cap: 'This month’s budget is used up. Model answers stay available; online correction comes back next month.',
  not_configured: 'Online correction is not set up yet on the server.',
  api_key: 'The server’s API key is missing or invalid.',
  rate_limit: 'Too many requests at once. Try again in a minute.',
  too_long: 'This text is too long for one correction (6,000 characters at most).',
  refusal: 'The model declined this text. Nothing was corrected.',
  truncated: 'The answer was cut short. Try a shorter text.',
  offline: 'You are offline.'
};
let ONLINE_STATUS = null, BUSY = false;

/* ---------- appel au relais ---------- */
async function relay(method, body) {
  if (!navigator.onLine) throw Object.assign(new Error('offline'), { code: 'offline' });
  const res = await fetch(RELAY, { method, headers: { 'Content-Type': 'application/json', 'X-Access-Code': S.online.code || '' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  let data = {}; try { data = await res.json(); } catch (e) { }
  if (!res.ok) throw Object.assign(new Error(data.error || 'http ' + res.status), { code: data.error || 'upstream', data });
  return data;
}
async function refreshStatus() {
  try { ONLINE_STATUS = await relay('GET'); } catch (e) { ONLINE_STATUS = { error: e.code || 'upstream', configured: !(e.code === 'not_configured') }; }
  noteSpend(ONLINE_STATUS);
  return ONLINE_STATUS;
}
function noteSpend(st) {
  if (!st || st.spent == null || !st.cap) return;
  ONLINE_STATUS = Object.assign(ONLINE_STATUS || {}, st);
  const m = new Date().toISOString().slice(0, 7);
  if (st.spent >= st.cap / 2 && S.online.warned !== m) { S.online.warned = m; save(); toast('Half of this month’s budget is used: $' + st.spent.toFixed(2) + ' of $' + st.cap); }
}
const money = n => '$' + (Number(n) || 0).toFixed(2);
const errText = e => ONLINE_ERR[e && e.code] || 'The correction service did not answer. Your text is kept: try again later.';

/* ---------- anonymisation avant envoi ---------- */
const COMMON = new Set('I A An The This That These Those We You He She They It Our Your My His Her Their Dear Hi Hello Best Kind Regards Thanks Thank Please Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December HR CEO CFO COO CSE PSE NAO UES GDPR UK US USA EU France French English British American Paris London Group Board Works Council Mr Mrs Ms Dr OK Also However Further Following Regarding As If When While Although Since After Before In On At For With From To Of And But Or So Yes No Sincerely Yours'.split(' '));
function anonymise(text) {
  let out = text.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[Email]').replace(/(\+?\d[\d .-]{7,}\d)/g, '[Phone]');
  out = out.replace(/\b(Mr|Mrs|Ms|Dr)\.? [A-Z][\w'-]+/g, '$1 [Name]');
  out = out.replace(/(^|[^.!?\n]\s)([A-Z][a-zà-ÿ'-]+(?:\s[A-Z][a-zà-ÿ'-]+)*)/g, (m, pre, w) => COMMON.has(w.split(' ')[0]) ? m : pre + '[Name]');
  return out;
}
function suspects(text) { return /[\w.+-]+@[\w-]+\.\w/.test(text) || /\+?\d[\d .-]{7,}\d/.test(text) || /(^|[^.!?\n]\s)([A-Z][a-zà-ÿ'-]{2,})/.test(text.replace(/\b(I|HR|CEO|CSE|PSE|UK|US|EU)\b/g, '')); }

/* ---------- envoi avec confirmation ---------- */
let PENDING = null;
function askToSend(job) {
  if (!S.online.code) { sheet('<span class="reglabel">Online correction</span><h2>One-time set-up</h2><p>Enter your personal access code in Settings › Online correction.</p><div class="two"><button class="btn ghost" data-act="closeSheet">Later</button><button class="btn" data-act="goSettings">Open Settings</button></div>'); return; }
  PENDING = job;
  const flagged = suspects(job.text || '');
  sheet('<span class="reglabel">Before sending</span><h2>Send for correction?</h2>' +
    '<p class="frline" lang="fr">Ne transmettez ni nom de salarié, de client ou de société, ni donnée confidentielle.</p>' +
    (job.text ? '<textarea id="sendText" rows="7">' + esc(job.text) + '</textarea>' : '') +
    (flagged ? '<p class="warnline">' + icon('scale') + ' Names, emails or numbers may be in this text.</p>' : '') +
    '<div class="row">' + (job.text ? '<button class="btn ghost" data-act="anonymiseNow">Anonymise</button>' : '') + '<button class="btn" data-act="sendNow">' + icon('cloud') + ' Send' + (navigator.onLine ? '' : ' when back online') + '</button></div>' +
    '<p class="sub">Quality: ' + (S.online.quality === 'economy' ? 'Economy' : 'Best') + ' · this month ' + (ONLINE_STATUS && ONLINE_STATUS.spent != null ? money(ONLINE_STATUS.spent) + ' of ' + money(ONLINE_STATUS.cap) : 'budget capped at $20') + '</p>' +
    '<button class="btn ghost wide" data-act="closeSheet">Cancel</button>');
}
ACT.goSettings = () => { closeSheet(); go('settings'); };
ACT.anonymiseNow = () => { const ta = $('#sendText'); ta.value = anonymise(ta.value); toast('Names, emails and numbers replaced'); };
ACT.sendNow = async el => {
  if (!PENDING || BUSY) return;
  const job = PENDING; const ta = $('#sendText'); if (ta) job.text = ta.value.trim();
  if (job.text === '') { toast('Nothing to send.'); return; }
  if (!navigator.onLine) { S.queue.push(Object.assign({ t: Date.now() }, job)); save(); closeSheet(); toast('Saved: it will wait for your confirmation once you are online'); render(); return; }
  closeSheet(); await runJob(job);
};
async function runJob(job) {
  BUSY = true;
  const box = job.target ? $(job.target) : null;
  if (box) box.innerHTML = '<div class="card center pending"><div class="spinner"></div><p class="sub">Correcting… usually 10 to 30 seconds.</p></div>';
  try {
    const data = await relay('POST', { kind: job.kind, text: job.text, context: job.context, history: job.history, variety: V(), quality: S.online.quality });
    noteSpend(data);
    const rec = { id: 'c' + Date.now().toString(36), t: Date.now(), kind: job.kind, title: job.title || 'Free text', input: job.text || '', result: data.result, cost: data.cost };
    S.corrections.unshift(rec); S.corrections = S.corrections.slice(0, 60);
    learnFrom(data.result); save();
    if (box && document.contains(box)) { box.innerHTML = correctionHtml(rec); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else go('correction/' + rec.id);
  } catch (e) {
    if (box && document.contains(box)) box.innerHTML = '<div class="card warn"><p>' + esc(errText(e)) + '</p></div>';
    else toast(errText(e));
    if (e.code === 'offline') { S.queue.push(Object.assign({ t: Date.now() }, job)); save(); }
  } finally { BUSY = false; }
}
/* Les erreurs relevées nourrissent le carnet, la révision et le tableau de bord. */
function learnFrom(r) {
  if (!r || !Array.isArray(r.changes)) return;
  r.changes.forEach(c => { const k = TYPE_LABEL[c.type] || 'Other'; S.errors[k] = (S.errors[k] || 0) + 1; });
  r.changes.filter(c => c.corrected && c.corrected.length < 160).slice(0, 5).forEach(c => addNote(c.corrected, (c.original ? c.original + ' → ' : '') + (c.explanation_fr || '')));
}

/* ---------- affichage d'une correction ---------- */
function diffHtml(r) {
  let html = esc(r.corrected || '');
  (r.changes || []).forEach((c, i) => { const q = esc(c.corrected || ''); if (q && html.includes(q)) html = html.replace(q, '<ins data-n="' + (i + 1) + '">' + q + '</ins>'); });
  return html.split(/\n{2,}/).map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
}
function correctionHtml(rec) {
  const r = rec.result || {};
  return '<div class="card doc"><span class="reglabel">Corrected</span>' + diffHtml(r) + '</div>' +
    ((r.changes || []).length ? '<div class="card" lang="fr"><span class="reglabel">Corrections expliquées · ' + r.changes.length + '</span><ol class="cmlist">' + r.changes.map(c => '<li>' + chip(TYPE_LABEL[c.type] || c.type) + ' <del lang="en">' + esc(c.original) + '</del> → <b lang="en">' + esc(c.corrected) + '</b><br>' + esc(c.explanation_fr) + '</li>').join('') + '</ol></div>'
      : '<div class="card"><p>Nothing to correct: well done.</p></div>') +
    '<div class="card doc"><span class="reglabel">As a native would put it ' + chip(V().toUpperCase(), 'v-' + V()) + ' ' + sayBtn(r.native_version || '', V()) + '</span>' + para(r.native_version || '') + '</div>' +
    '<div class="card" lang="fr"><span class="reglabel">Registre et fluidité</span><p>' + esc(r.register_fr) + '</p><p>' + esc(r.fluency_fr) + '</p>' +
    ((r.priorities_fr || []).length ? '<span class="reglabel">Vos priorités</span><ul>' + r.priorities_fr.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>' : '') + '</div>' +
    '<p class="sub center">' + (rec.cost != null ? 'Cost of this correction: ' + money(rec.cost) + ' · ' : '') + 'Corrected phrases were added to your notebook.</p>';
}

/* ---------- points d'entrée dans l'application ---------- */
ACT.online = () => {
  const w = WRITING, text = (($('#draft') || {}).value || '').trim();
  if (!text) { toast('Write your text first.'); return; }
  askToSend({ kind: 'write', text, context: w ? w.brief : '', title: w ? w.title : 'Writing', target: '#model' });
};
function spokenFeedbackBox(question) {
  return '<details class="fold online-fold"><summary><b>' + icon('cloud') + ' Feedback on what I said</b><small>online</small></summary>' +
    '<p class="sub">Dictate or type what you said (the microphone key on the keyboard transcribes it), then send.</p>' +
    '<textarea id="spoken" rows="4" placeholder="What I said…"></textarea><button class="btn wide" data-act="spokenSend" data-q="' + esc(question) + '">Get feedback</button><div id="spokenOut"></div></details>';
}
ACT.spokenSend = el => { const t = ($('#spoken').value || '').trim(); if (!t) { toast('Write or dictate your answer first.'); return; } askToSend({ kind: 'speak', text: t, context: 'Answering: ' + el.dataset.q, title: 'Spoken answer', target: '#spokenOut' }); };

function onlinePractiseSection() {
  const q = S.queue.length;
  return section('Online correction',
    (q ? '<div class="card warn"><p><b>' + q + ' correction' + (q > 1 ? 's' : '') + ' waiting</b> since you were offline.</p><button class="btn" data-act="flushQueue">Review and send</button></div>' : '') +
    '<div class="grid"><a class="card tile" href="#/freewrite">' + icon('practise') + '<b>Correct any text</b><small>An email, minutes, a note</small></a>' +
    '<a class="card tile" href="#/corrections">' + icon('notebook') + '<b>My corrections</b><small>' + S.corrections.length + ' saved on this device</small></a>' +
    (S.online.converse ? '<a class="card tile" href="#/converse">' + icon('chat') + '<b>Conversation</b><small>Role play with feedback</small></a>' : '') + '</div>',
    'Sent only when you tap Send. Budget capped at $20 a month.');
}
ACT.flushQueue = () => { const job = S.queue.shift(); save(); if (job) askToSend(job); };

VIEWS.freewrite = () => {
  afterRender = main => { const ta = $('#fw', main); ta.value = S.drafts.__free || ''; ta.addEventListener('input', () => { S.drafts.__free = ta.value; save(); }); };
  return head('Correct any text', 'Paste or write an email, minutes, a note to a client.', 'practise') +
    '<div class="card"><label class="set">Context <small>(optional)</small><input id="fwCtx" type="text" placeholder="e.g. email to a US general counsel"></label><textarea id="fw" rows="10" placeholder="Your text…"></textarea>' +
    '<button class="btn wide" data-act="freeSend">' + icon('cloud') + ' Get it corrected</button></div><div id="fwOut"></div>';
};
ACT.freeSend = () => { const t = ($('#fw').value || '').trim(); if (!t) { toast('Write your text first.'); return; } askToSend({ kind: 'write', text: t, context: $('#fwCtx').value, title: 'Free text', target: '#fwOut' }); };

VIEWS.corrections = () => head('My corrections', 'Kept on this device, readable offline.', 'practise') +
  (S.corrections.length ? '<div class="card list">' + S.corrections.map(c => '<a href="#/correction/' + c.id + '"><span><b>' + esc(c.title) + '</b><small>' + new Date(c.t).toLocaleDateString('en-GB') + ' · ' + ((c.result && c.result.changes) || []).length + ' corrections' + (c.cost != null ? ' · ' + money(c.cost) : '') + '</small></span></a>').join('') + '</div>'
    : '<p class="empty">No correction yet.</p>');
VIEWS.correction = id => {
  const c = S.corrections.find(x => x.id === id); if (!c) { go('corrections'); return null; }
  return head(c.title, new Date(c.t).toLocaleString('en-GB'), 'corrections') + '<details class="fold"><summary><b>My original text</b></summary><div class="card doc">' + para(c.input) + '</div></details>' + correctionHtml(c);
};

/* ---------- conversation (désactivée par défaut) ---------- */
let CONV = null;
VIEWS.converse = () => {
  if (!S.online.converse) { go('settings'); return null; }
  const rps = [].concat(...READY().map(t => SK(t.id).roleplays));
  if (!CONV) return head('Conversation', 'Each exchange uses a little of the monthly budget.', 'practise') +
    '<div class="card list">' + rps.map(r => '<a href="#" data-act="convStart" data-id="' + r.id + '"><span><b>' + esc(r.title) + '</b><small>' + esc(r.situation).slice(0, 110) + '…</small></span></a>').join('') + '</div>';
  afterRender = main => { const i = $('#convIn', main); if (i) i.focus({ preventScroll: true }); const l = $('.conv', main); if (l) l.scrollTop = l.scrollHeight; };
  return head(CONV.title, '<button class="btn ghost small" data-act="convEnd">End and get my debrief</button>', 'practise') +
    '<div class="card conv">' + CONV.history.map(h => '<div class="bubble ' + h.role + '"><p>' + esc(h.text) + (h.role === 'them' ? ' ' + sayBtn(h.text, V()) : '') + '</p>' + (h.tip ? '<p class="tip" lang="fr">' + esc(h.tip) + '</p>' : '') + '</div>').join('') + (BUSY ? '<div class="bubble them"><div class="spinner small"></div></div>' : '') + '</div>' +
    '<div class="card"><textarea id="convIn" rows="3" placeholder="Your reply (the keyboard microphone transcribes speech)"></textarea><button class="btn wide" data-act="convSay">Send my reply</button></div><div id="convOut"></div>';
};
ACT.convStart = async el => {
  const r = findIn('roleplays', el.dataset.id); if (!r) return;
  if (!S.online.code) { askToSend({}); return; }
  CONV = { title: r.title, context: r.situation, history: [] }; render(); await convTurn();
};
async function convTurn() {
  BUSY = true; render();
  try {
    const data = await relay('POST', { kind: 'chat', context: CONV.context, history: CONV.history, variety: V(), quality: S.online.quality });
    noteSpend(data);
    const last = CONV.history[CONV.history.length - 1];
    if (last && last.role === 'me' && data.result.tip_fr) last.tip = data.result.tip_fr;
    CONV.history.push({ role: 'them', text: data.result.reply });
    BUSY = false; render(); Speech.say(data.result.reply, { variety: V() });
  } catch (e) { BUSY = false; render(); toast(errText(e)); }
}
ACT.convSay = async () => { if (BUSY) return; const t = ($('#convIn').value || '').trim(); if (!t) return; CONV.history.push({ role: 'me', text: t }); await convTurn(); };
ACT.convEnd = async () => {
  if (!CONV || !CONV.history.some(h => h.role === 'me')) { CONV = null; render(); return; }
  const job = { kind: 'debrief', context: CONV.context, history: CONV.history, title: 'Conversation: ' + CONV.title };
  CONV = null; go('corrections');
  toast('Preparing your debrief…');
  await runJob(job);
};

/* ---------- réglages ---------- */
function onlineSettingsCard() {
  const st = ONLINE_STATUS;
  afterRender = (prev => main => { if (prev) prev(main); if (navigator.onLine && S.online.code && !st) refreshStatus().then(() => { if (location.hash === '#/settings') render(); }); })(afterRender);
  const line = !navigator.onLine ? 'Offline: status will show when you are online.'
    : !S.online.code ? 'Enter your access code to switch it on.'
    : !st ? 'Checking…'
    : st.error === 'code' ? 'The access code is not recognised.'
    : st.configured === false ? 'Not set up yet on the server.'
    : st.spent != null ? 'This month: ' + money(st.spent) + ' of ' + money(st.cap) + ' · ' + (st.calls || 0) + ' corrections' : 'Not available right now.';
  const p = st && st.spent != null && st.cap ? Math.min(100, Math.round(100 * st.spent / st.cap)) : 0;
  return '<div class="card set"><span class="reglabel">Online correction</span><p class="sub">' + esc(line) + '</p>' + (st && st.spent != null ? bar(p, 'thin') : '') +
    '<label>Access code<input id="oCode" type="password" autocomplete="off" value="' + esc(S.online.code) + '" placeholder="Your personal code"></label><button class="btn ghost" data-act="saveCode">Save the code</button>' +
    '<label>Quality' + seg2('quality', [['best', 'Best · Opus'], ['economy', 'Economy · Haiku']]) + '</label>' +
    '<label>Conversation practice' + seg2('converse', [['false', 'Off'], ['true', 'On']]) + '</label>' +
    fr('<p>Le plafond de ' + money(st && st.cap || 20) + ' par mois est appliqué par le serveur : une correction n’est lancée que si son coût maximal tient dans le budget restant. Seule vous pouvez le modifier, dans Vercel (variable MONTHLY_CAP_USD).</p><p>Ordre de grandeur : quelques centimes par correction en qualité « Best », une fraction de centime en « Economy ».</p>', 'Budget') + '</div>';
}
const seg2 = (key, opts) => '<div class="seg">' + opts.map(o => '<button data-act="setOnline" data-k="' + key + '" data-v="' + o[0] + '" class="' + (String(S.online[key]) === o[0] ? 'on' : '') + '">' + o[1] + '</button>').join('') + '</div>';
ACT.setOnline = el => { let v = el.dataset.v; if (v === 'true' || v === 'false') v = v === 'true'; S.online[el.dataset.k] = v; save(); render(); };
ACT.saveCode = async () => { S.online.code = ($('#oCode').value || '').trim(); save(); ONLINE_STATUS = null; toast('Code saved'); if (S.online.code) await refreshStatus(); render(); };

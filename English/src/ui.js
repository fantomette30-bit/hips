/* Parlance — UI shell: icons, router, shared components, exercise engine. */
const IC = {
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6.5 10v9.5h11V10"/>',
  learn: '<path d="M4 5.5c3-1 5.5-.6 8 1 2.5-1.6 5-2 8-1v13c-3-1-5.5-.6-8 1-2.5-1.6-5-2-8-1z"/><path d="M12 6.5v13"/>',
  library: '<path d="M5 4h4v16H5zM10.5 4h4v16h-4z"/><path d="m16 6 3.5-1 3 13.5-3.5 1z" transform="translate(-1.5 0)"/>',
  practise: '<path d="M4 20l1-4L16.5 4.5l3 3L8 19z"/><path d="M14 7l3 3"/>',
  notebook: '<path d="M7 3.5h11v17H7z"/><path d="M4.5 7.5h4M4.5 12h4M4.5 16.5h4M11 8.5h4M11 12h4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  play: '<path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
  slow: '<path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M15.5 12h5"/>',
  mic: '<rect x="9" y="3.5" width="6" height="10.5" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>',
  ear: '<path d="M7 9.5a5 5 0 0 1 10 0c0 3-2.5 3.5-2.5 6a3 3 0 0 1-5.5 1.5"/><path d="M10 10a2 2 0 0 1 4 0"/>',
  back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  next: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  flame: '<path d="M12 3.5c.5 3.5 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.5 1 2 1.5 2 .5-2.5 0-5 1.5-8z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  cards: '<rect x="4" y="7" width="13" height="12" rx="2"/><path d="M8 4.5h10a2 2 0 0 1 2 2V16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M5 7.5h14M9.5 7.5V5h5v2.5M7 7.5l1 12h8l1-12"/>',
  cloud: '<path d="M7.5 18.5a4.5 4.5 0 0 1-.5-9 5.5 5.5 0 0 1 10.5 1.5 3.8 3.8 0 0 1-.5 7.5z"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M5 15.5V6.5a2 2 0 0 1 2-2h8.5"/>',
  star: '<path d="m12 4 2.4 5.1 5.6.7-4.1 3.8 1.1 5.5L12 16.4 7 19.1l1.1-5.5L4 9.8l5.6-.7z"/>',
  scale: '<path d="M12 4v16M6 20h12M5 8h14"/><path d="M5 8l-2.5 6a2.7 2.7 0 0 0 5 0zM19 8l-2.5 6a2.7 2.7 0 0 0 5 0z"/>',
  chat: '<path d="M4.5 5.5h15v10.5H11l-4.5 3.5v-3.5h-2z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  doc: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M10 12h5M10 15.5h5"/>',
  people: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.3"/><path d="M16.5 14.3a4.5 4.5 0 0 1 4 4.7"/>',
  layers: '<path d="m12 4 8 4-8 4-8-4z"/><path d="m4 12 8 4 8-4M4 16l8 4 8-4"/>',
  merge: '<path d="M6 4v4a6 6 0 0 0 6 6M18 4v4a6 6 0 0 1-6 6v6"/><path d="m9 17 3 3 3-3"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  alert: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17v.2"/>',
  door: '<path d="M13 4H6v16h7"/><path d="M10 12h10M17 8.5l3.5 3.5-3.5 3.5"/>',
  userplus: '<circle cx="10" cy="8.5" r="3.2"/><path d="M4 19.5a6 6 0 0 1 12 0M18.5 8v6M15.5 11h6"/>',
  coins: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
  shield: '<path d="M12 3.5 19 6v5.5c0 4.3-2.8 7.4-7 9-4.2-1.6-7-4.7-7-9V6z"/><path d="m9 12 2.2 2.2L15 10.5"/>',
  equal: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 10h7M8.5 14h7"/>',
  folder: '<path d="M3.5 7a2 2 0 0 1 2-2H10l2 2.5h6.5a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="m9 13.5 2 2 4-4"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5S9.5 5.8 12 3.5z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  trend: '<path d="M4 17l5.5-5.5 3.5 3.5L20 8"/><path d="M15 8h5v5"/>',
  bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  tiles: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  sort: '<path d="M4 7h10M4 12h7M4 17h4M17 6v12M14 15l3 3 3-3"/>'
};
const icon = (n, cls) => '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || '') + '</svg>';

/* ---------- shared fragments ---------- */
const sayBtn = (text, variety, slow) =>
  '<button class="ib" data-act="say" data-t="' + esc(plain(text)) + '" data-v="' + (variety || '') + '"' + (slow ? ' data-slow="1"' : '') +
  ' aria-label="Listen' + (slow ? ' slowly' : '') + '">' + icon(slow ? 'slow' : 'play') + (variety ? '<span class="tagv">' + variety.toUpperCase() + '</span>' : '') + '</button>';
const fr = (html, label) => html ? '<details class="fr"' + (S.settings.frHelp ? ' open' : '') + '><summary>' + (label || 'En français') + '</summary><div lang="fr">' + html + '</div></details>' : '';
const tools = () => '<div class="tools"><a class="ib" href="#/search" aria-label="Search">' + icon('search') + '</a><a class="ib" href="#/settings" aria-label="Settings">' + icon('gear') + '</a></div>';
const head = (title, sub, back) =>
  '<header class="head">' + (back != null ? '<a class="ib" href="#/' + back + '" aria-label="Back">' + icon('back') + '</a>' : '') +
  '<div><h1>' + esc(title) + '</h1>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + '</div>' + (back == null ? tools() : '') + '</header>';
const bar = (p, cls) => '<div class="bar ' + (cls || '') + '"><i style="width:' + Math.max(0, Math.min(100, p)) + '%"></i></div>';
const chip = (t, cls) => '<span class="chip ' + (cls || '') + '">' + esc(t) + '</span>';
const regLabel = { formal: 'Formal', everyday: 'Everyday', informal: 'Informal' };
const varChip = v => v && v !== 'both' ? chip(v.toUpperCase(), 'v-' + v) : '';
const doneTick = id => S.done[id] ? '<span class="tick">' + icon('check') + '</span>' : '';
const scoreRing = id => { const d = S.done[id]; return d ? '<span class="ring s ' + (d.s >= 80 ? 'gold' : '') + '" style="--p:' + d.s + '"><b>' + d.s + '</b></span>' : icon('next', 'chev'); };
const stripTags = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2800);
}
function sheet(html) { const s = $('#sheet'); s.innerHTML = '<div class="sheet-bg" data-act="closeSheet"></div><div class="sheet-card" role="dialog">' + html + '</div>'; s.hidden = false; }
function closeSheet() { $('#sheet').hidden = true; $('#sheet').innerHTML = ''; }

/* ---------- router ---------- */
const VIEWS = {}, ACT = {};
const TABS = [['', 'Today', 'home'], ['learn', 'Learn', 'learn'], ['library', 'Library', 'library'], ['practise', 'Practise', 'practise'], ['notebook', 'Notebook', 'notebook']];
const TAB_OF = { theme: 'learn', cards: 'learn', entry: 'learn', toolkit: 'learn', read: 'library', dialogue: 'library', write: 'practise', roleplay: 'practise', functional: 'practise',
  freewrite: 'practise', corrections: 'practise', correction: 'practise', converse: 'practise', review: '', placement: '', settings: 'settings', search: 'search', session: null };
let afterRender = null;
function go(hash) { if (location.hash === '#/' + hash) render(); else location.hash = '#/' + hash; }
function render() {
  Speech.stop();
  const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const name = parts[0] || 'home';
  const view = VIEWS[name] || VIEWS.home;
  afterRender = null;
  const html = view.apply(null, parts.slice(1));
  if (html == null) return; // la vue a redirigé
  const main = $('#main');
  main.innerHTML = '<div class="page" data-view="' + esc(name) + '">' + html + '</div>';
  const tab = name in TAB_OF ? TAB_OF[name] : (name === 'home' ? '' : name);
  document.body.classList.toggle('immersive', tab === null || !S.welcomed);
  $('#nav').innerHTML = '<div class="brand"><span class="mono">P</span>Parlance</div>' + TABS.map(t =>
    '<a href="#/' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + icon(t[2]) + '<span>' + t[1] + '</span></a>').join('') +
    '<a href="#/search" class="side ' + (tab === 'search' ? 'on' : '') + '">' + icon('search') + '<span>Search</span></a>' +
    '<a href="#/settings" class="side set ' + (tab === 'settings' ? 'on' : '') + '">' + icon('gear') + '<span>Settings</span></a>';
  window.scrollTo(0, 0);
  if (afterRender) afterRender(main);
}
window.addEventListener('hashchange', render);
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACT[el.dataset.act]; if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-chg]'); if (!el) return;
  const fn = ACT[el.dataset.chg]; if (fn) fn(el, e);
});
/* clavier (Mac, iPad avec clavier) : 1 à 4 pour répondre, Entrée pour continuer */
document.addEventListener('keydown', e => {
  if (!SESSION || location.hash !== '#/session' || e.metaKey || e.ctrlKey || e.altKey) return;
  const typing = /^(INPUT|TEXTAREA)$/.test((e.target.tagName || ''));
  if (!typing && /^[1-9]$/.test(e.key)) { const b = $$('.opt')[+e.key - 1]; if (b && !b.disabled) { e.preventDefault(); b.click(); } }
  else if (e.key === 'Enter' && !typing) { const n = $('#fb [data-act="nextQ"]') || $('.sess.end [data-act="quitSession"]'); if (n) { e.preventDefault(); n.click(); } }
});

ACT.say = el => {
  $$('.ib.playing').forEach(b => b.classList.remove('playing'));
  el.classList.add('playing');
  Speech.say(el.dataset.t, { variety: el.dataset.v || V(), slow: !!el.dataset.slow, onend: () => el.classList.remove('playing') });
  if (!Speech.ok) toast('Speech is not available on this device.');
};
ACT.closeSheet = closeSheet;
ACT.go = el => go(el.dataset.to);

/* Record / replay — bouton autonome : data-act="rec", le lecteur apparaît à côté */
ACT.rec = async el => {
  if (!Rec.ok) { toast('Recording is not available in this browser.'); return; }
  const box = el.closest('.recbox');
  if (Rec.active) {
    const url = await Rec.stop();
    el.classList.remove('live'); el.innerHTML = icon('mic') + '<span>Record again</span>';
    let a = $('audio', box); if (!a) { a = document.createElement('audio'); a.controls = true; box.appendChild(a); }
    a.src = url;
    return;
  }
  try { Speech.stop(); await Rec.start(); el.classList.add('live'); el.innerHTML = icon('stop') + '<span>Stop</span>'; }
  catch (err) { toast('Microphone access was refused.'); }
};
const recBox = label => '<div class="recbox"><button class="btn ghost" data-act="rec">' + icon('mic') + '<span>' + (label || 'Record myself') + '</span></button></div>';

/* ---------- exercise engine ---------- */
/* question : {tag, prompt(html), sub(html), audio:{text,variety}, explain(html), ref | refs, lenient, recap}
   et l'une des formes : options[] + answer · answers[] (+ model, selfmark) · match{pairs} · order{words, answer} */
let SESSION = null;
function startSession(cfg) {
  SESSION = Object.assign({ i: 0, ok: 0, results: [], t0: Date.now(), answered: false }, cfg);
  if (!SESSION.questions.length) { SESSION = null; toast('Nothing to practise here yet.'); return; }
  go('session');
}
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
VIEWS.session = () => {
  if (!SESSION) { go(''); return null; }
  const s = SESSION, n = s.questions.length;
  if (s.i >= n) return sessionEnd();
  const q = s.questions[s.i];
  s.answered = false; s.m = { sel: null, done: 0, errors: 0, wrong: {} };
  let body = '';
  if (q.options) {
    body = '<div class="opts">' + q.options.map((o, i) => '<button class="opt" data-act="answer" data-i="' + i + '" data-k="' + (i + 1) + '">' + (q.rawOptions ? o : esc(o)) + '</button>').join('') + '</div>';
  } else if (q.match) {
    const btn = (side, x) => '<button class="mbtn" data-act="matchPick" data-side="' + side + '" data-id="' + esc(x.id) + '"' + (x.lang ? ' lang="' + x.lang + '"' : '') + '>' + esc(x.text) + '</button>';
    body = '<div class="match">' + q.match.left.map((x, k) => btn('l', x) + btn('r', q.match.right[k])).join('') + '</div>';
  } else if (q.order) {
    body = '<div class="order"><div class="tray" id="tray" aria-label="Your sentence"></div><div class="bank">' + q.order.words.map((w, i) => '<button class="wchip" data-act="ordPick" data-i="' + i + '">' + esc(w) + '</button>').join('') + '</div>' +
      '<button class="btn wide" id="ordCheck" data-act="ordCheck" disabled>Check</button></div>';
  } else {
    body = '<form class="typed"><input id="ans" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Type your answer" aria-label="Your answer">' +
      '<button class="btn" data-act="check">Check</button></form>';
  }
  afterRender = main => {
    const inp = $('#ans', main); if (inp) { inp.focus({ preventScroll: true }); inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); s.answered ? ACT.nextQ() : ACT.check(); } }); }
    if (q.audio && q.autoplay !== false) setTimeout(() => Speech.say(q.audio.text, { variety: q.audio.variety }), 350);
  };
  return '<div class="sess"><div class="sess-top"><button class="ib" data-act="quitSession" aria-label="Close">' + icon('back') + '</button>' +
    bar(pct(s.i, n)) + '<span class="count">' + (s.i + 1) + ' / ' + n + '</span></div>' +
    '<div class="qcard"><span class="eyebrow">' + esc(q.label || q.tag || s.title) + '</span><div class="prompt">' + q.prompt + '</div>' +
    (q.audio ? '<div class="qaudio">' + sayBtn(q.audio.text, q.audio.variety || V()) + sayBtn(q.audio.text, q.audio.variety || V(), true) + '</div>' : '') +
    (q.sub ? '<div class="qsub">' + q.sub + '</div>' : '') + body + '<div id="fb"></div></div></div>';
};
function settle(q, good, note) {
  const s = SESSION; s.answered = true;
  s.results.push(good); if (good) s.ok++;
  S.answers[good ? 'ok' : 'ko']++;
  if (!good) S.errors[q.tag || 'Other'] = (S.errors[q.tag || 'Other'] || 0) + 1;
  const grade = (id, ok) => { if (!ok) srsGrade(id, 0); else if (!S.srs[id]) srsGrade(id, 2); if (ENTRY[id]) S.seen[id] = 1; };
  if (q.ref) grade(q.ref, good);
  if (q.refs) q.refs.forEach(id => grade(id, !s.m.wrong[id]));
  save();
  const right = q.options ? (q.rawOptions ? q.options[q.answer] : esc(q.options[q.answer])) : q.match ? '' : esc(q.model || (q.order ? q.order.answer : q.answers[0]));
  $('#fb').innerHTML = '<div class="fb ' + (good ? 'good' : 'bad') + '"><b>' + (note || (good ? 'Correct' : 'Not quite')) + '</b>' +
    (right && (!good || note) ? '<p class="right">' + right + '</p>' : '') + (q.explain || '') +
    '<button class="btn wide" data-act="nextQ">' + (s.i + 1 >= s.questions.length ? 'See my results' : 'Continue') + '</button></div>';
  $('#fb .btn').focus({ preventScroll: true });
  $('#fb').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
ACT.answer = el => {
  const s = SESSION; if (!s || s.answered) return;
  const q = s.questions[s.i], i = +el.dataset.i;
  $$('.opt').forEach((b, k) => { b.disabled = true; if (k === q.answer) b.classList.add('ok'); else if (k === i) b.classList.add('ko'); });
  settle(q, i === q.answer);
};
ACT.check = () => {
  const s = SESSION; if (!s || s.answered) return;
  const q = s.questions[s.i], inp = $('#ans'), val = inp.value.trim();
  if (!val) { inp.focus(); return; }
  inp.readOnly = true; $('.typed .btn').disabled = true;
  const good = q.answers.some(a => norm(a) === norm(val));
  if (good) { inp.classList.add('ok'); return settle(q, true); }
  const near = q.lenient && q.answers.some(a => { const x = norm(a), d = lev(x, norm(val)); return x.length >= 6 && d <= (x.length >= 14 ? 2 : 1); });
  if (near) { inp.classList.add('ok'); return settle(q, true, 'Correct — mind the spelling'); }
  if (q.selfmark) {
    s.answered = true;
    $('#fb').innerHTML = '<div class="fb neutral"><b>Compare with the model</b><p class="right">' + esc(q.model || q.answers[0]) + '</p>' + (q.explain || '') +
      '<div class="two"><button class="btn" data-act="selfmark" data-ok="1">Mine is equivalent</button><button class="btn ghost" data-act="selfmark" data-ok="">Not quite</button></div></div>';
    return;
  }
  inp.classList.add('ko'); settle(q, false);
};
ACT.selfmark = el => { const s = SESSION; s.answered = false; settle(s.questions[s.i], !!el.dataset.ok); };
ACT.matchPick = el => {
  const s = SESSION; if (!s || s.answered || el.classList.contains('done')) return;
  const q = s.questions[s.i], m = s.m, side = el.dataset.side;
  if (!m.sel || m.sel.dataset.side === side) { $$('.mbtn.sel').forEach(b => b.classList.remove('sel')); m.sel = el; el.classList.add('sel'); return; }
  const a = m.sel, b = el; m.sel = null; a.classList.remove('sel');
  if (a.dataset.id === b.dataset.id) {
    [a, b].forEach(x => { x.classList.add('done'); x.disabled = true; }); m.done++;
    if (m.done >= q.match.left.length) settle(q, m.errors === 0, m.errors ? null : 'All matched');
  } else {
    m.errors++; m.wrong[a.dataset.id] = 1; m.wrong[b.dataset.id] = 1;
    [a, b].forEach(x => { x.classList.add('ko'); setTimeout(() => x.classList.remove('ko'), 380); });
  }
};
function ordSync() { const left = $$('.bank .wchip:not(.used)').length; $('#ordCheck').disabled = left > 0; }
ACT.ordPick = el => {
  if (!SESSION || SESSION.answered) return;
  el.classList.add('used');
  const c = document.createElement('button'); c.className = 'wchip'; c.textContent = el.textContent; c.dataset.act = 'ordBack'; c.dataset.i = el.dataset.i;
  $('#tray').appendChild(c); ordSync();
};
ACT.ordBack = el => {
  if (!SESSION || SESSION.answered) return;
  const src = $('.bank .wchip[data-i="' + el.dataset.i + '"]'); if (src) src.classList.remove('used');
  el.remove(); ordSync();
};
ACT.ordCheck = () => {
  const s = SESSION; if (!s || s.answered) return;
  const q = s.questions[s.i], said = $$('#tray .wchip').map(b => b.textContent).join(' '), good = norm(said) === norm(q.order.answer);
  $('#tray').classList.add(good ? 'ok' : 'ko'); $('#ordCheck').hidden = true; $$('.order .wchip').forEach(b => { b.disabled = true; });
  settle(q, good);
};
ACT.nextQ = () => { if (!SESSION) return; SESSION.i++; render(); };
ACT.quitSession = () => { const back = SESSION ? SESSION.back : ''; SESSION = null; go(back || ''); };
function sessionEnd() {
  const s = SESSION, score = pct(s.ok, s.questions.length), mins = Math.max(1, Math.round((Date.now() - s.t0) / 60000));
  if (!s.finished) { s.finished = true; if (s.onFinish) s.message = s.onFinish(score, s) || ''; }
  const passed = score >= 80, missed = s.noRecap ? [] : s.questions.filter((q, i) => !s.results[i]);
  const row = q => {
    const e = q.ref && ENTRY[q.ref];
    if (e) return '<a href="#/entry/' + e.id + '"><span><b>' + esc(termOf(e)) + '</b><small lang="fr">' + esc(e.fr) + '</small></span>' + icon('next', 'chev') + '</a>';
    const right = q.options ? (q.rawOptions ? stripTags(q.options[q.answer]) : q.options[q.answer]) : (q.model || (q.order ? q.order.answer : q.answers ? q.answers[0] : ''));
    return '<a' + (q.href ? ' href="#/' + q.href + '"' : '') + '><span><b>' + esc(right || q.tag) + '</b><small>' + esc(stripTags(q.prompt).slice(0, 110)) + '</small></span></a>';
  };
  const burst = passed ? '<div class="burst" aria-hidden="true">' + Array.from({ length: 18 }, (_, i) => { const a = i / 18 * 6.283, r = 90 + (i * 37 % 60); return '<i style="--x:' + Math.round(Math.cos(a) * r) + 'px;--y:' + Math.round(Math.sin(a) * r) + 'px"></i>'; }).join('') + '</div>' : '';
  return '<div class="sess end">' + burst + '<div class="ring ' + (passed ? 'gold' : '') + '" style="--p:' + score + '"><b>' + score + '<small>%</small></b></div>' +
    '<h1>' + (score === 100 ? 'Flawless' : passed ? 'Well done' : 'Keep going') + '</h1><p class="sub">' + s.ok + ' of ' + s.questions.length + ' correct · ' + mins + ' min</p>' +
    (s.message ? '<p class="note">' + s.message + '</p>' : '') +
    '<button class="btn wide" data-act="quitSession">Done</button>' +
    (missed.length ? '<button class="btn ghost wide" data-act="retryMissed">Retry what I missed · ' + missed.length + '</button>' +
      '<div class="missed"><span class="reglabel">To look at again</span><div class="card list">' + missed.map(row).join('') + '</div></div>' : '') + '</div>';
}
ACT.retryMissed = () => {
  const s = SESSION, missed = s.questions.filter((q, i) => !s.results[i]);
  startSession({ title: s.title, back: s.back, questions: shuffle(missed) });
  render();
};

/* ---------- question builders from vocabulary entries ---------- */
const termOf = e => pick(e.term);
function entryFeedback(e) {
  const ev = e.registers.everyday;
  return '<div class="mini"><b>' + esc(termOf(e)) + '</b> ' + sayBtn(termOf(e), V()) + '<span class="fr-inline" lang="fr">' + esc(e.fr) + '</span>' +
    (ev ? '<p>' + mark(regEx(ev)) + '</p>' : '') + fr(esc(e.note_fr), 'Note') + '</div>';
}
function distract(e, pool, get, n) {
  const good = norm(get(e)), seen = new Set([good]), out = [];
  shuffle(pool).some(x => { const v = get(x), k = norm(v); if (v && !seen.has(k)) { seen.add(k); out.push(v); } return out.length >= n; });
  return out;
}
function mcq(options, correct) { const o = shuffle(options); return { options: o, answer: o.indexOf(correct) }; }
const QB = {
  fr(e, pool) {
    const d = distract(e, pool, termOf, 3); if (d.length < 3) return null;
    return Object.assign({ tag: 'Vocabulary', prompt: 'Which expression means <q lang="fr">' + esc(e.fr) + '</q>?', explain: entryFeedback(e), ref: e.id }, mcq(d.concat(termOf(e)), termOf(e)));
  },
  enfr(e, pool) {
    const d = distract(e, pool, x => x.fr, 3); if (d.length < 3) return null;
    return Object.assign({ tag: 'Meaning', prompt: 'What does <q lang="en">' + esc(termOf(e)) + '</q> mean?', audio: Speech.ok ? { text: termOf(e), variety: V() } : null, autoplay: false, explain: entryFeedback(e), ref: e.id }, mcq(d.concat(e.fr), e.fr));
  },
  listen(e, pool) {
    if (!Speech.ok) return null;
    const d = distract(e, pool, x => x.fr, 3); if (d.length < 3) return null;
    return Object.assign({ tag: 'Listening', prompt: 'Listen. What does it mean?', audio: { text: termOf(e), variety: V() }, explain: entryFeedback(e), ref: e.id }, mcq(d.concat(e.fr), e.fr));
  },
  def(e, pool) {
    const d = distract(e, pool, termOf, 3); if (d.length < 3) return null;
    return Object.assign({ tag: 'Vocabulary', prompt: esc(e.def), sub: 'Which term does this define?', explain: entryFeedback(e), ref: e.id }, mcq(d.concat(termOf(e)), termOf(e)));
  },
  cloze(e, pool) {
    const key = Math.random() < 0.5 && e.registers.formal ? 'formal' : 'everyday', r = e.registers[key]; if (!r) return null;
    const ex = regEx(r), t = target(ex); if (!t) return null;
    const d = distract({ x: t }, pool.map(p => ({ x: target(regEx(p.registers[key] || p.registers.everyday || {})) })), o => o.x, 3); if (d.length < 3) return null;
    return Object.assign({ tag: 'In context', prompt: blank(ex), sub: regLabel[key] + ' register — choose the missing words.', explain: entryFeedback(e), ref: e.id }, mcq(d.concat(t), t));
  },
  register(e) {
    const f = e.registers.formal, ev = e.registers.everyday, inf = e.registers.informal; if (!f || !ev) return null;
    const opts = uniq([pick(f), pick(ev)].concat(inf ? [pick(inf)] : [])); if (opts.length < 2) return null;
    const want = Math.random() < 0.5 ? 'formal' : 'everyday', correct = pick(e.registers[want]);
    const where = want === 'formal' ? 'In a contract or an official letter' : 'In a meeting or an email to a colleague';
    return Object.assign({ tag: 'Register', prompt: where + ', which wording fits best?', sub: '<span lang="fr">' + esc(e.fr) + '</span>',
      explain: '<div class="mini"><p><i>Formal</i> — ' + esc(pick(f)) + '</p><p><i>Everyday</i> — ' + esc(pick(ev)) + '</p>' + (inf ? '<p><i>Informal</i> — ' + esc(pick(inf)) + '</p>' : '') + fr(esc(e.note_fr), 'Note') + '</div>', ref: e.id }, mcq(opts, correct));
  },
  ukus(e) {
    const src = [e.term, e.registers.formal, e.registers.everyday, e.registers.informal].filter(differs)[0]; if (!src) return null;
    const want = Math.random() < 0.5 ? 'uk' : 'us';
    return Object.assign({ tag: 'UK / US', prompt: 'Which is the <b>' + (want === 'uk' ? 'British' : 'American') + '</b> wording?', sub: '<span lang="fr">' + esc(e.fr) + '</span>',
      explain: '<div class="mini"><p>' + chip('UK', 'v-uk') + ' ' + esc(src.uk) + '</p><p>' + chip('US', 'v-us') + ' ' + esc(src.us) + '</p>' + fr(esc(e.note_fr), 'Note') + '</div>', ref: e.id }, mcq([src.uk, src.us], src[want]));
  },
  type(e) {
    const answers = uniq([e.term.uk, e.term.us].concat(...['formal', 'everyday', 'informal'].map(k => e.registers[k] ? [e.registers[k].uk, e.registers[k].us] : [])).filter(Boolean));
    return { tag: 'Recall', prompt: 'Write the English for <q lang="fr">' + esc(e.fr) + '</q>', sub: esc(e.def), answers, model: termOf(e), lenient: true, explain: entryFeedback(e), ref: e.id };
  },
  dictation(e) {
    if (!Speech.ok) return null;
    const ev = e.registers.everyday || e.registers.formal; if (!ev) return null;
    const text = plain(regEx(ev));
    return { tag: 'Dictation', prompt: 'Listen and write the sentence.', audio: { text, variety: V() }, answers: [text], model: text, selfmark: true, lenient: true, explain: entryFeedback(e), ref: e.id };
  },
  order(e) {
    const cands = [e.registers.everyday, e.registers.formal].filter(Boolean).map(r => plain(regEx(r)).replace(/\s+/g, ' ').trim()).filter(t => { const n = t.split(' ').length; return n >= 4 && n <= 26; });
    if (!cands.length) return null;
    const answer = cands.sort((a, b) => a.split(' ').length - b.split(' ').length)[0], words = answer.split(' ');
    const size = Math.ceil(words.length / 8), seq = [];   // phrases longues : groupes de mots, huit étiquettes au plus
    for (let k = 0; k < words.length; k += size) seq.push(words.slice(k, k + size).join(' '));
    if (seq.length < 4) return null;
    let sh = shuffle(seq), guard = 0; while (sh.join(' ') === seq.join(' ') && guard++ < 8) sh = shuffle(seq);
    if (sh.join(' ') === seq.join(' ')) return null;
    return { tag: 'Word order', prompt: 'Rebuild the sentence.', sub: '<span lang="fr">' + esc(e.fr) + '</span> — ' + esc(termOf(e)), order: { words: sh, seq, answer }, model: answer, explain: entryFeedback(e), ref: e.id };
  },
  match(e, pool, entries) {
    const seen = new Set([norm(termOf(e)), norm(e.fr)]), set = [e];
    shuffle(entries.length >= 4 ? entries : pool).some(x => { const a = norm(termOf(x)), b = norm(x.fr); if (x !== e && !seen.has(a) && !seen.has(b) && termOf(x).length < 46 && x.fr.length < 60) { seen.add(a); seen.add(b); set.push(x); } return set.length >= 4; });
    if (set.length < 4 || termOf(e).length >= 46 || e.fr.length >= 60) return null;
    return { tag: 'Matching', prompt: 'Match each expression with its meaning.', match: { left: shuffle(set).map(x => ({ id: x.id, text: termOf(x) })), right: shuffle(set).map(x => ({ id: x.id, text: x.fr, lang: 'fr' })) }, refs: set.map(x => x.id),
      recap: set.map(x => termOf(x)).join(' · '), model: set.map(x => termOf(x)).join(' · '),
      explain: '<div class="mini">' + set.map(x => '<p><b>' + esc(termOf(x)) + '</b> <span class="fr-inline" lang="fr">' + esc(x.fr) + '</span></p>').join('') + '</div>' };
  }
};
const KINDS_MIX = ['fr', 'match', 'cloze', 'enfr', 'register', 'order', 'def', 'ukus', 'type', 'listen', 'cloze', 'dictation'];
function buildQuestions(entries, pool, n, kinds) {
  kinds = kinds || KINDS_MIX;
  const out = []; let k = 0, guard = 0;
  const list = shuffle(entries);
  while (out.length < n && guard++ < n * 14) {
    const e = list[guard % list.length], q = QB[kinds[k++ % kinds.length]](e, pool, entries);
    if (q) out.push(q);
  }
  return out;
}
/* questions rédigées dans le contenu (grammaire, connecteurs, lecture, test) */
function contentQuestion(x, tag, meta) {
  const ex = x.explain_fr ? fr(esc(x.explain_fr), 'Explication') : '';
  const q = x.options ? { tag, prompt: esc(x.prompt || x.q), options: x.options, answer: x.answer, explain: ex }
    : { tag, prompt: esc(x.prompt), answers: [x.answer].concat(x.accept || []), model: x.answer, selfmark: x.type !== 'gap', explain: ex };
  return Object.assign(q, meta || {});
}

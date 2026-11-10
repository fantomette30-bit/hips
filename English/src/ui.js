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
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
};
const icon = (n, cls) => '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || '') + '</svg>';

/* ---------- shared fragments ---------- */
const sayBtn = (text, variety, slow) =>
  '<button class="ib" data-act="say" data-t="' + esc(plain(text)) + '" data-v="' + (variety || '') + '"' + (slow ? ' data-slow="1"' : '') +
  ' aria-label="Listen' + (slow ? ' slowly' : '') + '">' + icon(slow ? 'slow' : 'play') + (variety ? '<span class="tagv">' + variety.toUpperCase() + '</span>' : '') + '</button>';
const listenRow = text => '<span class="listen">' + sayBtn(text, V()) + sayBtn(text, other(V())) + sayBtn(text, V(), true) + '</span>';
const fr = (html, label) => html ? '<details class="fr"' + (S.settings.frHelp ? ' open' : '') + '><summary>' + (label || 'En français') + '</summary><div lang="fr">' + html + '</div></details>' : '';
const head = (title, sub, back) =>
  '<header class="head">' + (back != null ? '<a class="ib" href="#/' + back + '" aria-label="Back">' + icon('back') + '</a>' : '') +
  '<div><h1>' + esc(title) + '</h1>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + '</div></header>';
const bar = (p, cls) => '<div class="bar ' + (cls || '') + '"><i style="width:' + Math.max(0, Math.min(100, p)) + '%"></i></div>';
const chip = (t, cls) => '<span class="chip ' + (cls || '') + '">' + esc(t) + '</span>';
const regLabel = { formal: 'Formal', everyday: 'Everyday', informal: 'Informal' };
const varChip = v => v && v !== 'both' ? chip(v.toUpperCase(), 'v-' + v) : '';
const doneTick = id => S.done[id] ? '<span class="tick">' + icon('check') + '</span>' : '';

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600);
}
function sheet(html) { const s = $('#sheet'); s.innerHTML = '<div class="sheet-bg" data-act="closeSheet"></div><div class="sheet-card" role="dialog">' + html + '</div>'; s.hidden = false; }
function closeSheet() { $('#sheet').hidden = true; $('#sheet').innerHTML = ''; }

/* ---------- router ---------- */
const VIEWS = {}, ACT = {};
const TABS = [['', 'Today', 'home'], ['learn', 'Learn', 'learn'], ['library', 'Library', 'library'], ['practise', 'Practise', 'practise'], ['notebook', 'Notebook', 'notebook']];
const TAB_OF = { theme: 'learn', cards: 'learn', entry: 'learn', toolkit: 'learn', read: 'library', dialogue: 'library', write: 'practise', roleplay: 'practise', functional: 'practise', review: '', settings: '', placement: '', session: null };
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
  document.body.classList.toggle('immersive', tab === null);
  $('#nav').innerHTML = '<div class="brand"><span class="mono">P</span><b>Parlance</b></div>' + TABS.map(t =>
    '<a href="#/' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + icon(t[2]) + '<span>' + t[1] + '</span></a>').join('') +
    '<a href="#/settings" class="set ' + (name === 'settings' ? 'on' : '') + '">' + icon('gear') + '<span>Settings</span></a>';
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
/* question: {tag, prompt(html), sub(html), audio:{text,variety}, options:[..], answer:idx  |  answers:[..], model, selfmark, explain(html), ref} */
let SESSION = null;
function startSession(cfg) {
  SESSION = Object.assign({ i: 0, ok: 0, results: [], t0: Date.now(), answered: false }, cfg);
  if (!SESSION.questions.length) { toast('Nothing to practise here yet.'); return; }
  go('session');
}
VIEWS.session = () => {
  if (!SESSION) { go(''); return null; }
  const s = SESSION, n = s.questions.length;
  if (s.i >= n) return sessionEnd();
  const q = s.questions[s.i];
  s.answered = false;
  let body = '';
  if (q.options) {
    body = '<div class="opts">' + q.options.map((o, i) => '<button class="opt" data-act="answer" data-i="' + i + '">' + (q.rawOptions ? o : esc(o)) + '</button>').join('') + '</div>';
  } else {
    body = '<form class="typed" data-act-submit="1"><input id="ans" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Type your answer" aria-label="Your answer">' +
      '<button class="btn" data-act="check">Check</button></form>';
  }
  afterRender = main => {
    const inp = $('#ans', main); if (inp) { inp.focus({ preventScroll: true }); inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); s.answered ? ACT.nextQ() : ACT.check(); } }); }
    if (q.audio && q.autoplay !== false) setTimeout(() => Speech.say(q.audio.text, { variety: q.audio.variety }), 350);
  };
  return '<div class="sess"><div class="sess-top"><button class="ib" data-act="quitSession" aria-label="Close">' + icon('back') + '</button>' +
    bar(pct(s.i, n)) + '<span class="count">' + (s.i + 1) + ' / ' + n + '</span></div>' +
    '<div class="qcard"><span class="eyebrow">' + esc(q.tag || s.title) + '</span><div class="prompt">' + q.prompt + '</div>' +
    (q.audio ? '<div class="qaudio">' + sayBtn(q.audio.text, q.audio.variety || V()) + sayBtn(q.audio.text, q.audio.variety || V(), true) + '</div>' : '') +
    (q.sub ? '<div class="qsub">' + q.sub + '</div>' : '') + body + '<div id="fb"></div></div></div>';
};
function settle(q, good, given) {
  const s = SESSION; s.answered = true;
  s.results.push(good); if (good) s.ok++;
  S.answers[good ? 'ok' : 'ko']++;
  if (!good) S.errors[q.tag || 'Other'] = (S.errors[q.tag || 'Other'] || 0) + 1;
  if (q.ref) { if (!good) srsGrade(q.ref, 0); else if (!S.srs[q.ref]) srsGrade(q.ref, 2); S.seen[q.ref] = 1; }
  save();
  const right = q.options ? (q.rawOptions ? q.options[q.answer] : esc(q.options[q.answer])) : esc(q.model || q.answers[0]);
  $('#fb').innerHTML = '<div class="fb ' + (good ? 'good' : 'bad') + '"><b>' + (good ? 'Correct' : 'Not quite') + '</b>' +
    (good && q.options ? '' : '<p class="right">' + right + '</p>') + (q.explain || '') +
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
  if (!good && q.selfmark) {
    s.answered = true;
    $('#fb').innerHTML = '<div class="fb neutral"><b>Compare with the model</b><p class="right">' + esc(q.model || q.answers[0]) + '</p>' + (q.explain || '') +
      '<div class="two"><button class="btn" data-act="selfmark" data-ok="1">Mine is equivalent</button><button class="btn ghost" data-act="selfmark" data-ok="">Not quite</button></div></div>';
    return;
  }
  settle(q, good, val);
};
ACT.selfmark = el => { const s = SESSION; s.answered = false; settle(s.questions[s.i], !!el.dataset.ok); };
ACT.nextQ = () => { if (!SESSION) return; SESSION.i++; render(); };
ACT.quitSession = () => { const back = SESSION ? SESSION.back : ''; SESSION = null; go(back || ''); };
function sessionEnd() {
  const s = SESSION, score = pct(s.ok, s.questions.length), mins = Math.max(1, Math.round((Date.now() - s.t0) / 60000));
  if (!s.finished) { s.finished = true; if (s.onFinish) s.message = s.onFinish(score, s) || ''; }
  const passed = score >= 80;
  return '<div class="sess end"><div class="ring ' + (passed ? 'gold' : '') + '" style="--p:' + score + '"><b>' + score + '<small>%</small></b></div>' +
    '<h1>' + (passed ? 'Well done' : 'Keep going') + '</h1><p class="sub">' + s.ok + ' of ' + s.questions.length + ' correct · ' + mins + ' min</p>' +
    (s.message ? '<p class="note">' + s.message + '</p>' : '') +
    '<button class="btn wide" data-act="quitSession">Done</button>' +
    (score < 100 ? '<button class="btn ghost wide" data-act="retryMissed">Retry what I missed</button>' : '') + '</div>';
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
    return { tag: 'Recall', prompt: 'Write the English for <q lang="fr">' + esc(e.fr) + '</q>', sub: esc(e.def), answers, model: termOf(e), explain: entryFeedback(e), ref: e.id };
  },
  dictation(e) {
    if (!Speech.ok) return null;
    const ev = e.registers.everyday || e.registers.formal; if (!ev) return null;
    const text = plain(regEx(ev));
    return { tag: 'Dictation', prompt: 'Listen and write the sentence.', audio: { text, variety: V() }, answers: [text], model: text, selfmark: true, explain: entryFeedback(e), ref: e.id };
  }
};
function buildQuestions(entries, pool, n, kinds) {
  kinds = kinds || ['fr', 'def', 'cloze', 'register', 'ukus', 'type', 'dictation', 'cloze', 'fr'];
  const out = []; let k = 0, guard = 0;
  const list = shuffle(entries);
  while (out.length < n && guard++ < n * 12) {
    const e = list[guard % list.length], q = QB[kinds[k++ % kinds.length]](e, pool);
    if (q) out.push(q);
  }
  return out;
}
/* questions rédigées dans le contenu (grammaire, connecteurs, lecture, test) */
function contentQuestion(x, tag) {
  const ex = x.explain_fr ? fr(esc(x.explain_fr), 'Explication') : '';
  if (x.options) return { tag, prompt: esc(x.prompt || x.q), options: x.options, answer: x.answer, explain: ex };
  return { tag, prompt: esc(x.prompt), answers: [x.answer].concat(x.accept || []), model: x.answer, selfmark: x.type !== 'gap', explain: ex };
}

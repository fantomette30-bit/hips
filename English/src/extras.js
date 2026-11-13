/* Parlance — séance du jour, entraînements de grammaire, favoris, recherche, mise à jour. */
const TH = {}; Object.keys(DATA.entries).forEach(t => DATA.entries[t].forEach(e => { TH[e.id] = t; }));
const GRAMMAR_TRACKS = [
  ['intermediate', 'Classic traps for French speakers', 'Tenses, prepositions, word order: the errors that give a French speaker away.'],
  ['legal', 'Legal and formal register', 'The grammar of contracts, policies and official letters.'],
  ['advanced', 'Polish', 'What makes a fluent speaker sound like a native professional.'],
  ['writing', 'Writing conventions', 'Punctuation, and British versus American usage.']
];

/* ---------- grammaire : questions, suivi des erreurs, entraînements ---------- */
const grammarQuestion = (g, i) => contentQuestion(g.exercises[i], 'Grammar', { label: g.title, gi: g.id + ':' + i, href: 'toolkit/grammar/' + g.id });
function trackGrammar(s) {
  s.questions.forEach((q, i) => {
    if (!q.gi) return;
    const cut = q.gi.lastIndexOf(':'), id = q.gi.slice(0, cut), n = +q.gi.slice(cut + 1), set = new Set(S.gmiss[id] || []);
    if (s.results[i]) set.delete(n); else set.add(n);
    if (set.size) S.gmiss[id] = Array.from(set); else delete S.gmiss[id];
  });
  save();
}
function grammarRun(pairs, title, back, onScore) {
  startSession({ title, back, questions: pairs.map(p => grammarQuestion(p[0], p[1])), onFinish: (score, s) => { trackGrammar(s); if (onScore) onScore(score); } });
}
function missedPairs(id) {
  const out = [];
  Object.keys(S.gmiss).forEach(k => { if (id && k !== id) return; const g = L.grammar.find(x => x.id === k); if (g) S.gmiss[k].forEach(i => { if (g.exercises[i]) out.push([g, i]); }); });
  return out;
}
/* n questions : d'abord les erreurs passées, puis les leçons jamais faites, puis les moins réussies */
function grammarPick(n, quick) {
  const fits = (g, i) => !quick || g.exercises[i].type !== 'rewrite';
  const out = shuffle(missedPairs().filter(p => fits(p[0], p[1]))).slice(0, Math.ceil(n / 2)), used = new Set(out.map(p => p[0].id + ':' + p[1]));
  const ranked = L.grammar.slice().sort((a, b) => (S.done[a.id] ? S.done[a.id].s : -1) - (S.done[b.id] ? S.done[b.id].s : -1)).slice(0, 3);
  let guard = 0;
  while (out.length < n && guard++ < 300) {
    const g = ranked[guard % ranked.length], i = Math.floor(Math.random() * g.exercises.length), k = g.id + ':' + i;
    if (!used.has(k) && fits(g, i)) { used.add(k); out.push([g, i]); }
  }
  return out;
}
ACT.grammarWorkout = () => grammarRun(grammarPick(12), 'Grammar workout', 'toolkit/grammar');
ACT.grammarRedo = el => { const id = el.dataset.id || ''; grammarRun(shuffle(missedPairs(id)).slice(0, 15), 'My mistakes', id ? 'toolkit/grammar/' + id : 'toolkit/grammar'); };
ACT.spotMistake = () => {
  const all = [];
  L.grammar.forEach(g => g.points.forEach(p => p.examples.forEach(x => { if (x.wrong && plain(x.wrong).trim() !== plain(x.right).trim()) all.push({ g, p, x }); })));
  const qs = sample(all, 12).map(o => Object.assign({ tag: 'Grammar', label: 'Spot the mistake · ' + o.g.title, prompt: 'Which sentence is correct?', href: 'toolkit/grammar/' + o.g.id,
    explain: '<div class="mini"><p>' + esc(o.p.rule) + '</p>' + fr(esc(o.x.note_fr || o.p.rule_fr), 'Explication') + '</div>' }, mcq([plain(o.x.wrong), plain(o.x.right)], plain(o.x.right))));
  startSession({ title: 'Spot the mistake', back: 'toolkit/grammar', questions: qs });
};

/* ---------- séance du jour ---------- */
function noteQuestion(n) {
  return (Speech.ok && Math.random() < 0.6) || !n.note
    ? { tag: 'Dictation', prompt: 'Listen and write.', audio: { text: n.text, variety: V() }, answers: [n.text], model: n.text, selfmark: true, lenient: true, ref: n.id }
    : { tag: 'Recall', prompt: 'From your notebook: <q>' + esc(n.note) + '</q>', answers: [n.text], model: n.text, selfmark: true, lenient: true, ref: n.id };
}
function dailyPicks() {
  const t = currentTheme(); let lv = 1;
  while (lv < 3 && (S.levels[t + ':' + lv] || 0) >= 80) lv++;
  const level = themeEntries(t, lv), due = shuffle(dueIds()).slice(0, 6), dueSet = new Set(due);
  const learning = level.filter(e => S.seen[e.id] && !mastered(e.id) && !dueSet.has(e.id)), unseen = level.filter(e => !S.seen[e.id]);
  return { t, lv, level, due, fresh: shuffle(learning).slice(0, 2).concat(unseen).slice(0, 5) };
}
function dailyPlan() {
  const p = dailyPicks(), mix = [];
  if (p.due.length) mix.push(p.due.length + ' to review');
  if (p.fresh.length) mix.push(p.fresh.length + ' expressions');
  mix.push('Grammar', 'Linking words');
  return { mix, minutes: Math.max(6, Math.round((p.due.length + p.fresh.length + 5) * 0.75)) };
}
ACT.daily = () => {
  const p = dailyPicks(), pool = themeEntries(p.t), qs = [];
  const firstOf = (e, kinds, tp) => { let q = null; kinds.some(k => (q = QB[k](e, tp, tp))); return q; };
  p.due.forEach(id => {
    const e = ENTRY[id];
    if (e) { const q = firstOf(e, shuffle(['fr', 'cloze', 'type', 'enfr', 'order']), themeEntries(TH[id])); if (q) qs.push(q); }
    else { const n = srsItem(id); if (n) qs.push(noteQuestion(n)); }
  });
  p.fresh.forEach(e => { const q = firstOf(e, S.seen[e.id] ? shuffle(['cloze', 'fr', 'order']) : ['enfr', 'fr', 'def'], pool); if (q) qs.push(q); });
  if (p.level.length >= 4) { const q = QB.match(p.fresh[0] || p.level[0], pool, p.level); if (q) qs.push(q); }
  grammarPick(3, true).forEach(x => qs.push(grammarQuestion(x[0], x[1])));
  const c = L.connectors[dayNum() % L.connectors.length], cx = c.exercises.filter(x => x.options);
  if (cx.length) qs.push(contentQuestion(cx[Math.floor(Math.random() * cx.length)], 'Linking words', { label: 'Linking words · ' + c.function, href: 'toolkit/connectors/' + c.id }));
  startSession({ title: 'Today’s session', back: '', questions: qs, onFinish: (score, s) => {
    S.daily[dayKey()] = Math.max(score, S.daily[dayKey()] || 0); trackGrammar(s); save();
    return 'Session complete. Little and often is what works: see you tomorrow.';
  } });
};

/* ---------- révision espacée : prochain rappel affiché sur chaque bouton ---------- */
function srsNext(id, q) {
  if (q === 0) return 'again today';
  const s = S.srs[id] || { i: 0, e: 2.5, r: 0 }, r = s.r + 1;
  const i = r === 1 ? 1 : r === 2 ? 3 : Math.max(s.i + 1, Math.round(s.i * s.e * (q === 1 ? 0.6 : q === 3 ? 1.3 : 1)));
  return i === 1 ? 'tomorrow' : i < 30 ? 'in ' + i + ' days' : 'in ' + Math.round(i / 30) + ' mo';
}

/* ---------- favoris ---------- */
ACT.star = el => {
  const id = el.dataset.id;
  if (S.stars[id]) delete S.stars[id]; else S.stars[id] = Date.now();
  save(); el.classList.toggle('starred', !!S.stars[id]); toast(S.stars[id] ? 'Starred: find it in your notebook' : 'Star removed');
};
const starred = () => Object.keys(S.stars).filter(id => ENTRY[id]).sort((a, b) => S.stars[b] - S.stars[a]).map(id => ENTRY[id]);
function starredSection() {
  const list = starred(); if (!list.length) return '';
  return section('Starred expressions', '<div class="card list">' + list.map(e => '<a href="#/entry/' + e.id + '"><span><b>' + esc(termOf(e)) + '</b><small lang="fr">' + esc(e.fr) + '</small></span>' + icon('next', 'chev') + '</a>').join('') + '</div>' +
    '<button class="btn ghost wide" data-act="starDrill">Drill my starred expressions</button>', 'Tap the star on any expression to keep it here.');
}
ACT.starDrill = () => { const list = starred(); startSession({ title: 'Starred', back: 'notebook', questions: buildQuestions(list, ALL_ENTRIES, Math.min(12, Math.max(4, list.length * 2)), list.length >= 4 ? KINDS_MIX : ['fr', 'enfr', 'cloze', 'type', 'order']) }); };

/* ---------- recherche dans tout le contenu ---------- */
const fold = s => norm(String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, ''));
let SEARCH_INDEX = null, SEARCH_Q = '';
function searchIndex() {
  if (SEARCH_INDEX) return SEARCH_INDEX;
  const reg = e => ['formal', 'everyday', 'informal'].map(k => e.registers[k] ? e.registers[k].uk + ' ' + e.registers[k].us : '').join(' ');
  SEARCH_INDEX = ALL_ENTRIES.map(e => ({ e, head: fold(e.term.uk + ' | ' + e.term.us), fr: fold(e.fr), all: fold(e.term.uk + ' ' + e.term.us + ' ' + e.fr + ' ' + reg(e) + ' ' + (e.collocations || []).join(' ')) }));
  return SEARCH_INDEX;
}
function searchResults(raw) {
  const q = fold(raw); if (q.length < 2) return '<p class="empty">Search ' + ALL_ENTRIES.length + ' expressions in English or in French, plus grammar and linking words.</p>';
  const score = x => x.head.startsWith(q) || x.fr.startsWith(q) ? 0 : x.head.includes(q) ? 1 : x.fr.includes(q) ? 2 : x.all.includes(q) ? 3 : 9;
  const hits = searchIndex().map(x => ({ x, s: score(x) })).filter(h => h.s < 9).sort((a, b) => a.s - b.s || a.x.head.length - b.x.head.length).slice(0, 40);
  const gram = L.grammar.filter(g => fold(g.title + ' ' + g.title_fr).includes(q));
  const conn = []; L.connectors.forEach(c => { if (fold(c.function + ' ' + c.function_fr).includes(q) || c.items.some(i => fold(i.text).includes(q))) conn.push(c); });
  if (!hits.length && !gram.length && !conn.length) return '<p class="empty">Nothing found for “' + esc(raw) + '”. Add it to your notebook?</p><a class="btn ghost wide" href="#/notebook">Open my notebook</a>';
  return (hits.length ? '<div class="card list">' + hits.map(h => '<a href="#/entry/' + h.x.e.id + '"><span><b>' + esc(termOf(h.x.e)) + '</b><small lang="fr">' + esc(h.x.e.fr) + '</small></span><em>' + esc(THEME(TH[h.x.e.id]).title) + '</em></a>').join('') + '</div>' : '') +
    (gram.length ? '<h3>Grammar</h3><div class="card list">' + gram.map(g => '<a href="#/toolkit/grammar/' + g.id + '"><span><b>' + esc(g.title) + '</b><small lang="fr">' + esc(g.title_fr) + '</small></span>' + icon('next', 'chev') + '</a>').join('') + '</div>' : '') +
    (conn.length ? '<h3>Linking words</h3><div class="card list">' + conn.map(c => '<a href="#/toolkit/connectors/' + c.id + '"><span><b>' + esc(c.function) + '</b><small lang="fr">' + esc(c.function_fr) + '</small></span>' + icon('next', 'chev') + '</a>').join('') + '</div>' : '');
}
VIEWS.search = () => {
  afterRender = main => {
    const inp = $('#q', main), out = $('#results', main);
    inp.addEventListener('input', () => { SEARCH_Q = inp.value; out.innerHTML = searchResults(SEARCH_Q); });
    if (!SEARCH_Q) inp.focus({ preventScroll: true });
  };
  return head('Search', '', '') + '<div class="searchbox">' + icon('search') + '<input id="q" type="search" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="e.g. notice period, reclassement, although" value="' + esc(SEARCH_Q) + '"></div>' +
    '<div id="results">' + searchResults(SEARCH_Q) + '</div>';
};

/* ---------- nouvelle version disponible ---------- */
window.addEventListener('parlance-update', () => {
  if ($('#update')) return;
  const d = document.createElement('div'); d.id = 'update'; d.setAttribute('role', 'status');
  d.innerHTML = 'New version ready <button data-act="reload">Update</button>';
  document.body.appendChild(d);
});
ACT.reload = () => { saveNow(); location.reload(); };

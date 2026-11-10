/* Parlance — screens. */
const L = DATA.language;
const SK = t => DATA.skills[t] || { reading: [], writing: [], dialogues: [], roleplays: [], functional: [] };
const THEME = id => DATA.themes.find(t => t.id === id);
const hasTheme = id => (DATA.entries[id] || []).length > 0;
const findIn = (key, id) => { for (const t of Object.keys(DATA.skills)) { const x = (DATA.skills[t][key] || []).find(o => o.id === id); if (x) return x; } return null; };
const card = (href, inner, cls) => '<a class="card link ' + (cls || '') + '" href="#/' + href + '"><div class="cl-body">' + inner + '</div>' + icon('next', 'chev') + '</a>';
const section = (title, inner, sub) => '<section><h2>' + esc(title) + '</h2>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + inner + '</section>';

/* ================= Today ================= */
function welcome() {
  return '<div class="welcome"><div class="mono big">P</div><h1>Parlance</h1><p class="lead">Legal &amp; HR English, the way educated native professionals actually speak and write it.</p>' +
    '<p class="sub" lang="fr">Vocabulaire du droit social et des RH, registres, variantes britannique et américaine, lecture, écrit et oral. Tout fonctionne hors connexion.</p>' +
    '<h2>Which English do you use most?</h2><div class="two"><button class="btn ' + (V() === 'uk' ? '' : 'ghost') + '" data-act="setVar" data-v="uk">British</button><button class="btn ' + (V() === 'us' ? '' : 'ghost') + '" data-act="setVar" data-v="us">American</button></div>' +
    '<p class="sub">The other variety always stays visible alongside.</p>' +
    '<button class="btn wide" data-act="welcomeDone" data-to="placement">Take the placement test · 10 min</button>' +
    '<button class="btn ghost wide" data-act="welcomeDone" data-to="">Skip for now</button></div>';
}
ACT.setVar = el => { S.settings.variety = el.dataset.v; save(); render(); };
ACT.welcomeDone = el => { S.welcomed = true; saveNow(); go(el.dataset.to); };

const READY = () => DATA.themes.filter(t => hasTheme(t.id));
const themeDone = t => (S.levels[t + ':3'] || 0) >= 80;
function currentTheme() {
  if (S.lastTheme && hasTheme(S.lastTheme) && !themeDone(S.lastTheme)) return S.lastTheme;
  const next = READY().find(t => !themeDone(t.id)); return (next || READY()[0]).id;
}
/* sections repliables par thème, celle du thème en cours ouverte */
function byTheme(key, row) {
  const cur = currentTheme(), ths = READY().filter(t => SK(t.id)[key].length);
  return ths.map(t => '<details class="fold"' + (t.id === cur || ths.length === 1 ? ' open' : '') + '><summary><b>' + esc(t.title) + '</b><small>' + SK(t.id)[key].filter(x => S.done[x.id]).length + ' / ' + SK(t.id)[key].length + '</small></summary><div class="card list">' + SK(t.id)[key].map(row).join('') + '</div></details>').join('');
}
function nextStep() {
  const t = currentTheme(); let lv = 1;
  while (lv < 3 && (S.levels[t + ':' + lv] || 0) >= 80) lv++;
  const list = themeEntries(t, lv), unseen = list.filter(e => !S.seen[e.id]);
  if (unseen.length) return { href: 'entry/' + unseen[0].id, title: 'Study level ' + lv + ' expressions', sub: unseen.length + ' still to discover in “' + THEME(t).title + '”' };
  return { href: 'theme/' + t, title: 'Practise level ' + lv, sub: 'Score 80% on the level check to unlock what comes next.' };
}
const SKILL_LABEL = { vocabulary: 'Vocabulary', grammar: 'Grammar & linking', reading: 'Reading', writing: 'Writing', speaking: 'Speaking', listening: 'Listening' };
const SKILL_LINK = { vocabulary: 'learn', grammar: 'toolkit/grammar', reading: 'library', writing: 'practise', speaking: 'practise', listening: 'library' };
VIEWS.home = () => {
  if (!S.welcomed) return welcome();
  const due = dueIds().length, m = minutesToday(), goal = S.settings.goal, sp = skillProgress(), st = streak(), ns = nextStep();
  const errs = Object.entries(S.errors).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const p = S.placement, stale = p && Date.now() - p.t > 60 * 864e5;
  const hello = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  return '<header class="hero"><div><p class="eyebrow">' + new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + '</p><h1>' + hello + '</h1></div>' +
    '<div class="ring ' + (m >= goal ? 'gold' : '') + '" style="--p:' + Math.min(100, pct(m, goal)) + '"><b>' + m + '<small>/' + goal + ' min</small></b></div></header>' +
    '<div class="stats"><div>' + icon('flame') + '<b>' + st + '</b><span>day streak</span></div><div>' + icon('cards') + '<b>' + due + '</b><span>to review</span></div><div>' + icon('star') + '<b>' + ALL_ENTRIES.filter(e => mastered(e.id)).length + '</b><span>mastered</span></div></div>' +
    card(ns.href, '<span class="eyebrow">Continue</span><b>' + esc(ns.title) + '</b><small>' + esc(ns.sub) + '</small>', 'feature') +
    (due ? card('review', '<span class="eyebrow">Spaced repetition</span><b>Review ' + due + ' item' + (due > 1 ? 's' : '') + '</b><small>What you are about to forget comes back first.</small>') : '') +
    (!p || stale ? card('placement', '<span class="eyebrow">' + (stale ? 'Two months on' : 'Recommended') + '</span><b>' + (stale ? 'Retake the placement test' : 'Take the placement test') + '</b><small>32 questions to set your priorities.</small>') : '') +
    section('Your skills', '<div class="card skills">' + Object.keys(SKILL_LABEL).map(k => '<a href="#/' + SKILL_LINK[k] + '"><span>' + SKILL_LABEL[k] + '</span>' + bar(sp[k]) + '<em>' + sp[k] + '%</em></a>').join('') + '</div>') +
    (p ? section('Placement', '<div class="card"><p><b>Estimated level: ' + esc(p.est) + '</b> · ' + new Date(p.t).toLocaleDateString('en-GB') + '</p><p class="sub">Priorities: ' + p.weak.map(k => '<a href="#/' + SKILL_LINK[k] + '">' + SKILL_LABEL[k] + '</a>').join(', ') + '</p></div>') : '') +
    (errs.length ? section('Where you slip most', '<div class="card errs">' + errs.map(e => '<div><span>' + esc(e[0]) + '</span>' + bar(pct(e[1], errs[0][1]), 'thin') + '<em>' + e[1] + '</em></div>').join('') + '</div>') : '') +
    '<p class="foot">' + icon('cloud') + ' <span id="net"></span></p>';
};
function netLabel() { const el = $('#net'); if (el) el.textContent = navigator.onLine ? 'Online — everything is also stored on this device.' : 'Offline — everything works from this device.'; }
window.addEventListener('online', netLabel); window.addEventListener('offline', netLabel);

/* ================= Learn ================= */
const TOOLKIT = [
  ['connectors', 'Linking words', 'link', () => L.connectors.length + ' functions, three registers'],
  ['softeners', 'Tact and softeners', 'chat', () => 'Bad news, requests, disagreement'],
  ['markers', 'Spoken markers', 'ear', () => L.spoken_markers.length + ' words natives lean on'],
  ['rhythm', 'Sentence rhythm', 'scale', () => 'From heavy to natural'],
  ['grammar', 'Grammar', 'learn', () => L.grammar.length + ' lessons with production drills'],
  ['pron', 'Pronunciation', 'mic', () => L.pronunciation.length + ' lessons, listen and record'],
  ['numbers', 'Numbers, dates, spelling', 'clock', () => 'Said the British and the American way']
];
VIEWS.learn = () => head('Learn', 'Themes, then the language that holds them together.') +
  section('Themes', DATA.themes.map((t, i) => {
    const list = themeEntries(t.id);
    if (!list.length) return '<div class="card locked"><span class="num">' + (i + 1) + '</span><div><b>' + esc(t.title) + '</b><small>' + esc(t.blurb) + '</small><small class="soon">' + icon('lock') + ' Coming in the next stage</small></div></div>';
    const seen = list.filter(e => S.seen[e.id]).length;
    return card('theme/' + t.id, '<span class="num">' + (i + 1) + '</span><div><b>' + esc(t.title) + '</b><small>' + esc(t.blurb) + '</small>' + bar(pct(seen, list.length), 'thin') + '<small>' + seen + ' of ' + list.length + ' expressions discovered</small></div>', 'theme');
  }).join('')) +
  section('Language toolkit', '<div class="grid">' + TOOLKIT.map(t => '<a class="card tile" href="#/toolkit/' + t[0] + '">' + icon(t[2]) + '<b>' + t[1] + '</b><small>' + t[3]() + '</small></a>').join('') + '</div>');

VIEWS.theme = id => {
  const t = THEME(id); if (!t || !hasTheme(id)) { go('learn'); return null; }
  const all = themeEntries(id), k = SK(id);
  if (S.lastTheme !== id) { S.lastTheme = id; save(); }
  return head(t.title, '<span lang="fr">' + esc(t.title_fr) + '</span>', 'learn') +
    [1, 2, 3].map(lv => {
      const list = themeEntries(id, lv), open = levelOpen(id, lv), best = S.levels[id + ':' + lv] || 0, seen = list.filter(e => S.seen[e.id]).length;
      if (!list.length) return '';
      return '<div class="card level ' + (open ? '' : 'locked') + '"><div class="lv-head"><span class="num">' + lv + '</span><div><b>' + ['Core', 'Intermediate', 'Advanced'][lv - 1] + '</b><small>' + list.length + ' expressions · ' + seen + ' discovered' + (best ? ' · best check ' + best + '%' : '') + '</small></div>' + (best >= 80 ? '<span class="tick">' + icon('check') + '</span>' : '') + '</div>' +
        (open ? bar(pct(seen, list.length), 'thin') + '<div class="row"><a class="btn ghost" href="#/cards/' + id + '/' + lv + '">Study</a><button class="btn ghost" data-act="practise" data-t="' + id + '" data-l="' + lv + '">Practise</button><button class="btn" data-act="levelCheck" data-t="' + id + '" data-l="' + lv + '">Level check</button></div>'
          : '<small class="soon">' + icon('lock') + ' Score 80% on the level ' + (lv - 1) + ' check to open this level.</small>') + '</div>';
    }).join('') +
    section('Focused drills', '<div class="grid"><button class="card tile" data-act="drill" data-t="' + id + '" data-k="register">' + icon('scale') + '<b>Register</b><small>Formal or everyday?</small></button>' +
      '<button class="card tile" data-act="drill" data-t="' + id + '" data-k="ukus">' + icon('chat') + '<b>UK / US</b><small>Tell the two apart</small></button>' +
      '<button class="card tile" data-act="drill" data-t="' + id + '" data-k="dictation">' + icon('ear') + '<b>Dictation</b><small>Natural sentences</small></button>' +
      '<button class="card tile" data-act="drill" data-t="' + id + '" data-k="type">' + icon('practise') + '<b>Recall</b><small>Write it from memory</small></button></div>') +
    section('In this theme', '<div class="grid"><a class="card tile" href="#/library">' + icon('library') + '<b>' + k.reading.length + ' documents</b><small>to read and decode</small></a><a class="card tile" href="#/library">' + icon('ear') + '<b>' + k.dialogues.length + ' dialogues</b><small>to listen to</small></a><a class="card tile" href="#/practise">' + icon('practise') + '<b>' + k.writing.length + ' writing tasks</b><small>with model answers</small></a><a class="card tile" href="#/practise">' + icon('mic') + '<b>' + k.roleplays.length + ' role plays</b><small>timed, recorded</small></a></div>') +
    section('French notions to explain', '<div class="card list">' + all.filter(e => e.french_concept).map(e => '<a href="#/entry/' + e.id + '"><span lang="fr">' + esc(e.fr) + '</span><em>' + esc(termOf(e)) + '</em></a>').join('') + '</div>', 'No direct equivalent abroad: how to put them across.');
};
const openEntries = t => themeEntries(t).filter(e => levelOpen(t, e.level));
ACT.practise = el => { const t = el.dataset.t, lv = +el.dataset.l, list = themeEntries(t, lv); startSession({ title: 'Practice', back: 'theme/' + t, questions: buildQuestions(list, themeEntries(t), 12) }); };
ACT.levelCheck = el => {
  const t = el.dataset.t, lv = +el.dataset.l, list = themeEntries(t, lv);
  startSession({ title: 'Level ' + lv + ' check', back: 'theme/' + t, questions: buildQuestions(list, themeEntries(t), 20, ['fr', 'cloze', 'def', 'register', 'type', 'ukus', 'cloze', 'dictation']),
    onFinish: score => { const k = t + ':' + lv; S.levels[k] = Math.max(S.levels[k] || 0, score); save(); return score >= 80 ? (lv < 3 ? 'Level ' + (lv + 1) + ' is now open.' : 'You have completed this theme.') : 'You need 80% to open the next level. Review the cards, then try again.'; } });
};
ACT.drill = el => { const t = el.dataset.t, k = el.dataset.k, list = openEntries(t); startSession({ title: 'Drill', back: 'theme/' + t, questions: buildQuestions(list, themeEntries(t), 12, [k]) }); };

VIEWS.cards = (t, lv) => {
  lv = +lv; const list = themeEntries(t, lv); if (!list.length) { go('learn'); return null; }
  return head('Level ' + lv + ' · ' + THEME(t).title, list.length + ' expressions', 'theme/' + t) +
    '<div class="card list entries">' + list.map(e => '<a href="#/entry/' + e.id + '"><span><b>' + esc(termOf(e)) + '</b>' + (S.settings.frHelp ? '<small lang="fr">' + esc(e.fr) + '</small>' : '') + '</span>' +
      (mastered(e.id) ? '<i class="dot gold" title="Mastered"></i>' : S.seen[e.id] ? '<i class="dot" title="Seen"></i>' : '') + '</a>').join('') + '</div>';
};
VIEWS.entry = id => {
  const e = ENTRY[id]; if (!e) { go('learn'); return null; }
  const t = Object.keys(DATA.entries).find(k => DATA.entries[k].includes(e)), list = themeEntries(t, e.level), i = list.indexOf(e);
  if (!S.seen[id]) { S.seen[id] = 1; if (!S.srs[id]) S.srs[id] = { i: 0, e: 2.5, r: 0, l: 0, d: dayNum() + 1 }; save(); }
  const v = V(), o = other(v), diff = differs(e.term);
  const reg = k => { const r = e.registers[k]; if (!r) return ''; const d = differs(r);
    return '<div class="reg reg-' + k + '"><span class="reglabel">' + regLabel[k] + '</span><p class="regterm">' + esc(pick(r)) + ' ' + sayBtn(pick(r), v) + (d ? '<span class="alt">' + chip(o.toUpperCase(), 'v-' + o) + ' ' + esc(r[o]) + '</span>' : '') + '</p>' +
      '<p class="ex">' + mark(regEx(r)) + ' ' + sayBtn(regEx(r), v) + sayBtn(regEx(r), v, true) + '</p>' + (r.ex_us && v === 'uk' ? '<p class="ex alt">' + chip('US', 'v-us') + ' ' + mark(r.ex_us) + '</p>' : '') + '</div>'; };
  return '<header class="head"><a class="ib" href="#/cards/' + t + '/' + e.level + '" aria-label="Back">' + icon('back') + '</a><div><p class="eyebrow">' + esc(THEME(t).title) + ' · level ' + e.level + ' · ' + (i + 1) + '/' + list.length + '</p></div></header>' +
    '<article class="entry card"><h1>' + esc(e.term[v]) + '</h1><p class="ipa">' + chip(v.toUpperCase(), 'v-' + v) + ' ' + esc(e.ipa[v]) + ' ' + sayBtn(e.term[v], v) + sayBtn(e.term[v], v, true) + '</p>' +
    '<p class="ipa alt">' + chip(o.toUpperCase(), 'v-' + o) + ' ' + (diff ? '<b>' + esc(e.term[o]) + '</b> ' : '<i>same wording</i> ') + esc(e.ipa[o]) + ' ' + sayBtn(e.term[o], o) + '</p>' +
    '<p class="def">' + esc(e.def) + '</p>' + fr('<p><b>' + esc(e.fr) + '</b></p>' + (e.note_fr ? '<p>' + esc(e.note_fr) + '</p>' : ''), 'En français · piège à éviter') +
    (e.french_concept && e.explain ? '<div class="explain"><span class="reglabel">How to explain it</span><p><i>In writing</i> — ' + esc(e.explain.written) + ' ' + sayBtn(e.explain.written, v) + '</p><p><i>Out loud</i> — ' + esc(e.explain.spoken) + ' ' + sayBtn(e.explain.spoken, v) + '</p></div>' : '') +
    reg('formal') + reg('everyday') + reg('informal') +
    (e.collocations && e.collocations.length ? '<div class="colloc"><span class="reglabel">Goes with</span>' + e.collocations.map(c => '<button class="chip tap" data-act="say" data-t="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' : '') +
    recBox('Say it, then compare') + '</article>' +
    '<div class="pager">' + (i > 0 ? '<a class="btn ghost" href="#/entry/' + list[i - 1].id + '">' + icon('back') + ' Previous</a>' : '<span></span>') +
    (i < list.length - 1 ? '<a class="btn" href="#/entry/' + list[i + 1].id + '">Next ' + icon('next') + '</a>' : '<a class="btn" href="#/theme/' + t + '">Finish</a>') + '</div>';
};

/* ================= Toolkit ================= */
const lessonRun = (id, title, list, back) => startSession({ title, back, questions: list.map(x => contentQuestion(x, title)), onFinish: score => { markDone(id, score); } });
ACT.lesson = el => {
  const [kind, id] = el.dataset.k.split(':');
  if (kind === 'cn') { const c = L.connectors.find(x => x.id === id); lessonRun(id, c.function, c.exercises, 'toolkit/connectors/' + id); }
  if (kind === 'gr') { const g = L.grammar.find(x => x.id === id); lessonRun(id, g.title, g.exercises, 'toolkit/grammar/' + id); }
};
ACT.markDone = el => { markDone(el.dataset.id); toast('Marked as done'); render(); };
const posLabel = { start: 'opens the sentence', mid: 'mid-sentence', end: 'closes the sentence', any: 'flexible position' };
const TK = {
  connectors(id) {
    if (!id) return head('Linking words', 'By what you want to do, in three registers.', 'learn') +
      '<div class="card list">' + L.connectors.map(c => '<a href="#/toolkit/connectors/' + c.id + '"><span><b>' + esc(c.function) + '</b><small lang="fr">' + esc(c.function_fr) + '</small></span>' + doneTick(c.id) + '</a>').join('') + '</div>';
    const c = L.connectors.find(x => x.id === id); if (!c) { go('toolkit/connectors'); return null; }
    return head(c.function, '<span lang="fr">' + esc(c.function_fr) + '</span>', 'toolkit/connectors') +
      ['formal', 'everyday', 'informal'].map(r => { const items = c.items.filter(x => x.register === r); if (!items.length) return '';
        return '<div class="card reg-' + r + '"><span class="reglabel">' + regLabel[r] + '</span>' + items.map(x => '<div class="conn"><p><b>' + esc(x.text) + '</b> ' + varChip(x.variety) + ' <small>' + (posLabel[x.position] || '') + '</small></p><p class="ex">' + mark(x.ex) + ' ' + sayBtn(x.ex, x.variety === 'us' ? 'us' : x.variety === 'uk' ? 'uk' : V()) + '</p>' + fr(esc(x.punct_fr), 'Ponctuation') + '</div>').join('') + '</div>'; }).join('') +
      '<div class="card warn" lang="fr"><span class="reglabel">Pièges pour francophones</span><ul>' + c.pitfalls_fr.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul></div>' +
      '<button class="btn wide" data-act="lesson" data-k="cn:' + c.id + '">Practise · ' + c.exercises.length + ' questions</button>';
  },
  softeners() {
    return head('Tact and softeners', 'Indirectness is what makes professional English sound courteous.', 'learn') +
      L.softeners.map(g => '<div class="card"><span class="reglabel">' + esc(g.function) + ' · <span lang="fr">' + esc(g.function_fr) + '</span></span>' + g.phrases.map(p => '<div class="conn"><p><b>' + esc(p.text) + '</b> ' + varChip(p.variety) + ' ' + sayBtn(p.text, p.variety === 'us' ? 'us' : p.variety === 'uk' ? 'uk' : V()) + '</p>' + fr(esc(p.note_fr), 'Note') + '</div>').join('') + '</div>').join('');
  },
  markers() {
    return head('Spoken markers', 'Small words that make speech sound native.', 'learn') +
      '<div class="card">' + L.spoken_markers.map(m => '<div class="conn"><p><b>' + esc(m.text) + '</b> ' + sayBtn(m.ex, V()) + '</p><p class="ex">' + mark(m.ex) + '</p>' + fr('<p>' + esc(m.meaning_fr) + '</p>' + (m.note_fr ? '<p>' + esc(m.note_fr) + '</p>' : ''), 'Sens et usage') + '</div>').join('') + '</div>';
  },
  rhythm() {
    return head('Sentence rhythm', 'Rewrite the heavy version in your head, then reveal.', 'learn') +
      L.rhythm.map((r, i) => '<div class="card"><span class="reglabel">' + esc(r.title) + '</span><p class="heavy">' + esc(r.heavy) + '</p><details class="reveal"><summary>Show the natural version</summary><p class="natural">' + esc(r.natural) + ' ' + sayBtn(r.natural, V()) + '</p></details>' + fr(esc(r.explain_fr), r.title_fr) + '</div>').join('');
  },
  grammar(id) {
    if (!id) { const row = g => '<a href="#/toolkit/grammar/' + g.id + '"><span><b>' + esc(g.title) + '</b><small lang="fr">' + esc(g.title_fr) + '</small></span>' + doneTick(g.id) + '</a>';
      return head('Grammar', 'Each rule ends with sentences you have to produce.', 'learn') +
        section('Legal and HR register', '<div class="card list">' + L.grammar.filter(g => g.track === 'legal').map(row).join('') + '</div>') +
        section('Intermediate traps for French speakers', '<div class="card list">' + L.grammar.filter(g => g.track !== 'legal').map(row).join('') + '</div>'); }
    const g = L.grammar.find(x => x.id === id); if (!g) { go('toolkit/grammar'); return null; }
    return head(g.title, '<span lang="fr">' + esc(g.title_fr) + '</span>', 'toolkit/grammar') +
      g.points.map(p => '<div class="card"><p class="rule">' + esc(p.rule) + '</p>' + fr(esc(p.rule_fr), 'La règle') + p.examples.map(x => '<div class="conn">' + (x.wrong ? '<p class="wrong">' + esc(plain(x.wrong)) + '</p>' : '') + '<p class="ex">' + mark(x.right) + ' ' + sayBtn(x.right, V()) + '</p>' + fr(esc(x.note_fr), 'Note') + '</div>').join('') + '</div>').join('') +
      '<button class="btn wide" data-act="lesson" data-k="gr:' + g.id + '">Practise · ' + g.exercises.length + ' questions</button>';
  },
  pron(id) {
    if (!id) return head('Pronunciation', 'Listen in both accents, record yourself, compare.', 'learn') +
      '<div class="card list">' + L.pronunciation.map(p => '<a href="#/toolkit/pron/' + p.id + '"><span><b>' + esc(p.title) + '</b><small lang="fr">' + esc(p.title_fr) + '</small></span>' + doneTick(p.id) + '</a>').join('') + '</div>';
    const p = L.pronunciation.find(x => x.id === id); if (!p) { go('toolkit/pron'); return null; }
    return head(p.title, '<span lang="fr">' + esc(p.title_fr) + '</span>', 'toolkit/pron') + fr(esc(p.explain_fr), 'Explication') +
      '<div class="card">' + p.items.map(x => '<div class="conn pr"><p><b>' + esc(x.text) + '</b></p><p class="ipa">' + chip('UK', 'v-uk') + ' ' + esc(x.ipa_uk) + ' ' + sayBtn(x.text, 'uk') + ' ' + chip('US', 'v-us') + ' ' + esc(x.ipa_us) + ' ' + sayBtn(x.text, 'us') + sayBtn(x.text, V(), true) + '</p>' + fr(esc(x.note_fr), 'Note') + '</div>').join('') + '</div>' +
      (p.pairs && p.pairs.length ? '<div class="card"><span class="reglabel">Minimal pairs</span>' + p.pairs.map(x => '<div class="pair"><span><b>' + esc(x.a) + '</b> ' + esc(x.ipa_a) + ' ' + sayBtn(x.a, V()) + '</span><span><b>' + esc(x.b) + '</b> ' + esc(x.ipa_b) + ' ' + sayBtn(x.b, V()) + '</span></div>').join('') + '</div>' : '') +
      '<div class="card">' + recBox('Record a few of them') + '</div><button class="btn wide" data-act="markDone" data-id="' + p.id + '">' + (S.done[p.id] ? 'Done ✓' : 'Mark as practised') + '</button>';
  },
  numbers() {
    return head('Numbers, dates, spelling', 'Written one way, said another.', 'learn') +
      '<div class="card">' + L.numbers.map(n => '<div class="conn"><p class="written">' + esc(n.written) + '</p><p>' + chip('UK', 'v-uk') + ' ' + esc(n.say_uk) + ' ' + sayBtn(n.say_uk, 'uk') + '</p><p>' + chip('US', 'v-us') + ' ' + esc(n.say_us) + ' ' + sayBtn(n.say_us, 'us') + '</p>' + fr(esc(n.note_fr), 'Note') + '</div>').join('') + '</div>';
  }
};
VIEWS.toolkit = (kind, id) => { if (!TK[kind]) { go('learn'); return null; } return TK[kind](id); };

/* ================= Library: reading and listening ================= */
VIEWS.library = () => {
  const rows = (key, href, sub) => byTheme(key, x => '<a href="#/' + href + '/' + x.id + '"><span><b>' + esc(x.title) + '</b><small>' + sub(x) + '</small></span>' + doneTick(x.id) + '</a>');
  return head('Library', 'Documents to read and conversations to listen to.') +
    section('Professional reading', rows('reading', 'read', x => esc(x.kind) + ' · level ' + x.level + ' · ' + x.paragraphs.join(' ').split(/\s+/).length + ' words')) +
    section('Dialogues', rows('dialogues', 'dialogue', x => (x.variety === 'us' ? 'American' : 'British') + ' English · ' + x.lines.length + ' lines'), 'Natural pace, contractions and all. Listen first, then read.');
};
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function annotate(text, r) {
  const marks = r.glossary.map((g, i) => ({ k: esc(g.term), cls: 'gl', i })).concat(r.legalese.map((g, i) => ({ k: esc(g.phrase), cls: 'lg', i }))).sort((a, b) => b.k.length - a.k.length);
  if (!marks.length) return esc(text);
  const re = new RegExp('(' + marks.map(m => reEsc(m.k)).join('|') + ')', 'gi');
  return esc(text).replace(re, m => { const x = marks.find(k => k.k.toLowerCase() === m.toLowerCase()); return '<button class="' + x.cls + '" data-act="gloss" data-c="' + x.cls + '" data-i="' + x.i + '">' + m + '</button>'; });
}
let READING = null, skimTimer = 0;
VIEWS.read = id => {
  const r = findIn('reading', id); if (!r) { go('library'); return null; }
  READING = r; clearInterval(skimTimer);
  return head(r.title, esc(r.kind) + ' · level ' + r.level, 'library') +
    '<div class="row"><button class="btn ghost" data-act="skim">' + icon('clock') + ' Timed skim · 60 s</button><button class="btn ghost" data-act="say" data-t="' + esc(r.paragraphs.join(' ')) + '">' + icon('play') + ' Listen</button></div>' +
    '<article class="card doc" id="doc">' + r.paragraphs.map(p => '<p>' + annotate(p, r) + '</p>').join('') + '</article>' +
    '<p class="sub legend"><span class="gl">vocabulary</span> <span class="lg">legal jargon</span> — tap to decode.</p>' +
    '<button class="btn wide" data-act="readQ">Check my understanding · ' + r.questions.length + ' questions</button>';
};
ACT.gloss = el => {
  const r = READING; if (!r) return;
  if (el.dataset.c === 'gl') { const g = r.glossary[+el.dataset.i]; sheet('<h2>' + esc(g.term) + ' ' + sayBtn(g.term, V()) + '</h2><p>' + esc(g.plain) + '</p><p class="frline" lang="fr">' + esc(g.fr) + '</p><div class="two"><button class="btn ghost" data-act="keep" data-t="' + esc(g.term) + '" data-n="' + esc(g.plain) + '">Add to notebook</button><button class="btn" data-act="closeSheet">Close</button></div>'); }
  else { const g = r.legalese[+el.dataset.i]; sheet('<span class="reglabel">Legal jargon</span><h2>' + esc(g.phrase) + '</h2><p>In plain English: <b>' + esc(g.plain) + '</b></p><button class="btn wide" data-act="closeSheet">Close</button>'); }
};
ACT.skim = el => {
  let n = 60; const doc = $('#doc'); doc.classList.remove('veiled'); el.disabled = true;
  clearInterval(skimTimer);
  skimTimer = setInterval(() => { n--; el.innerHTML = icon('clock') + ' ' + n + ' s'; if (n <= 0) { clearInterval(skimTimer); doc.classList.add('veiled'); el.disabled = false; el.innerHTML = icon('clock') + ' Read again'; el.dataset.act = 'unveil'; } }, 1000);
};
ACT.unveil = el => { $('#doc').classList.remove('veiled'); el.dataset.act = 'skim'; el.innerHTML = icon('clock') + ' Timed skim · 60 s'; };
ACT.readQ = () => { const r = READING; clearInterval(skimTimer); lessonRun(r.id, 'Reading', r.questions, 'read/' + r.id); };

let DIALOG = null, playing = false;
VIEWS.dialogue = id => {
  const d = findIn('dialogues', id); if (!d) { go('library'); return null; }
  DIALOG = d; playing = false;
  return head(d.title, (d.variety === 'us' ? 'American' : 'British') + ' English', 'library') +
    '<p class="lead">' + esc(d.context) + '</p>' + fr(esc(d.context_fr), 'Le contexte') +
    '<div class="row"><button class="btn" data-act="playAll">' + icon('play') + ' Play the dialogue</button><button class="btn ghost" data-act="toggleText">Hide the text</button></div>' +
    '<div class="card dialog" id="dlg">' + d.lines.map((l, i) => '<div class="line" data-i="' + i + '"><span class="who">' + esc(l.speaker) + '</span><p><span class="txt">' + esc(l.text) + '</span> <button class="ib" data-act="playLine" data-i="' + i + '" aria-label="Listen">' + icon('play') + '</button></p>' + fr(esc(l.note_fr), 'Tournure') + '</div>').join('') + '</div>' +
    '<div class="card"><span class="reglabel">Shadowing</span><p class="sub">Play a line, then say it straight after, copying the rhythm and the melody.</p>' + recBox() + '</div>' +
    '<button class="btn wide" data-act="dlgQ">Check my understanding · ' + d.questions.length + ' questions</button>';
};
const pitchOf = (d, i) => { const names = uniq(d.lines.map(l => l.speaker)); return names.indexOf(d.lines[i].speaker) % 2 ? 0.85 : 1.1; };
function playLine(i, chain) {
  const d = DIALOG; if (!d || i >= d.lines.length) { playing = false; $$('.line.on').forEach(x => x.classList.remove('on')); return; }
  $$('.line').forEach(x => x.classList.toggle('on', +x.dataset.i === i));
  Speech.say(d.lines[i].text, { variety: d.variety, pitch: pitchOf(d, i), onend: () => { if (chain && playing) setTimeout(() => playLine(i + 1, true), 350); else $$('.line.on').forEach(x => x.classList.remove('on')); } });
}
ACT.playAll = el => { if (playing) { playing = false; Speech.stop(); el.innerHTML = icon('play') + ' Play the dialogue'; return; } playing = true; el.innerHTML = icon('stop') + ' Stop'; playLine(0, true); };
ACT.playLine = el => { playing = false; playLine(+el.dataset.i, false); };
ACT.toggleText = el => { const on = $('#dlg').classList.toggle('notext'); el.textContent = on ? 'Show the text' : 'Hide the text'; };
ACT.dlgQ = () => { const d = DIALOG; playing = false; lessonRun(d.id, 'Listening', d.questions, 'dialogue/' + d.id); };

/* ================= Practise: writing and speaking ================= */
VIEWS.practise = () => {
  const stage = ['', 'Complete the sentences', 'Write a paragraph', 'Write the whole document'];
  return head('Practise', 'Produce English, then measure it against a model.') +
    section('Writing', byTheme('writing', x => '<a href="#/write/' + x.id + '"><span><b>' + esc(x.title) + '</b><small>Stage ' + x.stage + ' · ' + stage[x.stage] + ' · ' + esc(x.kind) + '</small></span>' + doneTick(x.id) + '</a>'), 'Three stages in each theme: sentences, a paragraph, then the whole document.') +
    onlinePractiseSection() +
    section('Speaking', byTheme('roleplays', x => '<a href="#/roleplay/' + x.id + '"><span><b>' + esc(x.title) + '</b><small>Timed role play · ' + x.turns.length + ' turns</small></span>' + doneTick(x.id) + '</a>') +
      '<div class="grid"><a class="card tile" href="#/functional">' + icon('chat') + '<b>Meetings and calls</b><small>Phrases for every move</small></a><a class="card tile" href="#/toolkit/pron">' + icon('mic') + '<b>Pronunciation</b><small>Listen, record, compare</small></a></div>');
};
let WRITING = null;
VIEWS.write = id => {
  const w = findIn('writing', id); if (!w) { go('practise'); return null; }
  WRITING = w; const draft = S.drafts[id] || '';
  const top = head(w.title, 'Stage ' + w.stage + ' · ' + esc(w.kind), 'practise') + '<div class="card"><span class="reglabel">The brief</span><p>' + esc(w.brief) + '</p>' + fr(esc(w.brief_fr), 'La consigne') + '</div>';
  let work;
  if (w.stage === 1) work = '<div class="card gaps">' + w.gaps.map((g, i) => '<div class="gap"><p>' + esc(g.text).replace('___', '<input type="text" data-i="' + i + '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Missing words">') + '</p><div class="gapfb"></div></div>').join('') + '</div><button class="btn wide" data-act="checkGaps">Check my answers</button>';
  else work = '<div class="card"><span class="reglabel">Points to cover</span><ul>' + w.outline.map(o => '<li>' + esc(o) + '</li>').join('') + '</ul></div>' +
    '<div class="card"><textarea id="draft" rows="10" placeholder="Write here. Your draft is saved on this device.">' + esc(draft) + '</textarea><p class="sub" id="wc"></p>' +
    '<div class="row"><button class="btn ghost" data-act="copyDraft">' + icon('copy') + ' Copy my text</button><button class="btn ghost" data-act="online">' + icon('cloud') + ' Get it corrected online</button></div></div>' +
    '<button class="btn wide" data-act="showModel">Compare with the model</button>';
  afterRender = main => { const ta = $('#draft', main); if (!ta) return; const wc = () => { $('#wc').textContent = (ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0) + ' words'; }; wc(); ta.addEventListener('input', () => { S.drafts[id] = ta.value; save(); wc(); }); };
  return top + work + '<div id="model"></div>';
};
function modelHtml(w) {
  const text = V() === 'us' && w.model_us ? w.model_us : w.model;
  let html = para(text); w.commentary.forEach((c, i) => { const q = esc(c.quote); if (html.includes(q)) html = html.replace(q, '<mark class="cm" data-n="' + (i + 1) + '">' + q + '</mark>'); });
  return '<div class="card doc"><span class="reglabel">Model answer ' + chip(V() === 'us' && w.model_us ? 'US' : 'UK', 'v-' + (V() === 'us' && w.model_us ? 'us' : 'uk')) + ' ' + sayBtn(text, V()) + '</span>' + html + '</div>' +
    '<div class="card" lang="fr"><span class="reglabel">Pourquoi ces choix</span><ol class="cmlist">' + w.commentary.map(c => '<li><q lang="en">' + esc(c.quote) + '</q><br>' + esc(c.note_fr) + '</li>').join('') + '</ol></div>' +
    '<div class="card"><span class="reglabel">Assess your own text</span>' + w.checklist.map(c => '<label class="checkline"><input type="checkbox"><span>' + esc(c) + '</span></label>').join('') + '</div>' +
    '<div class="card"><span class="reglabel">Phrases worth keeping</span>' + w.phrasebank.map(p => '<div class="phrase"><span>' + esc(p) + '</span><span>' + sayBtn(p, V()) + '<button class="ib" data-act="keep" data-t="' + esc(p) + '" aria-label="Add to notebook">' + icon('plus') + '</button></span></div>').join('') + '</div>' +
    '<button class="btn wide" data-act="markDone" data-id="' + w.id + '">' + (S.done[w.id] ? 'Done ✓' : 'Mark as done') + '</button>';
}
ACT.showModel = () => { const m = $('#model'); m.innerHTML = modelHtml(WRITING); m.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
ACT.checkGaps = () => {
  const w = WRITING; let ok = 0;
  $$('.gap input').forEach(inp => { const g = w.gaps[+inp.dataset.i], good = [g.answer].concat(g.accept || []).some(a => norm(a) === norm(inp.value)); if (good) ok++;
    inp.classList.toggle('ok', good); inp.classList.toggle('ko', !good); inp.readOnly = true;
    inp.closest('.gap').querySelector('.gapfb').innerHTML = (good ? '' : '<p class="right">' + esc(g.answer) + '</p>') + fr(esc(g.explain_fr), 'Explication'); });
  toast(ok + ' of ' + w.gaps.length + ' correct'); markDone(w.id, pct(ok, w.gaps.length)); ACT.showModel();
};
ACT.copyDraft = async () => { const t = ($('#draft') || {}).value || ''; if (!t.trim()) { toast('Nothing to copy yet.'); return; } try { await navigator.clipboard.writeText(t); toast('Copied'); } catch (e) { $('#draft').select(); document.execCommand('copy'); toast('Copied'); } };
ACT.keep = el => { addNote(el.dataset.t, el.dataset.n || ''); toast('Added to your notebook'); };

VIEWS.functional = () => head('Meetings and calls', 'The moves of a conversation, from the most formal to the most relaxed.', 'practise') +
  READY().filter(t => SK(t.id).functional.length).map(t => '<details class="fold"' + (t.id === currentTheme() ? ' open' : '') + '><summary><b>' + esc(t.title) + '</b><small>' + SK(t.id).functional.length + ' moves</small></summary>' + SK(t.id).functional.map(f => '<div class="card"><span class="reglabel">' + esc(f.function) + ' · <span lang="fr">' + esc(f.function_fr) + '</span></span>' +
    f.phrases.map(p => '<div class="phrase"><span>' + esc(p.text) + ' ' + chip(regLabel[p.register] || p.register, 'r-' + p.register) + ' ' + varChip(p.variety) + '</span><span>' + sayBtn(p.text, p.variety === 'us' ? 'us' : p.variety === 'uk' ? 'uk' : V()) + '</span></div>').join('') + '</div>').join('') + '</details>').join('');

let RP = null, rpTimer = 0;
VIEWS.roleplay = id => {
  const r = findIn('roleplays', id); if (!r) { go('practise'); return null; }
  if (!RP || RP.id !== id) RP = { id, i: 0, phase: 'listen' };
  clearInterval(rpTimer);
  const intro = head(r.title, 'Role play · turn ' + Math.min(RP.i + 1, r.turns.length) + ' of ' + r.turns.length, 'practise') + '<div class="card"><p>' + esc(r.situation) + '</p>' + fr(esc(r.situation_fr), 'La situation') + '</div>';
  if (RP.i >= r.turns.length) { markDone(id); RP = null; return intro + '<div class="card center"><div class="ring gold" style="--p:100"><b>' + icon('check') + '</b></div><h2>Role play complete</h2><p class="sub">Run it again in a few days: fluency comes from repetition.</p><a class="btn wide" href="#/practise">Done</a></div>'; }
  const t = r.turns[RP.i];
  if (RP.phase === 'listen') {
    afterRender = () => setTimeout(() => Speech.say(t.say, { variety: V() }), 400);
    return intro + '<div class="card turn"><span class="reglabel">They say</span><p>' + sayBtn(t.say, V()) + sayBtn(t.say, V(), true) + ' <button class="btn ghost small" data-act="rpShow">Show the text</button></p><p id="rpText" hidden>' + esc(t.say) + '</p></div>' +
      '<button class="btn wide" data-act="rpAnswer">' + icon('mic') + ' Answer · ' + t.seconds + ' s</button>';
  }
  if (RP.phase === 'answer') {
    afterRender = async () => {
      let n = t.seconds; const el = $('#rpCount');
      if (Rec.ok) { try { await Rec.start(); RP.recorded = true; } catch (e) { RP.recorded = false; } }
      rpTimer = setInterval(() => { n--; if (el) el.textContent = n; if (n <= 0) ACT.rpStop(); }, 1000);
    };
    return intro + '<div class="card center"><div class="ring live" style="--p:100"><b id="rpCount">' + t.seconds + '</b></div><p class="sub">Speak now. Do not aim for perfect: aim for natural.</p><button class="btn wide" data-act="rpStop">' + icon('stop') + ' I have finished</button></div>';
  }
  return intro + '<div class="card"><span class="reglabel">Your answer</span>' + (RP.url ? '<audio controls src="' + RP.url + '"></audio>' : '<p class="sub">No recording on this device: compare from memory.</p>') + spokenFeedbackBox(t.say) + '</div>' +
    '<div class="card"><span class="reglabel">A native professional might say</span><p>' + esc(t.model) + ' ' + sayBtn(t.model, V()) + sayBtn(t.model, V(), true) + '</p>' + fr(esc(t.tips_fr), 'Conseils') + '</div>' +
    '<div class="two"><button class="btn ghost" data-act="rpRetry">Try again</button><button class="btn" data-act="rpNext">' + (RP.i + 1 >= r.turns.length ? 'Finish' : 'Next turn') + '</button></div>';
};
ACT.rpShow = () => { $('#rpText').hidden = false; };
ACT.rpAnswer = () => { Speech.stop(); RP.phase = 'answer'; RP.url = ''; render(); };
ACT.rpStop = async () => { clearInterval(rpTimer); if (!RP || RP.phase !== 'answer') return; RP.phase = 'review'; RP.url = RP.recorded ? await Rec.stop() : ''; render(); };
ACT.rpRetry = () => { RP.phase = 'listen'; render(); };
ACT.rpNext = () => { RP.i++; RP.phase = 'listen'; render(); };

/* ================= Notebook and review ================= */
function addNote(text, note) {
  text = String(text || '').trim(); if (!text) return false;
  if (S.notebook.some(n => norm(n.text) === norm(text))) return false;
  const id = 'nb-' + Date.now().toString(36) + Math.floor(Math.random() * 1e3);
  S.notebook.unshift({ id, text, note: String(note || '').trim(), t: Date.now() });
  S.srs[id] = { i: 0, e: 2.5, r: 0, l: 0, d: dayNum() }; save(); return true;
}
VIEWS.notebook = () => head('Notebook', 'Words and sentences met at work. They join your reviews automatically.') +
  '<form class="card noteform" id="noteform"><label>Word, expression or sentence<textarea id="nbText" rows="2" placeholder="e.g. Let’s park that for now."></textarea></label><label>Meaning or context <small>(optional)</small><input id="nbNote" type="text" placeholder="e.g. remettre à plus tard — said in a meeting"></label><button class="btn wide" data-act="noteAdd">' + icon('plus') + ' Add to my notebook</button></form>' +
  (S.notebook.length ? '<button class="btn ghost wide" data-act="noteDrill">Drill my notebook</button><div class="card notes">' + S.notebook.map(n => '<div class="note"><div><p><b>' + esc(n.text) + '</b></p>' + (n.note ? '<p class="sub">' + esc(n.note) + '</p>' : '') + '</div><span>' + sayBtn(n.text, V()) + '<button class="ib" data-act="noteDel" data-id="' + n.id + '" aria-label="Delete">' + icon('trash') + '</button></span></div>').join('') + '</div>'
    : '<p class="empty">Nothing yet. The best entries are the ones you nearly understood today.</p>');
ACT.noteAdd = () => { const t = $('#nbText').value, ok = addNote(t, $('#nbNote').value); if (!t.trim()) { $('#nbText').focus(); return; } toast(ok ? 'Added' : 'Already in your notebook'); render(); };
ACT.noteDel = el => { S.notebook = S.notebook.filter(n => n.id !== el.dataset.id); delete S.srs[el.dataset.id]; save(); render(); };
ACT.noteDrill = () => {
  const qs = shuffle(S.notebook).slice(0, 12).map(n => (Speech.ok && Math.random() < 0.6) || !n.note
    ? { tag: 'Dictation', prompt: 'Listen and write.', audio: { text: n.text, variety: V() }, answers: [n.text], model: n.text, selfmark: true, ref: n.id }
    : { tag: 'Recall', prompt: 'From your notebook: <q>' + esc(n.note) + '</q>', answers: [n.text], model: n.text, selfmark: true, ref: n.id });
  startSession({ title: 'Notebook drill', back: 'notebook', questions: Speech.ok ? qs : qs.filter(q => !q.audio) });
};
let RV = null;
VIEWS.review = () => {
  if (!RV || RV.i >= RV.ids.length) { const ids = shuffle(dueIds()).slice(0, 30); RV = ids.length ? { ids, i: 0, shown: false } : null; }
  if (!RV) return head('Review', 'Spaced repetition', '') + '<div class="card center"><div class="ring gold" style="--p:100"><b>' + icon('check') + '</b></div><h2>All caught up</h2><p class="sub">Nothing is due. New items appear as you study and make mistakes.</p><a class="btn wide" href="#/">Back to today</a></div>';
  const id = RV.ids[RV.i], e = ENTRY[id], n = e ? null : srsItem(id);
  const front = e ? '<p class="eyebrow">Say it in English</p><h2 lang="fr">' + esc(e.fr) + '</h2><p class="sub">' + esc(e.def) + '</p>' : '<p class="eyebrow">From your notebook</p><h2>' + esc(n.note || 'Can you use it in a sentence?') + '</h2>' + (n.note ? '' : '<p class="sub">' + esc(n.text) + '</p>');
  const back = e ? '<h2>' + esc(termOf(e)) + ' ' + sayBtn(termOf(e), V()) + '</h2><p class="ipa">' + esc(pick(e.ipa)) + (differs(e.term) ? ' · ' + chip(other(V()).toUpperCase(), 'v-' + other(V())) + ' ' + esc(e.term[other(V())]) : '') + '</p>' + (e.registers.everyday ? '<p class="ex">' + mark(regEx(e.registers.everyday)) + '</p>' : '') + fr(esc(e.note_fr), 'Note') + '<p><a href="#/entry/' + e.id + '">Open the full entry</a></p>'
    : '<h2>' + esc(n.text) + ' ' + sayBtn(n.text, V()) + '</h2>';
  return '<div class="sess"><div class="sess-top"><a class="ib" href="#/" aria-label="Close">' + icon('back') + '</a>' + bar(pct(RV.i, RV.ids.length)) + '<span class="count">' + (RV.i + 1) + ' / ' + RV.ids.length + '</span></div>' +
    '<div class="qcard flash ' + (RV.shown ? 'shown' : '') + '">' + front + (RV.shown ? '<hr>' + back + '<div class="rate"><button data-act="rate" data-q="0">Again</button><button data-act="rate" data-q="1">Hard</button><button data-act="rate" data-q="2">Good</button><button data-act="rate" data-q="3">Easy</button></div>' : '<button class="btn wide" data-act="reveal">Show the answer</button>') + '</div></div>';
};
ACT.reveal = () => { RV.shown = true; render(); };
ACT.rate = el => { srsGrade(RV.ids[RV.i], +el.dataset.q); RV.i++; RV.shown = false; render(); };

/* ================= Placement test ================= */
VIEWS.placement = () => head('Placement test', '32 questions · about 10 minutes', '') +
  '<div class="card"><p>Vocabulary, grammar, reading and listening, all in an HR and employment-law setting. The result sets your priorities and can open levels you already master.</p>' +
  fr('<p>Le résultat est indicatif : il oriente le parcours, il ne remplace pas une certification. Vous pourrez refaire le test tous les deux mois pour mesurer vos progrès.</p>', 'À savoir') +
  (S.placement ? '<p class="sub">Last result: ' + esc(S.placement.est) + ' on ' + new Date(S.placement.t).toLocaleDateString('en-GB') + '.</p>' : '') + '</div>' +
  '<button class="btn wide" data-act="placementStart">Start the test</button>';
ACT.placementStart = () => {
  const order = ['vocabulary', 'grammar', 'reading', 'listening'], lv = { B1: 1, B2: 2, C1: 3 };
  const qs = L.placement.slice().sort((a, b) => order.indexOf(a.skill) - order.indexOf(b.skill) || lv[a.level] - lv[b.level]).map(p => {
    const listen = p.audio && Speech.ok;
    return { tag: SKILL_LABEL[p.skill] || p.skill, meta: p, options: p.options, answer: p.answer, audio: listen ? { text: p.audio, variety: V() } : null,
      prompt: (p.passage ? '<div class="passage">' + esc(p.passage) + '</div>' : '') + (p.audio && !listen ? '<div class="passage">' + esc(p.audio) + '</div>' : '') + esc(p.prompt) };
  });
  startSession({ title: 'Placement test', back: '', questions: qs, onFinish: (score, s) => {
    const by = {}; let got = 0, max = 0;
    s.questions.forEach((q, i) => { const k = q.meta.skill, w = lv[q.meta.level]; by[k] = by[k] || { ok: 0, n: 0 }; by[k].n++; max += w; if (s.results[i]) { by[k].ok++; got += w; } });
    const r = got / max, est = r < 0.4 ? 'B1' : r < 0.62 ? 'B1+' : r < 0.8 ? 'B2' : r < 0.92 ? 'B2+' : 'C1';
    const weak = Object.keys(by).sort((a, b) => by[a].ok / by[a].n - by[b].ok / by[b].n).slice(0, 2);
    const vocab = by.vocabulary ? by.vocabulary.ok / by.vocabulary.n : 0;
    S.placement = { t: Date.now(), score, est, weak, by, unlock: vocab >= 0.85 ? 2 : 1 }; save();
    return 'Estimated level: <b>' + est + '</b>. Priorities: ' + weak.map(k => SKILL_LABEL[k]).join(' and ') + '.' + (S.placement.unlock > 1 ? ' Level 2 vocabulary is open.' : '');
  } });
};

/* ================= Settings ================= */
function applySettings() {
  const r = document.documentElement, t = S.settings.theme;
  if (t === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t);
  r.style.setProperty('--scale', S.settings.scale);
}
const seg = (key, opts) => '<div class="seg">' + opts.map(o => '<button data-act="set" data-k="' + key + '" data-v="' + o[0] + '" class="' + (String(S.settings[key]) === String(o[0]) ? 'on' : '') + '">' + o[1] + '</button>').join('') + '</div>';
VIEWS.settings = () => {
  const voices = v => { const list = Speech.list(v), key = v === 'us' ? 'voiceUs' : 'voiceUk';
    return list.length ? '<select data-chg="voice" data-k="' + key + '"><option value="">Best available</option>' + list.map(x => '<option' + (S.settings[key] === x.name ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select>' : '<small>No ' + (v === 'us' ? 'American' : 'British') + ' voice found on this device.</small>'; };
  return head('Settings', '', '') +
    '<div class="card set"><label>Main variety' + seg('variety', [['uk', 'British'], ['us', 'American']]) + '</label><label>French help always open' + seg('frHelp', [['false', 'Off'], ['true', 'On']]) + '</label><label>Daily goal' + seg('goal', [[10, '10 min'], [15, '15 min'], [20, '20 min'], [30, '30 min']]) + '</label></div>' +
    '<div class="card set"><label>Appearance' + seg('theme', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']]) + '</label><label>Text size' + seg('scale', [[0.92, 'A−'], [1, 'A'], [1.12, 'A+'], [1.25, 'A++']]) + '</label></div>' +
    '<div class="card set"><label>Speaking rate' + seg('rate', [[0.85, 'Slower'], [1, 'Normal'], [1.1, 'Faster']]) + '</label><label>British voice' + voices('uk') + '</label><label>American voice' + voices('us') + '</label>' +
    '<p class="row">' + sayBtn('The contract takes effect on the first of March.', 'uk') + sayBtn('The contract takes effect on March first.', 'us') + '</p>' +
    fr('<p>Pour un rendu naturel, téléchargez une voix « améliorée » ou « premium » : Réglages &gt; Accessibilité &gt; Contenu énoncé &gt; Voix &gt; Anglais.</p>', 'Améliorer les voix') + '</div>' +
    '<div class="card set"><span class="reglabel">Your progress</span><p class="sub">Stored on this device only. Export it to carry it to another device.</p><div class="row"><button class="btn ghost" data-act="exportData">Export</button><label class="btn ghost filebtn">Import<input type="file" accept="application/json,.json" data-chg="importData" hidden></label></div>' +
    '<button class="btn ghost wide" data-act="go" data-to="placement">Placement test</button><button class="btn danger wide" data-act="resetAsk">Erase all progress</button></div>' +
    onlineSettingsCard() +
    '<p class="foot">Parlance ' + APP_VERSION + ' · ' + ALL_ENTRIES.length + ' expressions · works offline</p>';
};
ACT.set = el => { let v = el.dataset.v; const k = el.dataset.k; if (v === 'true' || v === 'false') v = v === 'true'; else if (!isNaN(+v) && k !== 'variety' && k !== 'theme') v = +v; S.settings[k] = v; save(); applySettings(); render(); };
ACT.voice = el => { S.settings[el.dataset.k] = el.value; save(); };
ACT.exportData = async () => {
  saveNow(); const name = 'parlance-progress-' + dayKey() + '.json', text = JSON.stringify(Object.assign({}, S, { online: Object.assign({}, S.online, { code: '' }) }));
  try { const file = new File([text], name, { type: 'application/json' }); if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Parlance progress' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); toast('Progress exported');
};
ACT.importData = el => {
  const f = el.files && el.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { try { const o = JSON.parse(rd.result); if (!o || o.v !== 1 || !o.settings || !o.srs) throw 0; const code = S.online.code; S = Object.assign(DEFAULTS(), o); S.settings = Object.assign(DEFAULTS().settings, o.settings); S.online = Object.assign(DEFAULTS().online, o.online || {}, { code }); saveNow(); applySettings(); toast('Progress imported'); render(); } catch (e) { toast('This file is not a Parlance export.'); } };
  rd.readAsText(f);
};
ACT.resetAsk = () => sheet('<h2>Erase all progress?</h2><p>Reviews, notebook, drafts and results will be removed from this device. This cannot be undone.</p><div class="two"><button class="btn ghost" data-act="closeSheet">Keep everything</button><button class="btn danger" data-act="resetDo">Erase</button></div>');
ACT.resetDo = () => { S = DEFAULTS(); saveNow(); closeSheet(); applySettings(); go(''); };


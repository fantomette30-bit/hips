'use strict';
/* Parlance — Legal & HR English. Core: state, storage, speech, recording, spaced repetition. */
const APP_VERSION = '0.4.4';
const APP_BUILD = '/*BUILD*/';
const DATA = window.PARLANCE_DATA;
const STORE_KEY = 'parlance.v1';

/* ---------- small helpers ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mark = s => esc(s).replace(/\[\[(.+?)\]\]/g, '<mark>$1</mark>');
const plain = s => String(s || '').replace(/\[\[(.+?)\]\]/g, '$1');
const target = s => { const m = /\[\[(.+?)\]\]/.exec(s || ''); return m ? m[1] : ''; };
const blank = s => esc(s).replace(/\[\[(.+?)\]\]/g, '<span class="blank">&nbsp;</span>');
const para = s => esc(s).split(/\n{2,}/).map(p => '<p' + (p.length < 70 && !p.includes('\n') ? ' class="sl"' : '') + '>' + p.replace(/\n/g, '<br>') + '</p>').join('');
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
const uniq = a => Array.from(new Set(a));
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const norm = s => String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^to /, '');
const dayKey = d => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const dayNum = d => { d = d || new Date(); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5 + 0.5); };

/* ---------- state ---------- */
const DEFAULTS = () => ({
  v: 1,
  settings: { variety: 'uk', theme: 'auto', scale: 1, rate: 1, frHelp: false, goal: 15, voiceUk: '', voiceUs: '', audio: 'unlock' },
  srs: {}, seen: {}, levels: {}, done: {}, drafts: {}, notebook: [], days: {}, errors: {}, answers: { ok: 0, ko: 0 },
  placement: null, welcomed: false, lastTheme: '',
  online: { code: '', quality: 'best', converse: false, warned: '' }, queue: [], corrections: [],
  stars: {}, gmiss: {}, daily: {}
});
let S = DEFAULTS();
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { const o = JSON.parse(raw); S = Object.assign(DEFAULTS(), o); S.settings = Object.assign(DEFAULTS().settings, o.settings || {}); S.online = Object.assign(DEFAULTS().online, o.online || {}); }
  } catch (e) { /* stockage indisponible : l'app fonctionne, sans mémoire */ }
}
let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { } }, 150);
}
function saveNow() { clearTimeout(saveTimer); try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { } }
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

/* ---------- study time, streak ---------- */
let lastTouch = Date.now();
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { lastTouch = Date.now(); }, true));
setInterval(() => {
  if (document.hidden || Date.now() - lastTouch > 60000) return;
  const k = dayKey(); S.days[k] = (S.days[k] || 0) + 5; save();
}, 5000);
const minutesToday = () => Math.floor((S.days[dayKey()] || 0) / 60);
function streak() {
  let n = 0; const d = new Date();
  if (!S.days[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (S.days[dayKey(d)] >= 60) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ---------- content access ---------- */
const V = () => S.settings.variety;
const other = v => (v === 'uk' ? 'us' : 'uk');
const ALL_ENTRIES = [].concat(...Object.values(DATA.entries));
const ENTRY = {}; ALL_ENTRIES.forEach(e => { ENTRY[e.id] = e; });
const themeEntries = (t, level) => (DATA.entries[t] || []).filter(e => !level || e.level === level);
const pick = (o, v) => (o ? (o[v || V()] || o.uk || o.us || '') : '');
const regEx = (r, v) => ((v || V()) === 'us' && r.ex_us) ? r.ex_us : r.ex;
const differs = o => o && norm(o.uk) !== norm(o.us);

/* ---------- spaced repetition (SM-2 simplifié) ---------- */
function srsGrade(id, q) { // 0 again, 1 hard, 2 good, 3 easy
  const s = S.srs[id] || { i: 0, e: 2.5, r: 0, l: 0, d: 0 };
  if (q === 0) { s.r = 0; s.i = 0; s.l++; s.e = Math.max(1.3, s.e - 0.2); s.d = dayNum(); }
  else {
    s.r++;
    s.i = s.r === 1 ? 1 : s.r === 2 ? 3 : Math.max(s.i + 1, Math.round(s.i * s.e * (q === 1 ? 0.6 : q === 3 ? 1.3 : 1)));
    if (q === 1) s.e = Math.max(1.3, s.e - 0.15);
    if (q === 3) s.e += 0.1;
    s.d = dayNum() + s.i;
  }
  S.srs[id] = s; save();
}
const srsItem = id => ENTRY[id] || S.notebook.find(n => n.id === id);
const dueIds = () => Object.keys(S.srs).filter(id => S.srs[id].d <= dayNum() && srsItem(id));
const mastered = id => S.srs[id] && S.srs[id].i >= 7;

/* ---------- speech synthesis (voix de l'appareil, hors ligne) ---------- */
/* Voix de l'appareil. iOS a ses caprices : première lecture à déclencher par un geste,
   lecture parfois avalée après un cancel(), voix fantaisie à écarter, mode silencieux. */
const GOOD_VOICES = /^(daniel|kate|serena|oliver|arthur|martha|stephanie|samantha|ava|allison|susan|evan|nathan|joelle|noelle|zoe|tom|alex|nicky|karen|moira|tessa)\b/i;
const ODD_VOICES = /^(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|junior|organ|pipe organ|superstar|trinoids|whisper|wobble|zarvox|fred|ralph|kathy|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/i;
/* ---------- iPhone et iPad : sortie du son ----------
   iOS range la voix des pages web dans une catégorie audio coupée par le mode silencieux. Jouer,
   dans le geste même, un très court son vide par un élément <audio> fait passer la page en
   lecture ; sur iOS 17 et suivants, navigator.audioSession permet aussi de demander la catégorie
   « playback ». Les retours varient selon les appareils : le contrôle du son des réglages essaie
   les trois façons de faire et garde celle que l'on entend. */
const Sound = {
  ios: /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  el: null, silent: '',
  wav(sec, freq, amp) {
    const rate = 22050, n = Math.round(rate * sec), b = new Uint8Array(44 + n * 2), d = new DataView(b.buffer);
    const str = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
    str(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
    d.setUint32(24, rate, true); d.setUint32(28, rate * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); str(36, 'data'); d.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) { const env = Math.min(1, i / 300, (n - i) / 300); d.setInt16(44 + i * 2, freq ? Math.round(Math.sin(2 * Math.PI * freq * i / rate) * amp * env * 32767) : 0, true); }
    let t = ''; for (let i = 0; i < b.length; i++) t += String.fromCharCode(b[i]);
    return 'data:audio/wav;base64,' + btoa(t);
  },
  session(type) { try { if (navigator.audioSession && navigator.audioSession.type !== type) navigator.audioSession.type = type; } catch (e) { } },
  play(src) { try { const a = this.el || (this.el = new Audio()); a.src = src; a.volume = 1; const p = a.play(); if (p && p.catch) p.catch(() => { }); } catch (e) { } },
  inGesture() { return !navigator.userActivation || navigator.userActivation.isActive; },
  prime(mode) {
    mode = mode || S.settings.audio || 'unlock';
    if (!this.ios || !this.inGesture()) return;
    this.session(mode === 'playback' ? 'playback' : 'auto');
    if (mode !== 'standard') this.play(this.silent || (this.silent = this.wav(0.06, 0, 0)));
  },
  beep() { this.session('auto'); this.play(this.wav(0.5, 660, 0.45)); }
};

const Speech = {
  ok: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window, voices: [], token: 0, current: null, watch: 0, heard: false, unlocked: false, warned: false,
  init() {
    if (!this.ok) return;
    const grab = () => { try { this.voices = speechSynthesis.getVoices().filter(v => /^en[-_]/i.test(v.lang)); } catch (e) { this.voices = []; } };
    grab(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', grab);
    // iOS : la liste des voix n'est souvent complète qu'après un premier geste. Aucune lecture muette
    // ici : elle obligeait la vraie lecture à l'annuler puis à repartir hors du geste, ce qu'iOS refuse.
    const unlock = () => { if (this.unlocked) return; this.unlocked = true; grab(); };
    ['pointerdown', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, { capture: true, once: true }));
  },
  list(variety) { const re = variety === 'us' ? /^en[-_]US/i : /^en[-_]GB/i; return this.voices.filter(v => re.test(v.lang)); },
  voice(variety) {
    const wanted = S.settings[variety === 'us' ? 'voiceUs' : 'voiceUk'];
    const list = this.list(variety);
    const score = v => (/premium|enhanced|natural|siri/i.test(v.name) ? 8 : 0) + (GOOD_VOICES.test(v.name) ? 4 : 0) + (ODD_VOICES.test(v.name) ? -10 : 0) + (v.localService ? 1 : 0);
    return list.find(v => v.name === wanted) || list.slice().sort((a, b) => score(b) - score(a))[0] || null;
  },
  say(text, opt) {
    opt = opt || {};
    const done = () => { const f = opt.onend; opt.onend = null; if (f) f(); };
    if (!this.ok) { done(); return; }
    const synth = speechSynthesis, variety = opt.variety || V(), token = ++this.token;
    Sound.prime(opt.audio);                            // dans le geste, avant toute lecture
    const start = (withVoice, attempt) => {
      const u = new SpeechSynthesisUtterance(plain(text)), v = withVoice ? this.voice(variety) : null;
      if (v) { try { u.voice = v; } catch (e) { } }
      u.lang = v ? v.lang : (variety === 'us' ? 'en-US' : 'en-GB');
      u.rate = (opt.slow ? 0.62 : 1) * S.settings.rate; u.volume = 1;
      if (opt.pitch) u.pitch = opt.pitch;
      let started = false;
      u.onstart = () => { started = true; this.heard = true; };
      u.onend = () => { if (token === this.token) { clearTimeout(this.watch); done(); } };
      u.onerror = e => {
        if (token !== this.token) return;
        clearTimeout(this.watch);
        if (!started && attempt === 0 && e && e.error !== 'interrupted' && e.error !== 'canceled') start(false, 1); else done();
      };
      this.current = u;                                // garder une référence : iOS oublie parfois l'énoncé
      try { synth.resume(); } catch (e) { }
      try { synth.speak(u); } catch (e) { done(); return; }
      clearTimeout(this.watch);
      this.watch = setTimeout(() => {                  // rien n'a démarré : nouvel essai sans voix imposée, puis aide
        if (token !== this.token || started) return;
        if (attempt === 0) { try { synth.cancel(); } catch (e) { } setTimeout(() => { if (token === this.token) start(false, 1); }, 90); }
        else { done(); if (!this.warned) { this.warned = true; toast('No sound? Run the sound check in Settings.'); } }
      }, 1800);
    };
    if (synth.speaking || synth.pending) {
      try { synth.cancel(); } catch (e) { }
      // tant qu'aucune lecture n'a abouti, on reste dans le geste ; ensuite, une courte pause évite qu'iOS n'avale la reprise
      if (this.heard) setTimeout(() => { if (token === this.token) start(true, 0); }, 80); else start(true, 0);
    } else start(true, 0);
  },
  stop() {
    if (!this.ok) return;
    this.token++; clearTimeout(this.watch);
    try { if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel(); } catch (e) { }
  }
};

/* ---------- microphone: record, then listen to yourself ---------- */
const Rec = {
  ok: !!(navigator.mediaDevices && window.MediaRecorder), mr: null, stream: null, chunks: [], url: '',
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = []; this.mr = new MediaRecorder(this.stream);
    this.mr.ondataavailable = e => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.mr.start();
  },
  stop() {
    return new Promise(res => {
      const mr = this.mr; if (!mr || mr.state === 'inactive') return res(this.url);
      mr.onstop = () => {
        if (this.stream) this.stream.getTracks().forEach(t => t.stop());
        Sound.session('auto');                         // après le micro, iOS peut laisser le son sur l'écouteur
        if (this.url) URL.revokeObjectURL(this.url);
        this.url = URL.createObjectURL(new Blob(this.chunks, { type: mr.mimeType || 'audio/mp4' }));
        this.mr = null; res(this.url);
      };
      mr.stop();
    });
  },
  get active() { return !!(this.mr && this.mr.state === 'recording'); }
};

/* ---------- progress per skill ---------- */
function unitIds() {
  const u = { vocabulary: [], grammar: [], reading: [], writing: [], speaking: [], listening: [] };
  Object.keys(DATA.skills).forEach(t => {
    const k = DATA.skills[t];
    k.reading.forEach(x => u.reading.push(x.id));
    k.writing.forEach(x => u.writing.push(x.id));
    k.roleplays.forEach(x => u.speaking.push(x.id));
    k.dialogues.forEach(x => u.listening.push(x.id));
  });
  DATA.language.grammar.forEach(x => u.grammar.push(x.id));
  DATA.language.connectors.forEach(x => u.grammar.push(x.id));
  DATA.language.pronunciation.forEach(x => u.speaking.push(x.id));
  return u;
}
const UNITS = unitIds();
function skillProgress() {
  const out = {};
  Object.keys(UNITS).forEach(k => { out[k] = pct(UNITS[k].filter(id => S.done[id]).length, UNITS[k].length); });
  out.vocabulary = pct(ALL_ENTRIES.filter(e => mastered(e.id)).length * 1 + ALL_ENTRIES.filter(e => S.srs[e.id] && !mastered(e.id)).length * 0.4, ALL_ENTRIES.length);
  return out;
}
function markDone(id, score) {
  const prev = S.done[id];
  S.done[id] = { s: Math.max(score == null ? 100 : score, prev ? prev.s : 0), t: Date.now() };
  save();
}
const levelOpen = (theme, level) => level === 1 || (S.levels[theme + ':' + (level - 1)] || 0) >= 80 || (S.placement && S.placement.unlock >= level);

/* Mesure ce qu'une joueuse ressent vraiment, niveau par niveau :
   - le score interne (somme des coûts) ;
   - la technique la plus dure exigée (c'est ce qui fait « bloquer ») ;
   - combien de cases on peut poser avec les seuls candidats évidents ;
   - combien de coups « avancés » (palier >= 4) la grille impose. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../../Web/index.html'), 'utf8');
const src = html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const E = {};
new Function('module', src + '\nmodule.exports = { candidates, nextStep, applyStep, generate, LEVELS, LEVEL_KEYS };')(
  { set exports(v) { Object.assign(E, v); }, get exports() { return E; } });

const N = Number(process.argv[2] || 6);
const med = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

function analyse(p) {
  const b = p.givens.slice(), cs = E.candidates(b);
  const parPalier = {}; let dur = 0, avances = 0, coups = 0;
  while (true) {
    const s = E.nextStep(b, cs, 6);
    if (!s) break;
    coups++;
    parPalier[s.tier] = (parPalier[s.tier] || 0) + 1;
    dur = Math.max(dur, s.tier);
    if (s.tier >= 4) avances++;
    E.applyStep(s, b, cs);
  }
  // jusqu'où va-t-on avec les seuls candidats évidents (paliers 1-2) ?
  const b2 = p.givens.slice(), cs2 = E.candidates(b2);
  let posees = 0;
  while (true) {
    const s = E.nextStep(b2, cs2, 2);
    if (!s) break;
    if (s.placement) posees++;
    E.applyStep(s, b2, cs2);
  }
  const vides = p.givens.filter(v => v === 0).length;
  return { dur, avances, coups, parPalier, evident: Math.round(100 * posees / vides), vides };
}

console.log('  niveau      score(méd)   palier le + dur      coups avancés   % posé sans technique   indices');
for (const lvl of E.LEVEL_KEYS) {
  const scores = [], durs = [], avs = [], evs = [], ind = [];
  for (let k = 0; k < N; k++) {
    const p = E.generate(lvl, 3000);
    const a = analyse(p);
    scores.push(p.score); durs.push(a.dur); avs.push(a.avances); evs.push(a.evident);
    ind.push(p.givens.filter(v => v).length);
  }
  const distDur = {};
  durs.forEach(d => distDur[d] = (distDur[d] || 0) + 1);
  console.log('  ' + lvl.padEnd(10) +
    String(med(scores)).padStart(8) +
    '      ' + JSON.stringify(distDur).padEnd(22) +
    '  méd ' + String(med(avs)).padStart(2) + ' (max ' + Math.max(...avs) + ')' +
    '   ' + String(med(evs)).padStart(3) + '% (min ' + Math.min(...evs) + '%)' +
    '   ' + Math.min(...ind) + '-' + Math.max(...ind));
}

/* Verdict : la difficulté doit monter, pas stagner. */
const durs = [], murs = [], scores = [];
for (const lvl of E.LEVEL_KEYS) {
  const c = E.LEVELS[lvl];
  durs.push(c.tier); murs.push(c.minHard); scores.push(c.lo);
}
let fails = 0;
const check = (c, m) => { if (!c) { fails++; console.log('  ECHEC:', m); } };
for (let i = 1; i < durs.length; i++) {
  check(durs[i] >= durs[i - 1], 'palier exigé en recul entre ' + E.LEVEL_KEYS[i - 1] + ' et ' + E.LEVEL_KEYS[i]);
  check(murs[i] >= murs[i - 1], 'nombre de murs en recul entre ' + E.LEVEL_KEYS[i - 1] + ' et ' + E.LEVEL_KEYS[i]);
  check(scores[i] > scores[i - 1], 'plancher de score en recul entre ' + E.LEVEL_KEYS[i - 1] + ' et ' + E.LEVEL_KEYS[i]);
  check(durs[i] > durs[i - 1] || murs[i] > murs[i - 1], 'aucune marche entre ' + E.LEVEL_KEYS[i - 1] + ' et ' + E.LEVEL_KEYS[i]);
}
console.log(fails ? '\n' + fails + ' PROBLEME(S)' : '\nECHELLE : chaque niveau ajoute une marche (technique ou mur)');
process.exit(fails ? 1 : 0);

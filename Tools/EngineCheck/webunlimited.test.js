/* Preuve que la génération est illimitée : on enchaîne les grilles sur tous
   les niveaux, on vérifie qu'aucune ne se répète et que toutes sont conformes. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../../Web/index.html'), 'utf8');
const src = html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const E = {};
new Function('module', src + '\nmodule.exports = { generate, rate, countSolutions, LEVELS, LEVEL_KEYS };')(
  { set exports(v) { Object.assign(E, v); }, get exports() { return E; } });

let fails = 0;
const check = (c, m) => { if (!c) { fails++; console.log('  ECHEC:', m); } };
const seen = new Set();
const COUNT = { easy: 40, medium: 30, hard: 25, expert: 20, master: 15, extreme: 15 };

for (const lvl of E.LEVEL_KEYS) {
  const c = E.LEVELS[lvl];
  const t0 = Date.now();
  let attempts = 0;
  for (let k = 0; k < COUNT[lvl]; k++) {
    const p = E.generate(lvl);
    attempts += p.attempts;
    const key = p.givens.join('');
    check(!seen.has(key), lvl + ': grille répétée');
    seen.add(key);
    check(p.score >= c.lo && p.score <= c.hi && p.tier >= c.tier, lvl + ': hors fourchette (' + p.score + ')');
    check(E.countSolutions(p.givens, 2) === 1, lvl + ': solution non unique');
  }
  const ms = Date.now() - t0;
  console.log(`${lvl.padEnd(8)} ${COUNT[lvl]} grilles enchaînées | ${(attempts / COUNT[lvl]).toFixed(1)} essais/grille | ` +
    `${(ms / COUNT[lvl]).toFixed(0)} ms/grille | 0 répétition`);
}
console.log(`total ${seen.size} grilles distinctes`);
console.log(fails ? fails + ' ECHEC(S)' : 'GENERATION ILLIMITEE : AUCUN ECHEC');
process.exit(fails ? 1 : 0);

const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../../Web/index.html'), 'utf8');
const src = html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const E = {};
new Function('module', src + '\nmodule.exports = { N, UNITS, PEERS, candidates, nextStep, applyStep, logicalSolve, countSolutions, rate, generate, LEVELS, LEVEL_KEYS };')({ set exports(v) { Object.assign(E, v); }, get exports() { return E; } });
let fails = 0;
const check = (c, m) => { if (!c) { fails++; console.log('  ECHEC:', m); } };

for (const lvl of E.LEVEL_KEYS) {
  const c = E.LEVELS[lvl];
  const scores = [], clues = [], times = [], tiers = {};
  let inBand = 0;
  const n = 8;
  for (let k = 0; k < n; k++) {
    const t = Date.now();
    const p = E.generate(lvl, 4000);
    times.push(Date.now() - t);
    const r = E.rate(p.givens);
    check(r !== null, lvl + ': grille non résoluble sans deviner');
    scores.push(p.score); clues.push(p.givens.filter(v => v).length);
    tiers[p.tier] = (tiers[p.tier] || 0) + 1;
    if (p.score >= c.lo && p.score <= c.hi && p.tier >= c.tier) inBand++;
    check(E.countSolutions(p.givens, 2) === 1, lvl + ': solution non unique');
    check(p.givens.every((g, i) => g === 0 || g === p.solution[i]), lvl + ': indice incompatible');
    check(p.givens.filter(v => v).length >= c.floor, lvl + ': sous le plancher d’indices');
    // les indices doivent toujours poser un chiffre et finir la grille
    const b = p.givens.slice();
    let guard = 0;
    while (b.some(v => v === 0)) {
      if (++guard > 200) { check(false, lvl + ': indices bloqués'); break; }
      const work = b.slice(), cs = E.candidates(work);
      let placed = false;
      for (let z = 0; z < 100; z++) {
        const s = E.nextStep(work, cs, 5);
        if (!s) break;
        if (s.placement) { check(s.pv === p.solution[s.pi], lvl + ': indice fautif'); b[s.pi] = s.pv; placed = true; break; }
        E.applyStep(s, work, cs);
      }
      check(placed, lvl + ': un indice n’a posé aucun chiffre');
      if (!placed) break;
    }
    check(b.every((v, i) => v === p.solution[i]), lvl + ': les indices n’aboutissent pas');
  }
  times.sort((a, b) => a - b);
  console.log(`${lvl.padEnd(8)} score ${Math.min(...scores)}-${Math.max(...scores)} (fourchette ${c.lo}-${c.hi === 1e9 ? '∞' : c.hi}) | ` +
    `indices ${Math.min(...clues)}-${Math.max(...clues)} | dans la fourchette ${inBand}/${n} | ` +
    `temps med ${times[n>>1]} ms max ${times[n-1]} ms | paliers ${JSON.stringify(tiers)}`);
}

// les niveaux doivent rester ordonnés
const meds = {};
for (const lvl of E.LEVEL_KEYS) {
  const sc = [];
  for (let k = 0; k < 5; k++) sc.push(E.generate(lvl, 4000).score);
  sc.sort((a, b) => a - b);
  meds[lvl] = sc[2];
}
const ordered = E.LEVEL_KEYS.every((l, i) => i === 0 || meds[l] > meds[E.LEVEL_KEYS[i - 1]]);
check(ordered, 'les niveaux ne sont pas strictement croissants: ' + JSON.stringify(meds));
console.log('médianes:', JSON.stringify(meds));
console.log(fails ? fails + ' ECHEC(S)' : 'MOTEUR WEB 6 NIVEAUX : AUCUN ECHEC');
process.exit(fails ? 1 : 0);

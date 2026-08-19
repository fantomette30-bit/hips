const E = require('./engine.js');
let fails = 0;
const check = (c, m) => { if (!c) { fails++; console.log('  ECHEC:', m); } };

for (const lvl of ['easy', 'medium', 'hard']) {
  const scores = [], clues = [], times = [];
  let needElim = 0;
  for (let k = 0; k < 12; k++) {
    const t = Date.now();
    const p = E.generate(lvl);
    times.push(Date.now() - t);
    scores.push(p.score); clues.push(p.givens.filter(v => v !== 0).length);
    const c = E.LEVELS[lvl];
    check(E.countSolutions(p.givens, 2) === 1, lvl + ': solution non unique');
    check(E.logicalSolve(p.givens, 4), lvl + ': non résoluble sans deviner');
    check(p.givens.every((g, i) => g === 0 || g === p.solution[i]), lvl + ': indice incompatible');
    check(p.givens.filter(v => v !== 0).length >= c.floor, lvl + ': trop peu d’indices');
    check(p.score >= c.lo && p.score <= c.hi, lvl + ': score ' + p.score + ' hors fourchette');

    // simulation de l'indice du jeu : chaque appel doit poser exactement un chiffre
    const b = p.givens.slice();
    let hints = 0, elim = false;
    while (b.some(v => v === 0)) {
      if (++hints > 200) { check(false, lvl + ': indices bloqués'); break; }
      const work = b.slice(); const cs = E.candidates(work);
      let placed = false;
      for (let z = 0; z < 80; z++) {
        const s = E.nextStep(work, cs, 4);
        if (!s) break;
        if (s.placement) {
          check(s.pv === p.solution[s.pi], lvl + ': indice fautif');
          b[s.pi] = s.pv; placed = true; break;
        }
        elim = true;
        E.applyStep(s, work, cs);
      }
      check(placed, lvl + ': un indice n’a posé aucun chiffre');
      if (!placed) break;
    }
    if (elim) needElim++;
    check(b.every((v, i) => v === p.solution[i]), lvl + ': indices n’aboutissent pas à la solution');
  }
  times.sort((a, b) => a - b);
  console.log(`${lvl.padEnd(7)} score ${Math.min(...scores)}..${Math.max(...scores)} | indices ${Math.min(...clues)}-${Math.max(...clues)} | ` +
    `génération médiane ${times[6]} ms (max ${times[11]} ms) | grilles à éliminations ${needElim}/12`);
}
console.log(fails ? fails + ' ECHEC(S)' : 'MOTEUR WEB : AUCUN ECHEC');
process.exit(fails ? 1 : 0);

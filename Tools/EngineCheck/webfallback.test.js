/* Le filet de sécurité : si aucune grille notable ne sort, la recherche doit
   se terminer avec une grille jouable — et non tourner sans fin. */
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '../../Web/index.html'), 'utf8');
const src = html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const E = {};
new Function('module', src +
  '\nattemptOnce = () => null;' +          // aucune grille notable, jamais
  '\nmodule.exports = { generate, generateChunked, fallbackPuzzle, logicalSolve, countSolutions, rate, LEVELS };'
)({ set exports(v) { Object.assign(E, v); }, get exports() { return E; } });

let fails = 0;
const check = (c, m) => { if (!c) { fails++; console.log('  ECHEC:', m); } };

// 1. version synchrone
const t0 = Date.now();
const p = E.generate('legend', 3000);
check(p && p.givens.length === 81, 'aucune grille renvoyée');
check(E.countSolutions(p.givens, 2) === 1, 'la grille de secours n’a pas une solution unique');
check(E.logicalSolve(p.givens.slice(), 6), 'la grille de secours demande de deviner');
console.log('  repli synchrone :', p.givens.filter(v => v).length, 'indices, score', p.score,
            'palier', p.tier, 'en', Date.now() - t0, 'ms');

// 2. version découpée : elle doit rendre la main, pas boucler
const t1 = Date.now();
const done = new Promise((res, rej) => {
  const timer = setTimeout(() => rej(new Error('generateChunked ne se termine jamais')), 30000);
  E.generateChunked('legend', { onDone: q => { clearTimeout(timer); res(q); } });
});
done.then(q => {
  check(q && q.givens.length === 81, 'recherche découpée : aucune grille');
  check(E.countSolutions(q.givens, 2) === 1, 'recherche découpée : solution non unique');
  console.log('  repli découpé :', q.attempts, 'essais,', q.givens.filter(v => v).length,
              'indices, en', Date.now() - t1, 'ms');
  console.log(fails ? '\n' + fails + ' PROBLEME(S)' : '\nFILET DE SECURITE : la recherche se termine toujours');
  process.exit(fails ? 1 : 0);
}).catch(e => { console.log('  ECHEC:', e.message); process.exit(1); });

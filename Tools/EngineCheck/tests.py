import random, sys, time, json, statistics
from engine import *

FAIL = []
def check(cond, msg):
    if not cond:
        FAIL.append(msg)
        print("  ECHEC:", msg)

def solved_board_valid(b):
    if any(v == 0 for v in b): return False
    for u in UNITS:
        if sorted(b[i] for i in u) != list(range(1, 10)): return False
    return True

print("== 1. Génération (six niveaux) ==")
COUNTS = {"easy": 8, "medium": 8, "hard": 6, "expert": 4, "master": 3, "extreme": 2}
# Python tourne environ 50 fois moins vite que le moteur embarqué : on lui laisse
# un budget généreux pour qu'il fasse autant d'essais que l'app sur l'appareil.
BUDGETS = {"easy": 5, "medium": 5, "hard": 15, "expert": 45, "master": 90, "extreme": 120}
puzzles = {}
for d in LEVEL_ORDER:
    rng = random.Random(2024)
    conf = DIFFICULTIES[d]
    got, t0 = [], time.time()
    for _ in range(COUNTS[d]):
        p = generate(d, rng, budget=BUDGETS[d])
        got.append(p)
        check(solved_board_valid(p["solution"]), f"{d}: solution invalide")
        check(all(g == 0 or g == s for g, s in zip(p["givens"], p["solution"])),
              f"{d}: indice incompatible avec la solution")
        check(count_solutions(p["givens"]) == 1, f"{d}: solution non unique")
        check(rate(p["givens"]) is not None, f"{d}: grille non résoluble sans deviner")
        clues = CELL_COUNT - p["givens"].count(0)
        check(clues >= conf["clue_floor"], f"{d}: {clues} indices < plancher {conf['clue_floor']}")
        check(not p.get("fallback"), f"{d}: repli d'urgence déclenché")
    puzzles[d] = got
    scores = sorted(x["score"] for x in got)
    clues = [CELL_COUNT - x["givens"].count(0) for x in got]
    lo, hi = conf["accepted"]
    inband = sum(1 for x in got if lo <= x["score"] <= hi and x["tier"] >= conf["tier"])
    tiers = sorted(x["tier"] for x in got)
    print(f"  {d:8} score {scores[0]:.0f}..{scores[-1]:.0f} (visé {lo}-{hi if hi < 100000 else '∞'}) | "
          f"indices {min(clues)}-{max(clues)} | dans la fourchette {inband}/{len(got)} | "
          f"paliers {tiers} | {(time.time()-t0)/len(got):.1f}s/grille (python)")

print("== 2. Niveaux strictement croissants ==")
med = {d: statistics.median([x["score"] for x in puzzles[d]]) for d in LEVEL_ORDER}
ordered = all(med[LEVEL_ORDER[i]] > med[LEVEL_ORDER[i-1]] for i in range(1, len(LEVEL_ORDER)))
check(ordered, f"ordre des difficultés incorrect: {med}")
print("  médianes:", {k: round(v) for k, v in med.items()})

print("== 3. Les indices résolvent la grille, posent toujours un chiffre, sans erreur ==")
for d in LEVEL_ORDER:
    for p in puzzles[d][:3]:
        g = GameState(p)
        steps = 0
        while not g.is_complete and steps < 200:
            before = list(g.values)
            g.use_hint()
            steps += 1
            changed = [i for i in range(CELL_COUNT) if g.values[i] != before[i]]
            # régression : un indice qui n'avance pas boucle indéfiniment
            check(len(changed) == 1, f"{d}: un indice n'a posé aucun chiffre (blocage possible)")
            for i in changed:
                check(g.values[i] == p["solution"][i], f"{d}: un indice a placé une valeur fausse")
            if not changed: break
        check(g.is_complete, f"{d}: les indices n'ont pas terminé la grille ({steps} étapes)")
        check(g.mistakes == 0, f"{d}: les indices ont créé des erreurs")

print("== 3 bis. Indices sur grilles exigeant des éliminations ==")
tricky = 0
for p in puzzles["hard"] + puzzles["expert"] + puzzles["master"] + puzzles["extreme"]:
    b = list(p["givens"])
    cs = candidates(b)
    needs_elimination = False
    while 0 in b:
        s = next_step(b, cs, 4)
        if s is None: break
        if not s.is_placement: needs_elimination = True
        apply_step(s, b, cs)
    if not needs_elimination: continue
    tricky += 1
    g = GameState(p)
    steps = 0
    while not g.is_complete and steps < 200:
        before = list(g.values)
        g.use_hint()
        steps += 1
        check(g.values != before, "difficile: indice bloqué sur une grille à éliminations")
        if g.values == before: break
    check(g.is_complete, "difficile: indices bloqués avant la fin")
print(f"  grilles corsées exigeant au moins une élimination : {tricky}")

print("== 4. Indices sur grille avec erreur du joueur ==")
p = puzzles["medium"][0]
g = GameState(p)
empty = [i for i in range(CELL_COUNT) if g.values[i] == 0][0]
wrong = next(v for v in range(1, 10) if v != p["solution"][empty])
g.select(empty); g.input(wrong)
check(g.mistakes == 1, "l'erreur n'a pas été comptée")
g.use_hint()
check(g.highlighted_by_hint == [empty], "l'indice ne pointe pas l'erreur")
check(g.values[empty] == wrong, "l'indice a modifié la case fautive au lieu de la signaler")

print("== 5. Annulation : retour exact à l'état initial ==")
for d in LEVEL_ORDER[:4]:
    p = puzzles[d][1]
    g = GameState(p)
    rng = random.Random(7)
    snapshots = []
    for _ in range(60):
        i = rng.randrange(CELL_COUNT)
        g.select(i)
        if g.selected_index is None: g.select(i)
        snapshots.append((list(g.values), list(g.notes)))
        action = rng.random()
        if action < 0.45: g.input(rng.randint(1, 9))
        elif action < 0.8:
            g.is_note_mode = True; g.input(rng.randint(1, 9)); g.is_note_mode = False
        else: g.erase()
        if g.is_complete: break
    g.fill_all_notes()
    while g.history: g.undo()
    check(g.values == list(p["givens"]), f"{d}: annulation ne restaure pas les valeurs")
    check(g.notes == [0] * CELL_COUNT, f"{d}: annulation ne restaure pas les notes")

print("== 6. Notes : effacement automatique + annulation ==")
p = puzzles["easy"][0]
g = GameState(p)
empty = [i for i in range(CELL_COUNT) if g.values[i] == 0]
target, peer = empty[0], None
for q in PEERS[empty[0]]:
    if g.values[q] == 0: peer = q; break
digit = p["solution"][target]
g.select(peer); g.is_note_mode = True; g.input(digit); g.is_note_mode = False
check(has(g.notes[peer], digit), "la note n'a pas été posée")
notes_before = list(g.notes)
g.select(target); g.input(digit)
check(not has(g.notes[peer], digit), "la note voisine n'a pas été effacée")
g.undo()
check(g.notes == notes_before, "l'annulation n'a pas restauré les notes voisines")
check(g.values[target] == 0, "l'annulation n'a pas retiré la valeur")

print("== 7. Fin de partie ==")
p = puzzles["easy"][2]
g = GameState(p)
for i in range(CELL_COUNT):
    if g.values[i] == 0:
        g.select(i); g.input(p["solution"][i])
check(g.is_complete, "victoire non détectée")
check(g.selected_index is None, "sélection non réinitialisée à la victoire")
before = list(g.values)
g.select(0); g.input(5); g.erase(); g.undo(); g.use_hint()
check(g.values == before, "la grille est modifiable après la victoire")

print("== 8. Compteur de chiffres restants ==")
p = puzzles["medium"][3]
g = GameState(p)
for d in range(1, 10):
    check(g.remaining(d) == 9 - p["givens"].count(d), f"compteur initial faux pour {d}")
i = [x for x in range(CELL_COUNT) if g.values[x] == 0][0]
sol = p["solution"][i]
g.select(i); g.input(sol)
check(g.remaining(sol) == 9 - p["givens"].count(sol) - 1, "compteur non décrémenté")

print("== 9. Sauvegarde / reprise (round-trip JSON) ==")
p = puzzles["expert"][0]
g = GameState(p)
g.select([i for i in range(CELL_COUNT) if g.values[i] == 0][0])
g.input(3); g.is_note_mode = True; g.input(7); g.is_note_mode = False
snap = dict(puzzle=dict(givens=p["givens"], solution=p["solution"], difficulty="hard"),
            values=g.values, notes=g.notes, elapsed=42.0, mistakes=g.mistakes,
            hintsUsed=g.hints_used, savedAt="2026-08-19T00:00:00Z")
restored = json.loads(json.dumps(snap))
check(restored["values"] == g.values and restored["notes"] == g.notes, "round-trip JSON incorrect")
check(all(0 <= n <= 1022 for n in g.notes), "masque de notes hors bornes UInt16")

print("== 10. Robustesse : grille pleine, grille vide, valeurs limites ==")
check(rate(puzzles["easy"][0]["solution"])[0] == 0, "score d'une grille déjà résolue != 0")
check(logical_solve(puzzles["easy"][0]["solution"], 4) == (True, 0), "résolution d'une grille pleine")
check(count_solutions([0] * CELL_COUNT, 2) == 2, "grille vide devrait avoir plusieurs solutions")
g = GameState(puzzles["easy"][0])
g.select(None if False else 0)
given_cells = [i for i in range(CELL_COUNT) if g.is_given(i)]
g.select(given_cells[0]); g.input(9); g.erase()
check(g.values[given_cells[0]] == puzzles["easy"][0]["givens"][given_cells[0]], "une case fixe a été modifiée")
check(not g.history, "un coup a été enregistré sur une case fixe")

print()
print("RESULTAT:", "AUCUN ECHEC" if not FAIL else f"{len(FAIL)} ECHEC(S)")
sys.exit(1 if FAIL else 0)

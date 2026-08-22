"""Translittération fidèle de ZenSudoku/Core/*.swift et Game/GameState.swift."""
import random

CELL_COUNT = 81
ROWS = [[r * 9 + c for c in range(9)] for r in range(9)]
COLUMNS = [[r * 9 + c for r in range(9)] for c in range(9)]
def _box(b):
    br, bc = (b // 3) * 3, (b % 3) * 3
    return [(br + r) * 9 + bc + c for r in range(3) for c in range(3)]
BOXES = [_box(b) for b in range(9)]
UNITS = ROWS + COLUMNS + BOXES
PEERS = []
for i in range(CELL_COUNT):
    s = set()
    for u in UNITS:
        if i in u:
            s.update(x for x in u if x != i)
    PEERS.append(sorted(s))

def row_of(i): return i // 9
def col_of(i): return i % 9
def box_of(i): return (i // 27) * 3 + (i % 9) // 3
def unit_name(ui):
    if ui < 9: return "la ligne %d" % (ui + 1)
    if ui < 18: return "la colonne %d" % (ui - 8)
    return "le bloc %d" % (ui - 17)

ALL_MASK = 0b1111111110
def bit(d): return 1 << d
def has(m, d): return (m & bit(d)) != 0
def remove(m, d): return m & ~bit(d)
def toggle(m, d): return m ^ bit(d)
def mcount(m): return bin(m).count("1")
def digits_of(m): return [d for d in range(1, 10) if has(m, d)]
def first_digit(m):
    for d in range(1, 10):
        if has(m, d): return d
    return 0
def make_mask(ds):
    m = 0
    for d in ds: m |= bit(d)
    return m

def is_safe(board, index, value):
    return all(board[p] != value for p in PEERS[index])

class Step:
    def __init__(self, kind, tier, pi, pv, targets, digits, restricts, title, detail):
        self.kind, self.tier = kind, tier
        self.placement_index, self.placement_value = pi, pv
        self.targets, self.digits, self.restricts = targets, digits, restricts
        self.title, self.detail = title, detail
    @property
    def is_placement(self): return self.placement_index is not None

def candidates(board):
    res = [0] * CELL_COUNT
    for i in range(CELL_COUNT):
        if board[i] == 0:
            m = ALL_MASK
            for p in PEERS[i]:
                v = board[p]
                if v: m = remove(m, v)
            res[i] = m
    return res

def naked_single(b, cs):
    for i in range(CELL_COUNT):
        if b[i] == 0 and mcount(cs[i]) == 1:
            v = first_digit(cs[i])
            return Step("nakedSingle", 1, i, v, [i], [v], False, "Candidat unique", "")
    return None

def hidden_single(b, cs):
    for ui, unit in enumerate(UNITS):
        for d in range(1, 10):
            already = False
            spots = []
            for i in unit:
                if b[i] == d:
                    already = True
                    break
                if b[i] == 0 and has(cs[i], d): spots.append(i)
            if already or len(spots) != 1: continue
            return Step("hiddenSingle", 2, spots[0], d, [spots[0]], [d], False, "Candidat caché", unit_name(ui))
    return None

def locked_candidates(b, cs):
    for bi, box in enumerate(BOXES):
        for d in range(1, 10):
            spots = [i for i in box if b[i] == 0 and has(cs[i], d)]
            if len(spots) < 2: continue
            rows = {row_of(i) for i in spots}
            cols = {col_of(i) for i in spots}
            if len(rows) == 1:
                r = next(iter(rows))
                elim = [i for i in ROWS[r] if i not in box and b[i] == 0 and has(cs[i], d)]
                if elim: return Step("pointing", 3, None, None, elim, [d], False, "Paire pointante", "")
            if len(cols) == 1:
                c = next(iter(cols))
                elim = [i for i in COLUMNS[c] if i not in box and b[i] == 0 and has(cs[i], d)]
                if elim: return Step("pointing", 3, None, None, elim, [d], False, "Paire pointante", "")
    lines = ROWS + COLUMNS
    for li, line in enumerate(lines):
        for d in range(1, 10):
            spots = [i for i in line if b[i] == 0 and has(cs[i], d)]
            if len(spots) < 2: continue
            boxes = {box_of(i) for i in spots}
            if len(boxes) != 1: continue
            bi = next(iter(boxes))
            elim = [i for i in BOXES[bi] if i not in line and b[i] == 0 and has(cs[i], d)]
            if elim: return Step("claiming", 3, None, None, elim, [d], False, "Chiffre revendiqué", "")
    return None

def naked_pair(b, cs):
    for ui, unit in enumerate(UNITS):
        empties = [i for i in unit if b[i] == 0]
        if len(empties) < 3: continue
        for a in range(len(empties)):
            first = empties[a]
            if mcount(cs[first]) != 2: continue
            for bb in range(a + 1, len(empties)):
                second = empties[bb]
                if cs[second] != cs[first]: continue
                mask = cs[first]
                elim = [i for i in empties if i != first and i != second and (cs[i] & mask) != 0]
                if elim:
                    return Step("nakedPair", 3, None, None, elim, digits_of(mask), False, "Paire nue", "")
    return None

def hidden_pair(b, cs):
    for ui, unit in enumerate(UNITS):
        empties = [i for i in unit if b[i] == 0]
        if len(empties) < 3: continue
        for first in range(1, 9):
            spots_a = [i for i in empties if has(cs[i], first)]
            if len(spots_a) != 2: continue
            for second in range(first + 1, 10):
                spots_b = [i for i in empties if has(cs[i], second)]
                if len(spots_b) != 2 or set(spots_a) != set(spots_b): continue
                mask = make_mask([first, second])
                if any((cs[i] & ~mask) != 0 for i in spots_a):
                    return Step("hiddenPair", 4, None, None, spots_a, [first, second], True, "Paire cachée", "")
    return None

def naked_triple(b, cs):
    for ui, unit in enumerate(UNITS):
        empties = [i for i in unit if b[i] == 0 and 2 <= mcount(cs[i]) <= 3]
        if len(empties) < 3: continue
        for a in range(len(empties) - 2):
            for bb in range(a + 1, len(empties) - 1):
                for c in range(bb + 1, len(empties)):
                    trio = [empties[a], empties[bb], empties[c]]
                    mask = cs[trio[0]] | cs[trio[1]] | cs[trio[2]]
                    if mcount(mask) != 3: continue
                    elim = [i for i in unit if b[i] == 0 and i not in trio and (cs[i] & mask) != 0]
                    if elim:
                        return Step("nakedTriple", 4, None, None, elim, digits_of(mask), False, "Triplet nu", "")
    return None

def x_wing(b, cs):
    for d in range(1, 10):
        for orientation in range(2):
            lines = ROWS if orientation == 0 else COLUMNS
            cross_lines = COLUMNS if orientation == 0 else ROWS
            pairs = {}
            for li, line in enumerate(lines):
                spots = [i for i in line if b[i] == 0 and has(cs[i], d)]
                if len(spots) == 2: pairs[li] = spots
            keys = sorted(pairs)
            if len(keys) < 2: continue
            for a in range(len(keys) - 1):
                first = pairs[keys[a]]
                first_cross = sorted(col_of(i) if orientation == 0 else row_of(i) for i in first)
                for bb in range(a + 1, len(keys)):
                    second = pairs[keys[bb]]
                    second_cross = sorted(col_of(i) if orientation == 0 else row_of(i) for i in second)
                    if first_cross != second_cross: continue
                    corners = first + second
                    elim = []
                    for cross in first_cross:
                        for i in cross_lines[cross]:
                            if b[i] == 0 and i not in corners and has(cs[i], d): elim.append(i)
                    if elim:
                        return Step("xWing", 4, None, None, elim, [d], False, "X-Wing", "")
    return None


def hidden_triple(b, cs):
    for ui, unit in enumerate(UNITS):
        empties = [i for i in unit if b[i] == 0]
        if len(empties) < 4: continue
        spots = {}
        for d in range(1, 10):
            places = [i for i in empties if has(cs[i], d)]
            if 2 <= len(places) <= 3: spots[d] = places
        ds = sorted(spots)
        for a in range(len(ds) - 2):
            for z in range(a + 1, len(ds) - 1):
                for c in range(z + 1, len(ds)):
                    trio = [ds[a], ds[z], ds[c]]
                    cells = sorted(set(spots[trio[0]] + spots[trio[1]] + spots[trio[2]]))
                    if len(cells) != 3: continue
                    mask = make_mask(trio)
                    if any((cs[i] & ~mask) != 0 for i in cells):
                        return Step("hiddenTriple", 4, None, None, cells, trio, True, "Triplet caché", "")
    return None

def xy_wing(b, cs):
    pairs = [i for i in range(CELL_COUNT) if b[i] == 0 and mcount(cs[i]) == 2]
    for pivot in pairs:
        x, y = digits_of(cs[pivot])
        wings = [i for i in pairs if i != pivot and i in PEERS[pivot]]
        for w1 in wings:
            d1 = digits_of(cs[w1])
            if x not in d1: continue
            z = d1[1] if d1[0] == x else d1[0]
            if z == y: continue
            for w2 in wings:
                if w2 == w1: continue
                d2 = digits_of(cs[w2])
                if y not in d2 or z not in d2: continue
                elim = [i for i in range(CELL_COUNT)
                        if b[i] == 0 and i not in (pivot, w1, w2) and has(cs[i], z)
                        and i in PEERS[w1] and i in PEERS[w2]]
                if elim:
                    return Step("xyWing", 5, None, None, elim, [z], False, "XY-Wing", "")
    return None

def swordfish(b, cs):
    for d in range(1, 10):
        for orientation in range(2):
            lines = ROWS if orientation == 0 else COLUMNS
            cross = COLUMNS if orientation == 0 else ROWS
            cand_lines = []
            for line in lines:
                spots = [i for i in line if b[i] == 0 and has(cs[i], d)]
                if len(spots) in (2, 3): cand_lines.append(spots)
            if len(cand_lines) < 3: continue
            for a in range(len(cand_lines) - 2):
                for z in range(a + 1, len(cand_lines) - 1):
                    for c in range(z + 1, len(cand_lines)):
                        corners = cand_lines[a] + cand_lines[z] + cand_lines[c]
                        ks = {(col_of(i) if orientation == 0 else row_of(i)) for i in corners}
                        if len(ks) != 3: continue
                        elim = [i for k in sorted(ks) for i in cross[k]
                                if b[i] == 0 and i not in corners and has(cs[i], d)]
                        if elim:
                            return Step("swordfish", 5, None, None, elim, [d], False, "Swordfish", "")
    return None


def xyz_wing(b, cs):
    for pivot in range(CELL_COUNT):
        if b[pivot] != 0 or mcount(cs[pivot]) != 3: continue
        wings = [i for i in PEERS[pivot]
                 if b[i] == 0 and mcount(cs[i]) == 2 and (cs[i] & ~cs[pivot]) == 0]
        for a in range(len(wings)):
            for z in range(a + 1, len(wings)):
                w1, w2 = wings[a], wings[z]
                if cs[w1] == cs[w2]: continue
                common = cs[w1] & cs[w2]
                if mcount(common) != 1: continue
                zd = first_digit(common)
                elim = [i for i in PEERS[pivot]
                        if b[i] == 0 and i not in (w1, w2) and has(cs[i], zd)
                        and i in PEERS[w1] and i in PEERS[w2]]
                if elim:
                    return Step("xyzWing", 6, None, None, elim, [zd], False, "XYZ-Wing", "")
    return None

def w_wing(b, cs):
    pair_cells = [i for i in range(CELL_COUNT) if b[i] == 0 and mcount(cs[i]) == 2]
    for a in range(len(pair_cells)):
        for z in range(a + 1, len(pair_cells)):
            A, B = pair_cells[a], pair_cells[z]
            if cs[A] != cs[B] or B in PEERS[A]: continue
            ds = digits_of(cs[A])
            for w, other in ((ds[0], ds[1]), (ds[1], ds[0])):
                for unit in UNITS:
                    spots = [i for i in unit if b[i] == 0 and has(cs[i], w)]
                    if len(spots) != 2: continue
                    s1, s2 = spots
                    if s1 in (A, B) or s2 in (A, B): continue
                    link = (s1 in PEERS[A] and s2 in PEERS[B]) or (s2 in PEERS[A] and s1 in PEERS[B])
                    if not link: continue
                    elim = [i for i in range(CELL_COUNT)
                            if b[i] == 0 and i not in (A, B) and has(cs[i], other)
                            and i in PEERS[A] and i in PEERS[B]]
                    if elim:
                        return Step("wWing", 6, None, None, elim, [other], False, "W-Wing", "")
    return None

def skyscraper(b, cs):
    for d in range(1, 10):
        for orientation in range(2):
            lines = ROWS if orientation == 0 else COLUMNS
            cross_of = (lambda i: col_of(i)) if orientation == 0 else (lambda i: row_of(i))
            pairs = []
            for line in lines:
                spots = [i for i in line if b[i] == 0 and has(cs[i], d)]
                if len(spots) == 2: pairs.append(spots)
            for a in range(len(pairs)):
                for z in range(a + 1, len(pairs)):
                    for base1, roof1 in ((pairs[a][0], pairs[a][1]), (pairs[a][1], pairs[a][0])):
                        for base2, roof2 in ((pairs[z][0], pairs[z][1]), (pairs[z][1], pairs[z][0])):
                            if cross_of(base1) != cross_of(base2): continue
                            if cross_of(roof1) == cross_of(roof2): continue
                            elim = [i for i in range(CELL_COUNT)
                                    if b[i] == 0 and has(cs[i], d)
                                    and i not in (base1, base2, roof1, roof2)
                                    and i in PEERS[roof1] and i in PEERS[roof2]]
                            if elim:
                                return Step("skyscraper", 6, None, None, elim, [d], False, "Gratte-ciel", "")
    return None

def next_step(b, cs, maximum_tier):
    s = naked_single(b, cs)
    if s: return s
    s = hidden_single(b, cs)
    if s: return s
    if maximum_tier < 3: return None
    s = locked_candidates(b, cs)
    if s: return s
    s = naked_pair(b, cs)
    if s: return s
    if maximum_tier < 4: return None
    s = hidden_pair(b, cs)
    if s: return s
    s = naked_triple(b, cs)
    if s: return s
    s = x_wing(b, cs)
    if s: return s
    s = hidden_triple(b, cs)
    if s: return s
    if maximum_tier < 5: return None
    s = xy_wing(b, cs)
    if s: return s
    s = swordfish(b, cs)
    if s: return s
    if maximum_tier < 6: return None
    s = xyz_wing(b, cs)
    if s: return s
    s = w_wing(b, cs)
    if s: return s
    return skyscraper(b, cs)

def apply_step(step, b, cs):
    if step.is_placement:
        i, v = step.placement_index, step.placement_value
        b[i] = v
        cs[i] = 0
        for p in PEERS[i]: cs[p] = remove(cs[p], v)
        return
    mask = make_mask(step.digits)
    for t in step.targets:
        cs[t] = (cs[t] & mask) if step.restricts else (cs[t] & ~mask)

def logical_solve(board, maximum_tier):
    work = board[:]
    cs = candidates(work)
    hardest = 0
    remaining = work.count(0)
    guard = 0
    while remaining > 0:
        guard += 1
        if guard > 5000: raise RuntimeError("boucle infinie dans logicalSolve")
        s = next_step(work, cs, maximum_tier)
        if s is None: return (False, hardest)
        hardest = max(hardest, s.tier)
        apply_step(s, work, cs)
        if s.is_placement: remaining -= 1
    return (True, hardest)

def count_solutions(board, limit=2):
    b = board[:]
    def rec():
        best, best_opts = -1, None
        for i in range(CELL_COUNT):
            if b[i] == 0:
                m = ALL_MASK
                for p in PEERS[i]:
                    if b[p]: m = remove(m, b[p])
                opts = digits_of(m)
                if not opts: return 0
                if best < 0 or len(opts) < len(best_opts):
                    best, best_opts = i, opts
                    if len(opts) == 1: break
        if best < 0: return 1
        total = 0
        for v in best_opts:
            b[best] = v
            total += rec()
            b[best] = 0
            if total >= limit: break
        return total
    return rec()

def has_unique_solution(board): return count_solutions(board, 2) == 1

def naked_single_count(b, cs):
    return sum(1 for i in range(CELL_COUNT) if b[i] == 0 and mcount(cs[i]) == 1)

def hidden_single_count(b, cs):
    found = set()
    for unit in UNITS:
        for d in range(1, 10):
            already = False
            spots = []
            for i in unit:
                if b[i] == d:
                    already = True
                    break
                if b[i] == 0 and has(cs[i], d): spots.append(i)
            if not already and len(spots) == 1: found.add(spots[0] * 10 + d)
    return len(found)

# --- DifficultyRater -------------------------------------------------------
def rate(board):
    """Renvoie (score, palier le plus avancé) ou None si la grille exige de deviner."""
    work = board[:]
    cs = candidates(work)
    total = 0.0
    hardest = 0
    remaining = work.count(0)
    while remaining > 0:
        s = next_step(work, cs, 6)
        if s is None: return None
        hardest = max(hardest, s.tier)
        if s.kind == "nakedSingle":
            n = naked_single_count(work, cs)
            total += 1 if n >= 4 else (2 if n == 3 else (3 if n == 2 else 5))
        elif s.kind == "hiddenSingle":
            n = hidden_single_count(work, cs)
            total += 9 if n >= 4 else (12 if n == 3 else (16 if n == 2 else 22))
        else:
            total += 45 if s.tier == 3 else (80 if s.tier == 4 else (140 if s.tier == 5 else 220))
        apply_step(s, work, cs)
        if s.is_placement: remaining -= 1
    return (total, hardest)

# --- Difficulty ------------------------------------------------------------
# floor = indices minimum, strategy = creusement, sym = symétrie,
# accepted = fourchette de score, tier = technique minimale exigée.
DIFFICULTIES = {
    "easy":    dict(rank=1, clue_floor=40, strategy=("logic", 2), sym=True,  accepted=(0, 85),      tier=0, target=55,  budget=2.5),
    "medium":  dict(rank=2, clue_floor=30, strategy=("logic", 3), sym=True,  accepted=(95, 200),    tier=0, target=150, budget=2.5),
    "hard":    dict(rank=3, clue_floor=26, strategy=("unique", 0), sym=True, accepted=(210, 330),   tier=0, target=270, budget=2.5),
    "expert":  dict(rank=4, clue_floor=24, strategy=("unique", 0), sym=True, accepted=(345, 480),   tier=0, target=410, budget=2.5),
    "master":  dict(rank=5, clue_floor=22, strategy=("unique", 0), sym=False, accepted=(495, 680),  tier=3, target=580, budget=4.0),
    "extreme": dict(rank=6, clue_floor=22, strategy=("unique", 0), sym=False, accepted=(700, 849), tier=3, target=770, budget=8.0),
    "demonic": dict(rank=7, clue_floor=22, strategy=("unique", 0), sym=False, accepted=(850, 1049), tier=5, target=940, budget=60.0),
    "titan":   dict(rank=8, clue_floor=22, strategy=("unique", 0), sym=False, accepted=(1050, 1299), tier=6, target=1160, budget=120.0),
    "legend":  dict(rank=9, clue_floor=22, strategy=("unique", 0), sym=False, accepted=(1300, 100000), tier=6, target=1500, budget=180.0),
}
LEVEL_ORDER = ["easy", "medium", "hard", "expert", "master", "extreme", "demonic", "titan", "legend"]

# --- SudokuGenerator -------------------------------------------------------
MAX_ATTEMPTS = 200

def completed_grid(rng):
    board = [0] * CELL_COUNT
    def fill(i):
        if i == CELL_COUNT: return True
        if board[i] != 0: return fill(i + 1)
        opts = list(range(1, 10))
        rng.shuffle(opts)
        for v in opts:
            if is_safe(board, i, v):
                board[i] = v
                if fill(i + 1): return True
                board[i] = 0
        board[i] = 0
        return False
    fill(0)
    return board

def accepts(board, strategy):
    kind, tier = strategy
    if kind == "logic": return logical_solve(board, tier)[0]
    return has_unique_solution(board)

def dig(solution, difficulty, rng):
    conf = DIFFICULTIES[difficulty]
    puzzle = solution[:]
    clues = CELL_COUNT
    order = list(range(CELL_COUNT))
    rng.shuffle(order)
    for index in order:
        if clues <= conf["clue_floor"]: break
        if puzzle[index] == 0: continue
        mirror = CELL_COUNT - 1 - index
        removed = [index, mirror] if (conf["sym"] and index != mirror) else [index]
        if clues - len(removed) < conf["clue_floor"]: continue
        saved = [puzzle[c] for c in removed]
        for c in removed: puzzle[c] = 0
        if accepts(puzzle, conf["strategy"]):
            clues -= len(removed)
        else:
            for off, c in enumerate(removed): puzzle[c] = saved[off]
    return puzzle

def generate(difficulty, rng, budget=None):
    import time
    conf = DIFFICULTIES[difficulty]
    started = time.time()
    limit = conf["budget"] if budget is None else budget
    best, best_gap, attempts = None, float("inf"), 0
    while attempts < MAX_ATTEMPTS:
        attempts += 1
        if attempts > 2 and time.time() - started > limit: break
        solution = completed_grid(rng)
        givens = dig(solution, difficulty, rng)
        r = rate(givens)
        if r is None: continue
        score, tier = r
        puzzle = dict(givens=givens, solution=solution, difficulty=difficulty,
                      score=score, tier=tier, attempts=attempts)
        if conf["accepted"][0] <= score <= conf["accepted"][1] and tier >= conf["tier"]:
            return puzzle
        gap = abs(score - conf["target"]) + (400 if tier < conf["tier"] else 0)
        if gap < best_gap:
            best_gap, best = gap, puzzle
    if best: return best
    solution = completed_grid(rng)
    return dict(givens=dig(solution, "easy", rng), solution=solution,
                difficulty=difficulty, score=0, tier=1, attempts=attempts, fallback=True)

# --- GameState -------------------------------------------------------------
class Move:
    def __init__(self, index, pv, nv, pn, nn, cleared_i, cleared_n):
        self.index, self.previous_value, self.new_value = index, pv, nv
        self.previous_notes, self.new_notes = pn, nn
        self.cleared_indices, self.cleared_notes = cleared_i, cleared_n

class GameState:
    def __init__(self, puzzle):
        self.puzzle = puzzle
        self.values = list(puzzle["givens"])
        self.notes = [0] * CELL_COUNT
        self.history = []
        self.selected_index = None
        self.is_note_mode = False
        self.is_paused = False
        self.mistakes = 0
        self.hints_used = 0
        self.elapsed = 0
        self.is_complete = False
        self.hint_message = None
        self.highlighted_by_hint = []
        self.auto_remove_notes = True

    def is_given(self, i): return self.puzzle["givens"][i] != 0
    def is_wrong(self, i):
        v = self.values[i]
        return v != 0 and not self.is_given(i) and v != self.puzzle["solution"][i]
    def remaining(self, d): return max(0, 9 - self.values.count(d))
    def conflicting(self):
        res = set()
        for i in range(CELL_COUNT):
            if self.values[i] == 0: continue
            for p in PEERS[i]:
                if self.values[p] == self.values[i]:
                    res.add(i); res.add(p)
        return res

    def select(self, i):
        if self.is_paused or self.is_complete: return
        self.selected_index = None if self.selected_index == i else i
        self.clear_hint()

    def clear_hint(self):
        self.hint_message = None
        self.highlighted_by_hint = []

    def record(self, move):
        self.history.append(move)
        if len(self.history) > 400: self.history = self.history[len(self.history) - 400:]

    def input(self, digit):
        if self.is_paused or self.is_complete or self.selected_index is None: return
        i = self.selected_index
        if self.is_given(i): return
        self.clear_hint()
        if self.is_note_mode:
            if self.values[i] != 0: return
            updated = toggle(self.notes[i], digit)
            self.record(Move(i, self.values[i], self.values[i], self.notes[i], updated, [], []))
            self.notes[i] = updated
        else:
            if self.values[i] == digit: return
            self.place(digit, i)

    def place(self, digit, i):
        cleared_i, cleared_n = [], []
        if self.auto_remove_notes:
            for p in PEERS[i]:
                if has(self.notes[p], digit):
                    cleared_i.append(p); cleared_n.append(self.notes[p])
        self.record(Move(i, self.values[i], digit, self.notes[i], 0, cleared_i, cleared_n))
        self.values[i] = digit
        self.notes[i] = 0
        for p in cleared_i: self.notes[p] = remove(self.notes[p], digit)
        if digit != self.puzzle["solution"][i]: self.mistakes += 1
        self.check_completion()

    def erase(self):
        if self.is_paused or self.is_complete or self.selected_index is None: return
        i = self.selected_index
        if self.is_given(i): return
        if self.values[i] == 0 and self.notes[i] == 0: return
        self.clear_hint()
        self.record(Move(i, self.values[i], 0, self.notes[i], 0, [], []))
        self.values[i] = 0
        self.notes[i] = 0

    def undo(self):
        if self.is_paused or self.is_complete or not self.history: return
        m = self.history.pop()
        self.clear_hint()
        self.values[m.index] = m.previous_value
        self.notes[m.index] = m.previous_notes
        for off, p in enumerate(m.cleared_indices): self.notes[p] = m.cleared_notes[off]
        self.selected_index = m.index

    def check_completion(self):
        if self.values != self.puzzle["solution"]: return
        self.is_complete = True
        self.selected_index = None

    def fill_all_notes(self):
        if self.is_paused or self.is_complete: return
        self.clear_hint()
        cs = candidates(self.values)
        changed, prev = [], []
        for i in range(CELL_COUNT):
            if self.values[i] == 0 and self.notes[i] != cs[i]:
                changed.append(i); prev.append(self.notes[i])
        if not changed: return
        self.record(Move(changed[0], self.values[changed[0]], self.values[changed[0]],
                         self.notes[changed[0]], cs[changed[0]], changed, prev))
        for i in changed: self.notes[i] = cs[i]

    def apply_note_eliminations(self, eliminations):
        updated = {}
        for indices, mask, restricts in eliminations:
            for t in indices:
                if self.notes[t] == 0: continue
                cur = updated.get(t, self.notes[t])
                nxt = (cur & mask) if restricts else (cur & ~mask)
                if nxt != cur: updated[t] = nxt
        if not updated: return
        idx = sorted(updated)
        prev = [self.notes[i] for i in idx]
        self.record(Move(idx[0], self.values[idx[0]], self.values[idx[0]],
                         self.notes[idx[0]], updated[idx[0]], idx, prev))
        for i in idx: self.notes[i] = updated[i]

    def use_hint(self):
        """Enchaîne en interne les éliminations nécessaires : un indice aboutit
        toujours à un chiffre posé (miroir de GameState.useHint en Swift)."""
        if self.is_paused or self.is_complete: return
        for i in range(CELL_COUNT):
            if self.is_wrong(i):
                self.hints_used += 1
                self.selected_index = i
                self.highlighted_by_hint = [i]
                self.hint_message = "erreur"
                return
        work = list(self.values)
        cs = candidates(work)
        pending, unlocked_by = [], None
        for _ in range(80):
            s = next_step(work, cs, 6)
            if s is None: break
            if s.is_placement:
                self.hints_used += 1
                self.apply_note_eliminations(pending)
                self.selected_index = s.placement_index
                self.highlighted_by_hint = [s.placement_index]
                self.hint_message = (unlocked_by + " ensuite " + s.title) if unlocked_by else s.title
                self.place(s.placement_value, s.placement_index)
                return
            if unlocked_by is None: unlocked_by = s.title
            pending.append((list(s.targets), make_mask(s.digits), s.restricts))
            apply_step(s, work, cs)
        for i in range(CELL_COUNT):
            if self.values[i] == 0:
                self.hints_used += 1
                self.selected_index = i
                self.highlighted_by_hint = [i]
                self.hint_message = "révélée"
                self.place(self.puzzle["solution"][i], i)
                return

import Foundation
import Observation

/// Un coup joué, mémorisé pour permettre l'annulation.
struct Move: Codable, Equatable {
    var index: Int
    var previousValue: Int
    var newValue: Int
    var previousNotes: UInt16
    var newNotes: UInt16
    /// Notes des cases voisines effacées automatiquement.
    var clearedIndices: [Int]
    var clearedNotes: [UInt16]
}

/// Sauvegarde complète d'une partie en cours.
struct SavedGame: Codable, Equatable {
    var puzzle: Puzzle
    var values: [Int]
    var notes: [UInt16]
    var elapsed: TimeInterval
    var mistakes: Int
    var hintsUsed: Int
    var savedAt: Date
}

@Observable
final class GameState: Identifiable {

    let id = UUID()
    private(set) var puzzle: Puzzle
    private(set) var values: [Int]
    private(set) var notes: [UInt16]
    private(set) var history: [Move] = []

    var selectedIndex: Int?
    var isNoteMode: Bool = false
    var isPaused: Bool = false

    private(set) var mistakes: Int = 0
    private(set) var hintsUsed: Int = 0
    private(set) var elapsed: TimeInterval = 0
    private(set) var isComplete: Bool = false
    private(set) var hintMessage: String?
    private(set) var highlightedByHint: [Int] = []
    private(set) var lastFilledIndex: Int?
    /// Incrémenté à chaque modification de la grille : sert de déclencheur
    /// pour la sauvegarde automatique.
    private(set) var revision: Int = 0

    @ObservationIgnored private var timer: Timer?
    @ObservationIgnored var autoRemoveNotes: Bool = true

    // MARK: - Cycle de vie

    init(puzzle: Puzzle) {
        self.puzzle = puzzle
        self.values = puzzle.givens
        self.notes = [UInt16](repeating: 0, count: Sudoku.cellCount)
    }

    init(saved: SavedGame) {
        self.puzzle = saved.puzzle
        self.values = saved.values
        self.notes = saved.notes
        self.elapsed = saved.elapsed
        self.mistakes = saved.mistakes
        self.hintsUsed = saved.hintsUsed
        self.isComplete = saved.values == saved.puzzle.solution
    }

    deinit {
        timer?.invalidate()
    }

    var difficulty: Difficulty { puzzle.difficulty }

    var snapshot: SavedGame {
        SavedGame(puzzle: puzzle,
                  values: values,
                  notes: notes,
                  elapsed: elapsed,
                  mistakes: mistakes,
                  hintsUsed: hintsUsed,
                  savedAt: Date())
    }

    // MARK: - Chronomètre

    func startClock() {
        guard !isComplete else { return }
        timer?.invalidate()
        let newTimer = Timer(timeInterval: 1, repeats: true) { [weak self] _ in
            self?.tick()
        }
        RunLoop.main.add(newTimer, forMode: .common)
        timer = newTimer
    }

    func stopClock() {
        timer?.invalidate()
        timer = nil
    }

    private func tick() {
        guard !isPaused, !isComplete else { return }
        elapsed += 1
    }

    func togglePause() {
        guard !isComplete else { return }
        isPaused.toggle()
        clearHint()
    }

    // MARK: - Informations dérivées

    var filledCount: Int { values.filter { $0 != 0 }.count }

    var progress: Double { Double(filledCount) / Double(Sudoku.cellCount) }

    var isPerfect: Bool { mistakes == 0 && hintsUsed == 0 }

    func isGiven(_ index: Int) -> Bool { puzzle.isGiven(index) }

    func remaining(for digit: Int) -> Int {
        let placed = values.filter { $0 == digit }.count
        return max(0, 9 - placed)
    }

    func isWrong(_ index: Int) -> Bool {
        let value = values[index]
        return value != 0 && !isGiven(index) && value != puzzle.solution[index]
    }

    /// Cases entrant en conflit direct avec une autre case de même valeur.
    var conflictingIndices: Set<Int> {
        var result = Set<Int>()
        for index in 0..<Sudoku.cellCount where values[index] != 0 {
            for peer in Sudoku.peers[index] where values[peer] == values[index] {
                result.insert(index)
                result.insert(peer)
            }
        }
        return result
    }

    // MARK: - Interactions

    func select(_ index: Int) {
        guard !isPaused, !isComplete else { return }
        selectedIndex = (selectedIndex == index) ? nil : index
        clearHint()
    }

    func input(_ digit: Int) {
        guard !isPaused, !isComplete, let index = selectedIndex, !isGiven(index) else { return }
        clearHint()
        if isNoteMode {
            guard values[index] == 0 else { return }
            let updated = DigitMask.toggling(notes[index], digit)
            record(Move(index: index,
                        previousValue: values[index],
                        newValue: values[index],
                        previousNotes: notes[index],
                        newNotes: updated,
                        clearedIndices: [],
                        clearedNotes: []))
            notes[index] = updated
        } else {
            guard values[index] != digit else { return }
            place(digit, at: index)
        }
    }

    private func place(_ digit: Int, at index: Int) {
        var clearedIndices: [Int] = []
        var clearedNotes: [UInt16] = []
        if autoRemoveNotes {
            for peer in Sudoku.peers[index] where DigitMask.contains(notes[peer], digit) {
                clearedIndices.append(peer)
                clearedNotes.append(notes[peer])
            }
        }
        record(Move(index: index,
                    previousValue: values[index],
                    newValue: digit,
                    previousNotes: notes[index],
                    newNotes: 0,
                    clearedIndices: clearedIndices,
                    clearedNotes: clearedNotes))

        values[index] = digit
        notes[index] = 0
        for peer in clearedIndices {
            notes[peer] = DigitMask.removing(notes[peer], digit)
        }
        lastFilledIndex = index
        if digit != puzzle.solution[index] {
            mistakes += 1
        }
        checkCompletion()
    }

    func erase() {
        guard !isPaused, !isComplete, let index = selectedIndex, !isGiven(index) else { return }
        guard values[index] != 0 || notes[index] != 0 else { return }
        clearHint()
        record(Move(index: index,
                    previousValue: values[index],
                    newValue: 0,
                    previousNotes: notes[index],
                    newNotes: 0,
                    clearedIndices: [],
                    clearedNotes: []))
        values[index] = 0
        notes[index] = 0
    }

    func undo() {
        guard !isPaused, !isComplete, let move = history.popLast() else { return }
        clearHint()
        values[move.index] = move.previousValue
        notes[move.index] = move.previousNotes
        for (offset, peer) in move.clearedIndices.enumerated() {
            notes[peer] = move.clearedNotes[offset]
        }
        revision += 1
        selectedIndex = move.index
    }

    private func record(_ move: Move) {
        history.append(move)
        if history.count > 400 { history.removeFirst(history.count - 400) }
        revision += 1
    }

    private func checkCompletion() {
        guard values == puzzle.solution else { return }
        isComplete = true
        selectedIndex = nil
        stopClock()
    }

    /// Recommence la même grille depuis le début.
    func restart() {
        values = puzzle.givens
        notes = [UInt16](repeating: 0, count: Sudoku.cellCount)
        history = []
        mistakes = 0
        hintsUsed = 0
        elapsed = 0
        isComplete = false
        isPaused = false
        selectedIndex = nil
        lastFilledIndex = nil
        revision += 1
        clearHint()
        startClock()
    }

    // MARK: - Indices

    func clearHint() {
        hintMessage = nil
        highlightedByHint = []
    }

    /// Une élimination de candidats à répercuter sur les notes du joueur.
    private struct NoteElimination {
        var indices: [Int]
        var mask: UInt16
        var restrictsToDigits: Bool
    }

    /// Répercute les éliminations sur les notes du joueur, en un seul coup annulable.
    private func applyNoteEliminations(_ eliminations: [NoteElimination]) {
        var updated: [Int: UInt16] = [:]
        for elimination in eliminations {
            for target in elimination.indices where notes[target] != 0 {
                let current = updated[target] ?? notes[target]
                let next = elimination.restrictsToDigits
                    ? (current & elimination.mask)
                    : (current & ~elimination.mask)
                if next != current { updated[target] = next }
            }
        }
        guard !updated.isEmpty else { return }
        let indices = updated.keys.sorted()
        let previous = indices.map { notes[$0] }
        record(Move(index: indices[0],
                    previousValue: values[indices[0]],
                    newValue: values[indices[0]],
                    previousNotes: notes[indices[0]],
                    newNotes: updated[indices[0]] ?? notes[indices[0]],
                    clearedIndices: indices,
                    clearedNotes: previous))
        for index in indices {
            if let value = updated[index] { notes[index] = value }
        }
    }

    /// Donne un coup de pouce : correction d'une erreur, ou placement logique
    /// expliqué. Les techniques d'élimination nécessaires sont enchaînées en
    /// interne, de sorte qu'un indice aboutit toujours à un chiffre posé.
    func useHint() {
        guard !isPaused, !isComplete else { return }

        if let wrong = (0..<Sudoku.cellCount).first(where: { isWrong($0) }) {
            hintsUsed += 1
            selectedIndex = wrong
            highlightedByHint = [wrong]
            hintMessage = "Cette case ne correspond pas à la solution : efface-la pour repartir du bon pied."
            return
        }

        var work = values
        var cands = SudokuSolver.candidates(for: work)
        var pending: [NoteElimination] = []
        var unlockedBy: String?

        for _ in 0..<80 {
            guard let step = SudokuSolver.nextStep(board: work, candidates: cands, maximumTier: 5) else { break }
            if let index = step.placementIndex, let value = step.placementValue {
                hintsUsed += 1
                applyNoteEliminations(pending)
                selectedIndex = index
                highlightedByHint = [index]
                if let intro = unlockedBy {
                    hintMessage = "\(intro) Ensuite, \(step.detail)"
                } else {
                    hintMessage = "\(step.title) — \(step.detail)"
                }
                place(value, at: index)
                return
            }
            if unlockedBy == nil {
                unlockedBy = "\(step.title) — \(step.detail)"
            }
            pending.append(NoteElimination(indices: step.targets,
                                           mask: DigitMask.make(step.digits),
                                           restrictsToDigits: step.restrictsToDigits))
            SudokuSolver.apply(step, board: &work, cands: &cands)
        }

        // Repli : révèle une case (ne devrait jamais servir sur nos grilles).
        if let empty = (0..<Sudoku.cellCount).first(where: { values[$0] == 0 }) {
            hintsUsed += 1
            selectedIndex = empty
            highlightedByHint = [empty]
            hintMessage = "Case révélée."
            place(puzzle.solution[empty], at: empty)
        }
    }

    /// Remplit toutes les notes possibles (outil de confort).
    func fillAllNotes() {
        guard !isPaused, !isComplete else { return }
        clearHint()
        let cands = SudokuSolver.candidates(for: values)
        var changedIndices: [Int] = []
        var previousNotes: [UInt16] = []
        for index in 0..<Sudoku.cellCount where values[index] == 0 && notes[index] != cands[index] {
            changedIndices.append(index)
            previousNotes.append(notes[index])
        }
        guard !changedIndices.isEmpty else { return }
        record(Move(index: changedIndices[0],
                    previousValue: values[changedIndices[0]],
                    newValue: values[changedIndices[0]],
                    previousNotes: notes[changedIndices[0]],
                    newNotes: cands[changedIndices[0]],
                    clearedIndices: changedIndices,
                    clearedNotes: previousNotes))
        for index in changedIndices {
            notes[index] = cands[index]
        }
    }
}

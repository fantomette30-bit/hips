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
        selectedIndex = move.index
    }

    private func record(_ move: Move) {
        history.append(move)
        if history.count > 400 { history.removeFirst(history.count - 400) }
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
        clearHint()
        startClock()
    }

    // MARK: - Indices

    func clearHint() {
        hintMessage = nil
        highlightedByHint = []
    }

    /// Donne un coup de pouce : correction d'une erreur, placement logique ou
    /// nettoyage de notes, avec l'explication de la technique employée.
    func useHint() {
        guard !isPaused, !isComplete else { return }

        if let wrong = (0..<Sudoku.cellCount).first(where: { isWrong($0) }) {
            hintsUsed += 1
            selectedIndex = wrong
            highlightedByHint = [wrong]
            hintMessage = "Cette case ne correspond pas à la solution : efface-la pour repartir du bon pied."
            return
        }

        if let step = SudokuSolver.nextStep(board: values, maximumTier: 4) {
            hintsUsed += 1
            if let index = step.placementIndex, let value = step.placementValue {
                selectedIndex = index
                highlightedByHint = [index]
                hintMessage = "\(step.title) — \(step.detail)"
                place(value, at: index)
            } else {
                let mask = DigitMask.make(step.digits)
                var touched: [Int] = []
                for target in step.targets where notes[target] != 0 {
                    let updated = step.restrictsToDigits ? (notes[target] & mask) : (notes[target] & ~mask)
                    if updated != notes[target] {
                        notes[target] = updated
                        touched.append(target)
                    }
                }
                highlightedByHint = step.targets
                selectedIndex = step.targets.first
                hintMessage = "\(step.title) — \(step.detail)"
                if !touched.isEmpty {
                    hintMessage = "\(step.title) — \(step.detail) Tes notes ont été mises à jour."
                }
            }
            return
        }

        // Repli : révèle une case vide.
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

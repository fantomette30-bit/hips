import Foundation

/// Génère des grilles entièrement sur l'appareil, sans aucun accès réseau.
enum SudokuGenerator {

    private static let maximumAttempts = 24

    // MARK: - Grille complète

    static func completedGrid(using generator: inout SystemRandomNumberGenerator) -> [Int] {
        var board = [Int](repeating: 0, count: Sudoku.cellCount)
        _ = fill(&board, from: 0, using: &generator)
        return board
    }

    private static func fill(_ board: inout [Int], from index: Int, using generator: inout SystemRandomNumberGenerator) -> Bool {
        if index == Sudoku.cellCount { return true }
        if board[index] != 0 { return fill(&board, from: index + 1, using: &generator) }
        var options = Array(1...9)
        options.shuffle(using: &generator)
        for value in options where Sudoku.isSafe(board, index: index, value: value) {
            board[index] = value
            if fill(&board, from: index + 1, using: &generator) { return true }
            board[index] = 0
        }
        board[index] = 0
        return false
    }

    // MARK: - Génération d'une grille jouable

    /// Crée une grille pour le niveau demandé.
    ///
    /// Le principe : on creuse une grille complète par paires symétriques, puis
    /// on note la difficulté réelle du résultat (`DifficultyRater`). Tant que le
    /// score ne tombe pas dans la fourchette du niveau, on recommence, en
    /// gardant la meilleure grille rencontrée. Toutes les grilles renvoyées ont
    /// une solution unique et sont résolubles sans deviner.
    static func generate(difficulty: Difficulty) -> Puzzle {
        var generator = SystemRandomNumberGenerator()
        var best: Puzzle?
        var bestGap = Double.greatestFiniteMagnitude

        for _ in 0..<maximumAttempts {
            let solution = completedGrid(using: &generator)
            let givens = dig(solution: solution, difficulty: difficulty, using: &generator)
            guard let score = DifficultyRater.score(board: givens) else { continue }
            let puzzle = Puzzle(givens: givens, solution: solution, difficulty: difficulty)
            if difficulty.acceptedScore.contains(score) { return puzzle }
            let gap = abs(score - difficulty.targetScore)
            if gap < bestGap {
                bestGap = gap
                best = puzzle
            }
        }

        if let best { return best }

        // Repli : une grille douce, toujours résoluble sans deviner.
        let solution = completedGrid(using: &generator)
        let givens = dig(solution: solution, difficulty: .easy, using: &generator)
        return Puzzle(givens: givens, solution: solution, difficulty: difficulty)
    }

    private static func dig(solution: [Int], difficulty: Difficulty, using generator: inout SystemRandomNumberGenerator) -> [Int] {
        var puzzle = solution
        var clues = Sudoku.cellCount
        var order = Array(0..<Sudoku.cellCount)
        order.shuffle(using: &generator)

        for index in order {
            if clues <= difficulty.clueFloor { break }
            if puzzle[index] == 0 { continue }
            let mirror = Sudoku.cellCount - 1 - index
            let removed = index == mirror ? [index] : [index, mirror]
            if clues - removed.count < difficulty.clueFloor { continue }

            let saved = removed.map { puzzle[$0] }
            for cell in removed { puzzle[cell] = 0 }

            if accepts(puzzle, strategy: difficulty.digStrategy) {
                clues -= removed.count
            } else {
                for (offset, cell) in removed.enumerated() { puzzle[cell] = saved[offset] }
            }
        }
        return puzzle
    }

    private static func accepts(_ board: [Int], strategy: DigStrategy) -> Bool {
        switch strategy {
        case .logic(let maximumTier):
            return SudokuSolver.logicalSolve(board: board, maximumTier: maximumTier).solved
        case .unique:
            return SudokuSolver.hasUniqueSolution(board: board)
        }
    }

    // MARK: - Génération asynchrone

    /// Génère en arrière-plan pour ne jamais bloquer l'interface.
    static func generateAsync(difficulty: Difficulty, completion: @escaping @MainActor (Puzzle) -> Void) {
        DispatchQueue.global(qos: .userInitiated).async {
            let puzzle = generate(difficulty: difficulty)
            DispatchQueue.main.async {
                MainActor.assumeIsolated { completion(puzzle) }
            }
        }
    }
}

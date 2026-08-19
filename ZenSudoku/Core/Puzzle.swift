import Foundation

/// Une grille générée : les cases de départ et sa solution unique.
struct Puzzle: Codable, Equatable, Sendable {
    var givens: [Int]
    var solution: [Int]
    var difficulty: Difficulty

    var clueCount: Int { givens.filter { $0 != 0 }.count }

    func isGiven(_ index: Int) -> Bool { givens[index] != 0 }

    static func empty(difficulty: Difficulty = .easy) -> Puzzle {
        Puzzle(givens: Array(repeating: 0, count: Sudoku.cellCount),
               solution: Array(repeating: 0, count: Sudoku.cellCount),
               difficulty: difficulty)
    }
}

import Foundation

/// Évalue la difficulté réelle d'une grille en rejouant la résolution comme
/// le ferait un joueur : plus les coups évidents sont rares, plus le score monte.
enum DifficultyRater {

    static let maximumTier = 4

    /// Score de difficulté, ou `nil` si la grille n'est pas résoluble
    /// logiquement (elle exigerait des essais / erreurs).
    static func score(board: [Int]) -> Double? {
        var work = board
        var cands = SudokuSolver.candidates(for: work)
        var total: Double = 0
        var remaining = work.filter { $0 == 0 }.count

        while remaining > 0 {
            guard let step = SudokuSolver.nextStep(board: work, candidates: cands, maximumTier: maximumTier) else {
                return nil
            }
            switch step.kind {
            case .nakedSingle:
                let available = SudokuSolver.nakedSingleCount(board: work, cands: cands)
                if available >= 4 { total += 1 }
                else if available == 3 { total += 2 }
                else if available == 2 { total += 3 }
                else { total += 5 }
            case .hiddenSingle:
                let available = SudokuSolver.hiddenSingleCount(board: work, cands: cands)
                if available >= 4 { total += 9 }
                else if available == 3 { total += 12 }
                else if available == 2 { total += 16 }
                else { total += 22 }
            default:
                total += step.tier == 3 ? 45 : 80
            }
            SudokuSolver.apply(step, board: &work, cands: &cands)
            if step.isPlacement { remaining -= 1 }
        }
        return total
    }
}

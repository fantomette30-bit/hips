import Foundation

/// Une étape de résolution logique (placement ou élimination de candidats).
struct SolveStep: Equatable {
    enum Kind: String, Equatable {
        case nakedSingle
        case hiddenSingle
        case pointing
        case claiming
        case nakedPair
        case hiddenPair
        case nakedTriple
        case xWing
        case hiddenTriple
        case xyWing
        case swordfish
    }

    var kind: Kind
    var tier: Int
    var placementIndex: Int?
    var placementValue: Int?
    /// Cases dont les candidats sont modifiés.
    var targets: [Int]
    /// Chiffres concernés.
    var digits: [Int]
    /// `true` : on limite les candidats aux chiffres, `false` : on les retire.
    var restrictsToDigits: Bool
    var title: String
    var detail: String

    var isPlacement: Bool { placementIndex != nil }
}

struct SolveOutcome: Equatable {
    var solved: Bool
    var hardestTier: Int
}

enum SudokuSolver {

    // MARK: - Candidats

    static func candidates(for board: [Int]) -> [UInt16] {
        var result = [UInt16](repeating: 0, count: Sudoku.cellCount)
        for index in 0..<Sudoku.cellCount where board[index] == 0 {
            var mask = DigitMask.all
            for peer in Sudoku.peers[index] {
                let value = board[peer]
                if value != 0 {
                    mask = DigitMask.removing(mask, value)
                }
            }
            result[index] = mask
        }
        return result
    }

    // MARK: - Recherche de la prochaine étape

    static func nextStep(board: [Int], candidates cands: [UInt16], maximumTier: Int) -> SolveStep? {
        if let step = nakedSingle(board: board, cands: cands) { return step }
        if let step = hiddenSingle(board: board, cands: cands) { return step }
        guard maximumTier >= 3 else { return nil }
        if let step = lockedCandidates(board: board, cands: cands) { return step }
        if let step = nakedPair(board: board, cands: cands) { return step }
        guard maximumTier >= 4 else { return nil }
        if let step = hiddenPair(board: board, cands: cands) { return step }
        if let step = nakedTriple(board: board, cands: cands) { return step }
        if let step = xWing(board: board, cands: cands) { return step }
        if let step = hiddenTriple(board: board, cands: cands) { return step }
        guard maximumTier >= 5 else { return nil }
        if let step = xyWing(board: board, cands: cands) { return step }
        if let step = swordfish(board: board, cands: cands) { return step }
        return nil
    }

    static func nextStep(board: [Int], maximumTier: Int) -> SolveStep? {
        nextStep(board: board, candidates: candidates(for: board), maximumTier: maximumTier)
    }

    // MARK: - Application

    static func apply(_ step: SolveStep, board: inout [Int], cands: inout [UInt16]) {
        if let index = step.placementIndex, let value = step.placementValue {
            board[index] = value
            cands[index] = 0
            for peer in Sudoku.peers[index] {
                cands[peer] = DigitMask.removing(cands[peer], value)
            }
            return
        }
        let mask = DigitMask.make(step.digits)
        for target in step.targets {
            if step.restrictsToDigits {
                cands[target] = cands[target] & mask
            } else {
                cands[target] = cands[target] & ~mask
            }
        }
    }

    // MARK: - Résolution logique

    /// Résout la grille en n'utilisant que des techniques humaines jusqu'au palier donné.
    static func logicalSolve(board: [Int], maximumTier: Int) -> SolveOutcome {
        var work = board
        var cands = candidates(for: work)
        var hardest = 0
        var remaining = work.filter { $0 == 0 }.count
        while remaining > 0 {
            guard let step = nextStep(board: work, candidates: cands, maximumTier: maximumTier) else {
                return SolveOutcome(solved: false, hardestTier: hardest)
            }
            hardest = max(hardest, step.tier)
            apply(step, board: &work, cands: &cands)
            if step.isPlacement { remaining -= 1 }
        }
        return SolveOutcome(solved: true, hardestTier: hardest)
    }

    // MARK: - Résolution par retour sur trace

    /// Compte les solutions, en s'arrêtant dès que `limit` est atteint.
    static func countSolutions(board: [Int], limit: Int = 2) -> Int {
        var work = board
        return count(&work, limit: limit)
    }

    private static func count(_ board: inout [Int], limit: Int) -> Int {
        var bestIndex = -1
        var bestOptions: [Int] = []
        for index in 0..<Sudoku.cellCount where board[index] == 0 {
            var mask = DigitMask.all
            for peer in Sudoku.peers[index] {
                let value = board[peer]
                if value != 0 { mask = DigitMask.removing(mask, value) }
            }
            let options = DigitMask.digits(mask)
            if options.isEmpty { return 0 }
            if bestIndex < 0 || options.count < bestOptions.count {
                bestIndex = index
                bestOptions = options
                if options.count == 1 { break }
            }
        }
        if bestIndex < 0 { return 1 }
        var total = 0
        for value in bestOptions {
            board[bestIndex] = value
            total += count(&board, limit: limit)
            board[bestIndex] = 0
            if total >= limit { break }
        }
        return total
    }

    static func hasUniqueSolution(board: [Int]) -> Bool {
        countSolutions(board: board, limit: 2) == 1
    }

    // MARK: - Mesure de la facilité d'un état

    /// Nombre de cases immédiatement remplissables (un seul candidat).
    static func nakedSingleCount(board: [Int], cands: [UInt16]) -> Int {
        var count = 0
        for index in 0..<Sudoku.cellCount where board[index] == 0 && DigitMask.count(cands[index]) == 1 {
            count += 1
        }
        return count
    }

    /// Nombre de candidats cachés disponibles dans l'ensemble de la grille.
    static func hiddenSingleCount(board: [Int], cands: [UInt16]) -> Int {
        var found = Set<Int>()
        for unit in Sudoku.units {
            for digit in 1...9 {
                var alreadyPlaced = false
                var spots: [Int] = []
                for index in unit {
                    if board[index] == digit { alreadyPlaced = true; break }
                    if board[index] == 0 && DigitMask.contains(cands[index], digit) { spots.append(index) }
                }
                if !alreadyPlaced && spots.count == 1 {
                    found.insert(spots[0] * 10 + digit)
                }
            }
        }
        return found.count
    }

    // MARK: - Techniques

    private static func nakedSingle(board: [Int], cands: [UInt16]) -> SolveStep? {
        for index in 0..<Sudoku.cellCount where board[index] == 0 {
            if DigitMask.count(cands[index]) == 1 {
                let value = DigitMask.firstDigit(cands[index])
                return SolveStep(kind: .nakedSingle,
                                 tier: 1,
                                 placementIndex: index,
                                 placementValue: value,
                                 targets: [index],
                                 digits: [value],
                                 restrictsToDigits: false,
                                 title: "Candidat unique",
                                 detail: "En ligne \(Sudoku.row(of: index) + 1), colonne \(Sudoku.column(of: index) + 1), un seul chiffre reste possible : le \(value).")
            }
        }
        return nil
    }

    private static func hiddenSingle(board: [Int], cands: [UInt16]) -> SolveStep? {
        for (unitIndex, unit) in Sudoku.units.enumerated() {
            for digit in 1...9 {
                var alreadyPlaced = false
                var spots: [Int] = []
                for index in unit {
                    if board[index] == digit { alreadyPlaced = true; break }
                    if board[index] == 0 && DigitMask.contains(cands[index], digit) {
                        spots.append(index)
                    }
                }
                if alreadyPlaced || spots.count != 1 { continue }
                let index = spots[0]
                return SolveStep(kind: .hiddenSingle,
                                 tier: 2,
                                 placementIndex: index,
                                 placementValue: digit,
                                 targets: [index],
                                 digits: [digit],
                                 restrictsToDigits: false,
                                 title: "Candidat caché",
                                 detail: "Dans \(Sudoku.unitName(forUnitIndex: unitIndex)), le \(digit) ne peut aller que dans cette case.")
            }
        }
        return nil
    }

    private static func lockedCandidates(board: [Int], cands: [UInt16]) -> SolveStep? {
        // Pointing : dans un bloc, un chiffre n'apparaît que sur une ligne / colonne.
        for (boxIndex, box) in Sudoku.boxes.enumerated() {
            for digit in 1...9 {
                let spots = box.filter { board[$0] == 0 && DigitMask.contains(cands[$0], digit) }
                guard spots.count >= 2 else { continue }
                let rows = Set(spots.map { Sudoku.row(of: $0) })
                let columns = Set(spots.map { Sudoku.column(of: $0) })
                if rows.count == 1, let row = rows.first {
                    let elim = Sudoku.rows[row].filter { !box.contains($0) && board[$0] == 0 && DigitMask.contains(cands[$0], digit) }
                    if !elim.isEmpty {
                        return SolveStep(kind: .pointing,
                                         tier: 3,
                                         placementIndex: nil,
                                         placementValue: nil,
                                         targets: elim,
                                         digits: [digit],
                                         restrictsToDigits: false,
                                         title: "Paire pointante",
                                         detail: "Dans le bloc \(boxIndex + 1), le \(digit) est confiné à la ligne \(row + 1) : on peut l'éliminer du reste de la ligne.")
                    }
                }
                if columns.count == 1, let column = columns.first {
                    let elim = Sudoku.columns[column].filter { !box.contains($0) && board[$0] == 0 && DigitMask.contains(cands[$0], digit) }
                    if !elim.isEmpty {
                        return SolveStep(kind: .pointing,
                                         tier: 3,
                                         placementIndex: nil,
                                         placementValue: nil,
                                         targets: elim,
                                         digits: [digit],
                                         restrictsToDigits: false,
                                         title: "Paire pointante",
                                         detail: "Dans le bloc \(boxIndex + 1), le \(digit) est confiné à la colonne \(column + 1) : on peut l'éliminer du reste de la colonne.")
                    }
                }
            }
        }
        // Claiming : sur une ligne / colonne, un chiffre est confiné à un bloc.
        let lines = Sudoku.rows + Sudoku.columns
        for (lineIndex, line) in lines.enumerated() {
            for digit in 1...9 {
                let spots = line.filter { board[$0] == 0 && DigitMask.contains(cands[$0], digit) }
                guard spots.count >= 2 else { continue }
                let boxIndices = Set(spots.map { Sudoku.box(of: $0) })
                guard boxIndices.count == 1, let boxIndex = boxIndices.first else { continue }
                let box = Sudoku.boxes[boxIndex]
                let elim = box.filter { !line.contains($0) && board[$0] == 0 && DigitMask.contains(cands[$0], digit) }
                if !elim.isEmpty {
                    let name = lineIndex < 9 ? "la ligne \(lineIndex + 1)" : "la colonne \(lineIndex - 8)"
                    return SolveStep(kind: .claiming,
                                     tier: 3,
                                     placementIndex: nil,
                                     placementValue: nil,
                                     targets: elim,
                                     digits: [digit],
                                     restrictsToDigits: false,
                                     title: "Chiffre revendiqué",
                                     detail: "Sur \(name), le \(digit) ne peut être que dans le bloc \(boxIndex + 1) : on l'élimine du reste du bloc.")
                }
            }
        }
        return nil
    }

    private static func nakedPair(board: [Int], cands: [UInt16]) -> SolveStep? {
        for (unitIndex, unit) in Sudoku.units.enumerated() {
            let empties = unit.filter { board[$0] == 0 }
            guard empties.count >= 3 else { continue }
            for a in 0..<empties.count {
                let first = empties[a]
                guard DigitMask.count(cands[first]) == 2 else { continue }
                for b in (a + 1)..<empties.count {
                    let second = empties[b]
                    guard cands[second] == cands[first] else { continue }
                    let mask = cands[first]
                    let elim = empties.filter { $0 != first && $0 != second && (cands[$0] & mask) != 0 }
                    if !elim.isEmpty {
                        let digits = DigitMask.digits(mask)
                        return SolveStep(kind: .nakedPair,
                                         tier: 3,
                                         placementIndex: nil,
                                         placementValue: nil,
                                         targets: elim,
                                         digits: digits,
                                         restrictsToDigits: false,
                                         title: "Paire nue",
                                         detail: "Dans \(Sudoku.unitName(forUnitIndex: unitIndex)), deux cases se partagent \(digits[0]) et \(digits[1]) : ces chiffres disparaissent des autres cases.")
                    }
                }
            }
        }
        return nil
    }

    private static func hiddenPair(board: [Int], cands: [UInt16]) -> SolveStep? {
        for (unitIndex, unit) in Sudoku.units.enumerated() {
            let empties = unit.filter { board[$0] == 0 }
            guard empties.count >= 3 else { continue }
            for first in 1...8 {
                let spotsA = empties.filter { DigitMask.contains(cands[$0], first) }
                guard spotsA.count == 2 else { continue }
                for second in (first + 1)...9 {
                    let spotsB = empties.filter { DigitMask.contains(cands[$0], second) }
                    guard spotsB.count == 2, Set(spotsA) == Set(spotsB) else { continue }
                    let mask = DigitMask.make([first, second])
                    let needsPruning = spotsA.contains { (cands[$0] & ~mask) != 0 }
                    if needsPruning {
                        return SolveStep(kind: .hiddenPair,
                                         tier: 4,
                                         placementIndex: nil,
                                         placementValue: nil,
                                         targets: spotsA,
                                         digits: [first, second],
                                         restrictsToDigits: true,
                                         title: "Paire cachée",
                                         detail: "Dans \(Sudoku.unitName(forUnitIndex: unitIndex)), \(first) et \(second) n'ont que deux cases possibles : ces cases ne contiennent qu'eux.")
                    }
                }
            }
        }
        return nil
    }

    private static func nakedTriple(board: [Int], cands: [UInt16]) -> SolveStep? {
        for (unitIndex, unit) in Sudoku.units.enumerated() {
            let empties = unit.filter { board[$0] == 0 && DigitMask.count(cands[$0]) <= 3 && DigitMask.count(cands[$0]) >= 2 }
            guard empties.count >= 3 else { continue }
            for a in 0..<(empties.count - 2) {
                for b in (a + 1)..<(empties.count - 1) {
                    for c in (b + 1)..<empties.count {
                        let trio = [empties[a], empties[b], empties[c]]
                        let mask = cands[trio[0]] | cands[trio[1]] | cands[trio[2]]
                        guard DigitMask.count(mask) == 3 else { continue }
                        let elim = unit.filter { board[$0] == 0 && !trio.contains($0) && (cands[$0] & mask) != 0 }
                        if !elim.isEmpty {
                            let digits = DigitMask.digits(mask)
                            return SolveStep(kind: .nakedTriple,
                                             tier: 4,
                                             placementIndex: nil,
                                             placementValue: nil,
                                             targets: elim,
                                             digits: digits,
                                             restrictsToDigits: false,
                                             title: "Triplet nu",
                                             detail: "Dans \(Sudoku.unitName(forUnitIndex: unitIndex)), trois cases se partagent \(digits[0]), \(digits[1]) et \(digits[2]).")
                        }
                    }
                }
            }
        }
        return nil
    }

    private static func xWing(board: [Int], cands: [UInt16]) -> SolveStep? {
        for digit in 1...9 {
            for orientation in 0..<2 {
                let lines = orientation == 0 ? Sudoku.rows : Sudoku.columns
                let crossLines = orientation == 0 ? Sudoku.columns : Sudoku.rows
                var pairs: [Int: [Int]] = [:]
                for (lineIndex, line) in lines.enumerated() {
                    let spots = line.filter { board[$0] == 0 && DigitMask.contains(cands[$0], digit) }
                    if spots.count == 2 { pairs[lineIndex] = spots }
                }
                let keys = pairs.keys.sorted()
                guard keys.count >= 2 else { continue }
                for a in 0..<(keys.count - 1) {
                    guard let first = pairs[keys[a]] else { continue }
                    let firstCross = first.map { orientation == 0 ? Sudoku.column(of: $0) : Sudoku.row(of: $0) }.sorted()
                    for b in (a + 1)..<keys.count {
                        guard let second = pairs[keys[b]] else { continue }
                        let secondCross = second.map { orientation == 0 ? Sudoku.column(of: $0) : Sudoku.row(of: $0) }.sorted()
                        guard firstCross == secondCross else { continue }
                        let corners = first + second
                        var elim: [Int] = []
                        for cross in firstCross {
                            for index in crossLines[cross] where board[index] == 0 && !corners.contains(index) {
                                if DigitMask.contains(cands[index], digit) { elim.append(index) }
                            }
                        }
                        if !elim.isEmpty {
                            return SolveStep(kind: .xWing,
                                             tier: 4,
                                             placementIndex: nil,
                                             placementValue: nil,
                                             targets: elim,
                                             digits: [digit],
                                             restrictsToDigits: false,
                                             title: "X-Wing",
                                             detail: "Le \(digit) forme un rectangle : il disparaît des autres cases des deux \(orientation == 0 ? "colonnes" : "lignes") concernées.")
                        }
                    }
                }
            }
        }
        return nil
    }

    /// Triplet caché : trois chiffres confinés à trois cases d'une unité.
    private static func hiddenTriple(board: [Int], cands: [UInt16]) -> SolveStep? {
        for (unitIndex, unit) in Sudoku.units.enumerated() {
            let empties = unit.filter { board[$0] == 0 }
            guard empties.count >= 4 else { continue }
            var spots: [Int: [Int]] = [:]
            for digit in 1...9 {
                let places = empties.filter { DigitMask.contains(cands[$0], digit) }
                if places.count >= 2 && places.count <= 3 { spots[digit] = places }
            }
            let digits = spots.keys.sorted()
            guard digits.count >= 3 else { continue }
            for a in 0..<(digits.count - 2) {
                for b in (a + 1)..<(digits.count - 1) {
                    for c in (b + 1)..<digits.count {
                        let trio = [digits[a], digits[b], digits[c]]
                        var cells = Set<Int>()
                        for digit in trio { cells.formUnion(spots[digit] ?? []) }
                        guard cells.count == 3 else { continue }
                        let mask = DigitMask.make(trio)
                        let targets = cells.sorted()
                        if targets.contains(where: { (cands[$0] & ~mask) != 0 }) {
                            return SolveStep(kind: .hiddenTriple,
                                             tier: 4,
                                             placementIndex: nil,
                                             placementValue: nil,
                                             targets: targets,
                                             digits: trio,
                                             restrictsToDigits: true,
                                             title: "Triplet caché",
                                             detail: "Dans \(Sudoku.unitName(forUnitIndex: unitIndex)), \(trio[0]), \(trio[1]) et \(trio[2]) n'ont que trois cases possibles : ces cases ne contiennent qu'eux.")
                        }
                    }
                }
            }
        }
        return nil
    }

    /// XY-Wing : un pivot à deux candidats et deux pinces qui éliminent un chiffre.
    private static func xyWing(board: [Int], cands: [UInt16]) -> SolveStep? {
        let pairCells = (0..<Sudoku.cellCount).filter { board[$0] == 0 && DigitMask.count(cands[$0]) == 2 }
        guard pairCells.count >= 3 else { return nil }
        for pivot in pairCells {
            let pivotDigits = DigitMask.digits(cands[pivot])
            let x = pivotDigits[0], y = pivotDigits[1]
            let wings = pairCells.filter { $0 != pivot && Sudoku.peers[pivot].contains($0) }
            for first in wings {
                let firstDigits = DigitMask.digits(cands[first])
                guard firstDigits.contains(x) else { continue }
                let z = firstDigits[0] == x ? firstDigits[1] : firstDigits[0]
                guard z != y else { continue }
                for second in wings where second != first {
                    let secondDigits = DigitMask.digits(cands[second])
                    guard secondDigits.contains(y), secondDigits.contains(z) else { continue }
                    var elim: [Int] = []
                    for index in 0..<Sudoku.cellCount {
                        guard board[index] == 0, index != pivot, index != first, index != second else { continue }
                        guard DigitMask.contains(cands[index], z) else { continue }
                        if Sudoku.peers[first].contains(index) && Sudoku.peers[second].contains(index) {
                            elim.append(index)
                        }
                    }
                    if !elim.isEmpty {
                        return SolveStep(kind: .xyWing,
                                         tier: 5,
                                         placementIndex: nil,
                                         placementValue: nil,
                                         targets: elim,
                                         digits: [z],
                                         restrictsToDigits: false,
                                         title: "XY-Wing",
                                         detail: "Trois cases à deux candidats forment une fourche : le \(z) devient impossible dans les cases que voient les deux extrémités.")
                    }
                }
            }
        }
        return nil
    }

    /// Swordfish : un chiffre confiné à trois lignes croisant trois colonnes.
    private static func swordfish(board: [Int], cands: [UInt16]) -> SolveStep? {
        for digit in 1...9 {
            for orientation in 0..<2 {
                let lines = orientation == 0 ? Sudoku.rows : Sudoku.columns
                let crossLines = orientation == 0 ? Sudoku.columns : Sudoku.rows
                var candidateLines: [[Int]] = []
                for line in lines {
                    let spots = line.filter { board[$0] == 0 && DigitMask.contains(cands[$0], digit) }
                    if spots.count == 2 || spots.count == 3 { candidateLines.append(spots) }
                }
                guard candidateLines.count >= 3 else { continue }
                for a in 0..<(candidateLines.count - 2) {
                    for b in (a + 1)..<(candidateLines.count - 1) {
                        for c in (b + 1)..<candidateLines.count {
                            let corners = candidateLines[a] + candidateLines[b] + candidateLines[c]
                            let crossIndices = Set(corners.map { orientation == 0 ? Sudoku.column(of: $0) : Sudoku.row(of: $0) })
                            guard crossIndices.count == 3 else { continue }
                            var elim: [Int] = []
                            for cross in crossIndices.sorted() {
                                for index in crossLines[cross] where board[index] == 0 && !corners.contains(index) {
                                    if DigitMask.contains(cands[index], digit) { elim.append(index) }
                                }
                            }
                            if !elim.isEmpty {
                                return SolveStep(kind: .swordfish,
                                                 tier: 5,
                                                 placementIndex: nil,
                                                 placementValue: nil,
                                                 targets: elim,
                                                 digits: [digit],
                                                 restrictsToDigits: false,
                                                 title: "Swordfish",
                                                 detail: "Le \(digit) est confiné à trois \(orientation == 0 ? "lignes" : "colonnes") croisant trois \(orientation == 0 ? "colonnes" : "lignes") : il disparaît du reste de celles-ci.")
                            }
                        }
                    }
                }
            }
        }
        return nil
    }
}

import Foundation

/// Constantes et helpers géométriques de la grille 9x9.
/// Les indices vont de 0 à 80 (ligne * 9 + colonne).
enum Sudoku {
    static let size = 9
    static let cellCount = 81

    static let rows: [[Int]] = (0..<9).map { r in (0..<9).map { c in r * 9 + c } }

    static let columns: [[Int]] = (0..<9).map { c in (0..<9).map { r in r * 9 + c } }

    static let boxes: [[Int]] = (0..<9).map { b -> [Int] in
        let baseRow = (b / 3) * 3
        let baseColumn = (b % 3) * 3
        var result: [Int] = []
        for r in 0..<3 {
            for c in 0..<3 {
                result.append((baseRow + r) * 9 + baseColumn + c)
            }
        }
        return result
    }

    static let units: [[Int]] = rows + columns + boxes

    static let peers: [[Int]] = {
        var sets = [Set<Int>](repeating: Set<Int>(), count: cellCount)
        for unit in units {
            for i in unit {
                for j in unit where j != i {
                    sets[i].insert(j)
                }
            }
        }
        return sets.map { $0.sorted() }
    }()

    static func row(of index: Int) -> Int { index / 9 }
    static func column(of index: Int) -> Int { index % 9 }
    static func box(of index: Int) -> Int { (index / 27) * 3 + (index % 9) / 3 }

    static func index(row: Int, column: Int) -> Int { row * 9 + column }

    /// Nom lisible d'une unité, utilisé dans les explications d'indice.
    static func unitName(forUnitIndex unitIndex: Int) -> String {
        if unitIndex < 9 { return "la ligne \(unitIndex + 1)" }
        if unitIndex < 18 { return "la colonne \(unitIndex - 8)" }
        return "le bloc \(unitIndex - 17)"
    }

    static func isSafe(_ board: [Int], index: Int, value: Int) -> Bool {
        for peer in peers[index] where board[peer] == value {
            return false
        }
        return true
    }

    /// Indices en conflit avec la valeur placée en `index` (même ligne, colonne ou bloc).
    static func conflicts(in board: [Int], at index: Int) -> [Int] {
        let value = board[index]
        guard value != 0 else { return [] }
        return peers[index].filter { board[$0] == value }
    }
}

/// Ensemble de chiffres 1...9 encodé sur un masque de bits (bit `d` = chiffre `d`).
enum DigitMask {
    static let all: UInt16 = 0b11_1111_1110
    static let none: UInt16 = 0

    static func bit(_ digit: Int) -> UInt16 { UInt16(1) << UInt16(digit) }
    static func contains(_ mask: UInt16, _ digit: Int) -> Bool { mask & bit(digit) != 0 }
    static func inserting(_ mask: UInt16, _ digit: Int) -> UInt16 { mask | bit(digit) }
    static func removing(_ mask: UInt16, _ digit: Int) -> UInt16 { mask & ~bit(digit) }
    static func toggling(_ mask: UInt16, _ digit: Int) -> UInt16 { mask ^ bit(digit) }
    static func count(_ mask: UInt16) -> Int { mask.nonzeroBitCount }
    static func isEmpty(_ mask: UInt16) -> Bool { mask == 0 }

    static func digits(_ mask: UInt16) -> [Int] {
        var result: [Int] = []
        for d in 1...9 where contains(mask, d) { result.append(d) }
        return result
    }

    static func firstDigit(_ mask: UInt16) -> Int {
        for d in 1...9 where contains(mask, d) { return d }
        return 0
    }

    static func make(_ digits: [Int]) -> UInt16 {
        var mask: UInt16 = 0
        for d in digits { mask = inserting(mask, d) }
        return mask
    }
}

import Foundation

/// Stratégie de creusement d'une grille complète.
enum DigStrategy {
    /// On ne retire une case que si la grille reste résoluble avec les
    /// techniques humaines jusqu'au palier indiqué.
    case logic(maximumTier: Int)
    /// On retire tant que la solution reste unique : la grille peut alors
    /// exiger des techniques avancées.
    case unique
}

/// Les trois niveaux proposés par l'application.
enum Difficulty: String, Codable, CaseIterable, Identifiable, Sendable {
    case easy
    case medium
    case hard

    var id: String { rawValue }

    var title: String {
        switch self {
        case .easy: return "Facile"
        case .medium: return "Moyen"
        case .hard: return "Difficile"
        }
    }

    var subtitle: String {
        switch self {
        case .easy: return "Une grille douce, sans détour"
        case .medium: return "Déduction et patience"
        case .hard: return "Techniques avancées exigées"
        }
    }

    var symbolName: String {
        switch self {
        case .easy: return "leaf.fill"
        case .medium: return "flame.fill"
        case .hard: return "bolt.fill"
        }
    }

    /// Nombre d'indices conservés au minimum dans la grille finale.
    var clueFloor: Int {
        switch self {
        case .easy: return 40
        case .medium: return 30
        case .hard: return 24
        }
    }

    var digStrategy: DigStrategy {
        switch self {
        case .easy: return .logic(maximumTier: 2)
        case .medium: return .logic(maximumTier: 3)
        case .hard: return .unique
        }
    }

    /// Fourchette de difficulté acceptée (score calculé par `DifficultyRater`).
    var acceptedScore: ClosedRange<Double> {
        switch self {
        case .easy: return 0...85
        case .medium: return 95...210
        case .hard: return 215...100_000
        }
    }

    /// Score visé quand aucune grille de la fourchette n'a été trouvée.
    var targetScore: Double {
        switch self {
        case .easy: return 55
        case .medium: return 150
        case .hard: return 290
        }
    }
}

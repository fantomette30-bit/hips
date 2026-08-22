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

/// Regroupement affiché à l'accueil.
enum DifficultyGroup {
    case calm
    case tough
    case ultimate

    var title: String {
        switch self {
        case .calm: return "Nouvelle partie"
        case .tough: return "Niveaux corsés"
        case .ultimate: return "Défis ultimes"
        }
    }
}

/// Les six niveaux proposés par l'application.
enum Difficulty: String, Codable, CaseIterable, Identifiable, Sendable {
    case easy
    case medium
    case hard
    case expert
    case master
    case extreme
    case demonic
    case titan
    case legend

    var id: String { rawValue }

    var title: String {
        switch self {
        case .easy: return "Facile"
        case .medium: return "Moyen"
        case .hard: return "Difficile"
        case .expert: return "Expert"
        case .master: return "Master"
        case .extreme: return "Extrême"
        case .demonic: return "Démoniaque"
        case .titan: return "Titan"
        case .legend: return "Légende"
        }
    }

    var subtitle: String {
        switch self {
        case .easy: return "Une grille douce, sans détour"
        case .medium: return "Déduction et patience"
        case .hard: return "Les coups évidents se font rares"
        case .expert: return "Groupes verrouillés et paires nues"
        case .master: return "Triplets, paires cachées, X-Wing"
        case .extreme: return "XY-Wing, Swordfish : rien n'est offert"
        case .demonic: return "XYZ-Wing et W-Wing au menu"
        case .titan: return "Chaque case se mérite"
        case .legend: return "Le sommet — rare et impitoyable"
        }
    }

    /// Rang de 1 à 6, affiché sous forme de jauge.
    var rank: Int {
        switch self {
        case .easy: return 1
        case .medium: return 2
        case .hard: return 3
        case .expert: return 4
        case .master: return 5
        case .extreme: return 6
        case .demonic: return 7
        case .titan: return 8
        case .legend: return 9
        }
    }

    var group: DifficultyGroup {
        rank <= 3 ? .calm : (rank <= 6 ? .tough : .ultimate)
    }

    /// Nombre d'indices conservés au minimum dans la grille finale.
    var clueFloor: Int {
        switch self {
        case .easy: return 40
        case .medium: return 30
        case .hard: return 26
        case .expert: return 24
        case .master, .extreme, .demonic, .titan, .legend: return 22
        }
    }

    var digStrategy: DigStrategy {
        switch self {
        case .easy: return .logic(maximumTier: 2)
        case .medium: return .logic(maximumTier: 3)
        default: return .unique
        }
    }

    /// Les niveaux les plus durs se creusent sans symétrie : cela permet de
    /// descendre plus bas en nombre d'indices.
    var symmetricDigging: Bool {
        rank <= 4
    }

    /// Fourchette de difficulté acceptée (score calculé par `DifficultyRater`).
    var acceptedScore: ClosedRange<Double> {
        switch self {
        case .easy: return 0...85
        case .medium: return 95...200
        case .hard: return 210...330
        case .expert: return 345...480
        case .master: return 495...680
        case .extreme: return 700...849
        case .demonic: return 850...1_049
        case .titan: return 1_050...1_299
        case .legend: return 1_300...100_000
        }
    }

    /// Technique minimale exigée (1 candidat unique … 5 XY-Wing / Swordfish).
    var minimumTier: Int {
        switch self {
        case .master, .extreme: return 3
        case .demonic: return 5
        case .titan, .legend: return 6
        default: return 0
        }
    }

    /// Score visé quand aucune grille de la fourchette n'a été trouvée.
    var targetScore: Double {
        switch self {
        case .easy: return 55
        case .medium: return 150
        case .hard: return 270
        case .expert: return 410
        case .master: return 580
        case .extreme: return 770
        case .demonic: return 940
        case .titan: return 1_160
        case .legend: return 1_500
        }
    }

    /// Temps maximal accordé à la génération avant de garder la meilleure grille.
    var generationBudget: TimeInterval {
        rank >= 8 ? 9 : (rank == 7 ? 6 : (rank >= 5 ? 4 : 2.5))
    }
}

import SwiftUI
import Observation

enum AppearanceMode: String, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: return "Système"
        case .light: return "Clair"
        case .dark: return "Sombre"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

/// Préférences du joueur, stockées localement.
@Observable
final class AppSettings {

    var highlightPeers: Bool { didSet { store(highlightPeers, "highlightPeers") } }
    var highlightSameDigit: Bool { didSet { store(highlightSameDigit, "highlightSameDigit") } }
    var showMistakes: Bool { didSet { store(showMistakes, "showMistakes") } }
    var autoRemoveNotes: Bool { didSet { store(autoRemoveNotes, "autoRemoveNotes") } }
    var hapticsEnabled: Bool { didSet { store(hapticsEnabled, "hapticsEnabled") } }
    var showTimer: Bool { didSet { store(showTimer, "showTimer") } }
    var showRemainingCounts: Bool { didSet { store(showRemainingCounts, "showRemainingCounts") } }

    var appearance: AppearanceMode {
        didSet { UserDefaults.standard.set(appearance.rawValue, forKey: "appearance") }
    }

    init() {
        let defaults = UserDefaults.standard
        defaults.register(defaults: [
            "highlightPeers": true,
            "highlightSameDigit": true,
            "showMistakes": true,
            "autoRemoveNotes": true,
            "hapticsEnabled": true,
            "showTimer": true,
            "showRemainingCounts": true
        ])
        highlightPeers = defaults.bool(forKey: "highlightPeers")
        highlightSameDigit = defaults.bool(forKey: "highlightSameDigit")
        showMistakes = defaults.bool(forKey: "showMistakes")
        autoRemoveNotes = defaults.bool(forKey: "autoRemoveNotes")
        hapticsEnabled = defaults.bool(forKey: "hapticsEnabled")
        showTimer = defaults.bool(forKey: "showTimer")
        showRemainingCounts = defaults.bool(forKey: "showRemainingCounts")
        appearance = AppearanceMode(rawValue: defaults.string(forKey: "appearance") ?? "system") ?? .system
    }

    private func store(_ value: Bool, _ key: String) {
        UserDefaults.standard.set(value, forKey: key)
    }
}

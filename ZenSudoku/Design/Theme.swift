import SwiftUI
import UIKit

extension UIColor {
    convenience init(rgb: UInt32) {
        let red = CGFloat((rgb >> 16) & 0xFF) / 255.0
        let green = CGFloat((rgb >> 8) & 0xFF) / 255.0
        let blue = CGFloat(rgb & 0xFF) / 255.0
        self.init(red: red, green: green, blue: blue, alpha: 1.0)
    }
}

extension Color {
    /// Couleur dynamique clair / sombre.
    init(light: UInt32, dark: UInt32) {
        let dynamic = UIColor { traits in
            traits.userInterfaceStyle == .dark ? UIColor(rgb: dark) : UIColor(rgb: light)
        }
        self.init(uiColor: dynamic)
    }
}

/// Charte graphique de l'application.
enum Theme {

    // Fonds
    static let backgroundTop = Color(light: 0xF7F5F1, dark: 0x0A0C11)
    static let backgroundBottom = Color(light: 0xEDE9F6, dark: 0x14151E)
    static let surface = Color(light: 0xFFFFFF, dark: 0x181A23)
    static let surfaceElevated = Color(light: 0xFFFFFF, dark: 0x1E212B)
    static let separator = Color(light: 0xD9D4E4, dark: 0x2C3040)

    // Texte
    static let ink = Color(light: 0x15171F, dark: 0xF3F4F8)
    static let inkSecondary = Color(light: 0x6A6C7C, dark: 0x9EA2B4)
    static let inkTertiary = Color(light: 0x9A9CAB, dark: 0x6C7183)

    // Accents
    static let accent = Color(light: 0x4F46E5, dark: 0x9B95FF)
    static let accentSoft = Color(light: 0xEDEBFE, dark: 0x272A3E)
    static let gold = Color(light: 0xB88A2B, dark: 0xE9C577)
    static let danger = Color(light: 0xCE3B32, dark: 0xFF7268)
    static let success = Color(light: 0x1E8A5F, dark: 0x59D0A0)

    // Grille
    static let boardBackground = Color(light: 0xFFFFFF, dark: 0x161822)
    static let gridLine = Color(light: 0xD5D2E0, dark: 0x2B2F3E)
    static let gridLineStrong = Color(light: 0x8E8AA6, dark: 0x565C77)
    static let cellSelected = Color(light: 0xC9C4FA, dark: 0x38356B)
    static let cellPeer = Color(light: 0xF0EEFB, dark: 0x1D2030)
    static let cellSameDigit = Color(light: 0xDFDBFB, dark: 0x2A2B4A)
    static let cellError = Color(light: 0xFBE0DE, dark: 0x40222A)
    static let cellHint = Color(light: 0xFDF0D2, dark: 0x3A3220)

    static let background = LinearGradient(colors: [backgroundTop, backgroundBottom],
                                           startPoint: .top,
                                           endPoint: .bottom)

    // Typographie
    static func display(_ size: CGFloat) -> Font {
        .system(size: size, weight: .semibold, design: .rounded)
    }

    static func numeral(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }

    static let cornerRadius: CGFloat = 22
}

/// Carte translucide réutilisée dans toute l'application.
struct CardBackground: ViewModifier {
    var cornerRadius: CGFloat = Theme.cornerRadius
    var padding: CGFloat = 18

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(Theme.separator.opacity(0.6), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.07), radius: 18, x: 0, y: 10)
    }
}

extension View {
    func card(cornerRadius: CGFloat = Theme.cornerRadius, padding: CGFloat = 18) -> some View {
        modifier(CardBackground(cornerRadius: cornerRadius, padding: padding))
    }
}

enum TimeFormat {
    static func string(from interval: TimeInterval) -> String {
        let total = max(0, Int(interval))
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        let seconds = total % 60
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

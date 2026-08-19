import SwiftUI

struct VictoryView: View {

    let difficulty: Difficulty
    let time: TimeInterval
    let mistakes: Int
    let hints: Int
    let isNewRecord: Bool
    let onReviewBoard: () -> Void
    let onFinish: () -> Void

    @State private var appeared = false

    var body: some View {
        ZStack {
            Theme.backgroundTop.opacity(0.96).ignoresSafeArea()
            ConfettiView()
                .ignoresSafeArea()

            VStack(spacing: 22) {
                badge
                VStack(spacing: 6) {
                    Text(isNewRecord ? "Nouveau record !" : "Grille résolue")
                        .font(Theme.display(26))
                        .foregroundStyle(Theme.ink)
                    Text("Niveau \(difficulty.title.lowercased())")
                        .font(.subheadline)
                        .foregroundStyle(Theme.inkSecondary)
                }
                summary
                VStack(spacing: 10) {
                    PrimaryButton(title: "Retour à l'accueil", symbol: "house.fill", action: onFinish)
                    Button(action: onReviewBoard) {
                        Text("Revoir la grille")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Theme.inkSecondary)
                            .padding(.vertical, 8)
                    }
                }
            }
            .padding(28)
            .frame(maxWidth: 380)
            .scaleEffect(appeared ? 1 : 0.9)
            .opacity(appeared ? 1 : 0)
        }
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.75)) {
                appeared = true
            }
            Haptics.celebrate()
        }
    }

    private var badge: some View {
        ZStack {
            Circle()
                .fill(Theme.accentSoft)
                .frame(width: 96, height: 96)
            Image(systemName: isNewRecord ? "crown.fill" : "checkmark.seal.fill")
                .font(.system(size: 42, weight: .semibold))
                .foregroundStyle(isNewRecord ? Theme.gold : Theme.accent)
        }
    }

    private var summary: some View {
        HStack(spacing: 12) {
            SummaryTile(title: "Temps", value: TimeFormat.string(from: time), symbol: "clock")
            SummaryTile(title: "Erreurs", value: "\(mistakes)", symbol: "xmark.circle")
            SummaryTile(title: "Indices", value: "\(hints)", symbol: "lightbulb")
        }
    }
}

struct SummaryTile: View {
    let title: String
    let value: String
    let symbol: String

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: symbol)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Theme.accent)
            Text(value)
                .font(Theme.numeral(18))
                .foregroundStyle(Theme.ink)
                .monospacedDigit()
            Text(title)
                .font(.caption2)
                .foregroundStyle(Theme.inkTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Theme.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Theme.separator.opacity(0.6), lineWidth: 1)
        )
    }
}

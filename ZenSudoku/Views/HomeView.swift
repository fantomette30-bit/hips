import Foundation
import SwiftUI

struct HomeView: View {

    let savedGame: SavedGame?
    let onContinue: () -> Void
    let onStart: (Difficulty) -> Void
    let onShowStats: () -> Void
    let onShowSettings: () -> Void

    @Environment(StatsStore.self) private var stats

    var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                header
                if let saved = savedGame {
                    ContinueCard(saved: saved, action: onContinue)
                }
                difficultySection
                offlineBadge
                footer
            }
            .padding(.horizontal, 22)
            .padding(.top, 18)
            .padding(.bottom, 36)
        }
        .scrollIndicators(.hidden)
    }

    private var header: some View {
        VStack(spacing: 8) {
            Text("SUDOKU")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .tracking(6)
                .foregroundStyle(Theme.inkTertiary)
            Text("Zen")
                .font(.system(size: 52, weight: .bold, design: .serif))
                .foregroundStyle(Theme.ink)
            Text("Une grille, du calme, où que vous soyez.")
                .font(.subheadline)
                .foregroundStyle(Theme.inkSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 12)
        .padding(.bottom, 6)
    }

    private var difficultySection: some View {
        VStack(spacing: 20) {
            levelGroup(.calm)
            levelGroup(.tough)
        }
    }

    private func levelGroup(_ group: DifficultyGroup) -> some View {
        VStack(spacing: 12) {
            HStack {
                Text(group.title)
                    .font(Theme.display(18))
                    .foregroundStyle(Theme.ink)
                Spacer()
            }
            ForEach(Difficulty.allCases.filter { $0.group == group }) { difficulty in
                DifficultyRow(difficulty: difficulty,
                              bestTime: stats.entry(for: difficulty).bestTime) {
                    onStart(difficulty)
                }
            }
        }
    }

    private var offlineBadge: some View {
        HStack(spacing: 10) {
            Image(systemName: "airplane")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Theme.accent)
            VStack(alignment: .leading, spacing: 2) {
                Text("Prêt pour le mode avion")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.ink)
                Text("Grilles générées sur l'iPhone. Aucune donnée envoyée, aucune publicité.")
                    .font(.caption)
                    .foregroundStyle(Theme.inkSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .card(cornerRadius: 18, padding: 16)
    }

    private var footer: some View {
        HStack(spacing: 12) {
            SecondaryButton(title: "Statistiques", symbol: "chart.bar.fill", action: onShowStats)
            SecondaryButton(title: "Réglages", symbol: "gearshape.fill", action: onShowSettings)
        }
    }
}

struct DifficultyRow: View {

    let difficulty: Difficulty
    let bestTime: TimeInterval?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                ZStack {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Theme.accentSoft)
                        .frame(width: 46, height: 46)
                    DifficultyMeter(rank: difficulty.rank)
                }
                VStack(alignment: .leading, spacing: 3) {
                    Text(difficulty.title)
                        .font(Theme.display(19))
                        .foregroundStyle(Theme.ink)
                    Text(difficulty.subtitle)
                        .font(.caption)
                        .foregroundStyle(Theme.inkSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 4)
                VStack(alignment: .trailing, spacing: 3) {
                    if let bestTime {
                        Text(TimeFormat.string(from: bestTime))
                            .font(Theme.numeral(15))
                            .foregroundStyle(Theme.gold)
                        Text("record")
                            .font(.caption2)
                            .foregroundStyle(Theme.inkTertiary)
                    } else {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Theme.inkTertiary)
                    }
                }
            }
            .card(cornerRadius: 20, padding: 16)
        }
        .buttonStyle(PressableButtonStyle())
    }
}

struct ContinueCard: View {

    let saved: SavedGame
    let action: () -> Void

    /// Progression sur les seules cases à remplir (les indices de départ ne comptent pas).
    private var progress: Double {
        let fillable = saved.puzzle.givens.filter { $0 == 0 }.count
        guard fillable > 0 else { return 1 }
        var filled = 0
        for index in 0..<min(saved.values.count, saved.puzzle.givens.count)
        where saved.puzzle.givens[index] == 0 && saved.values[index] != 0 {
            filled += 1
        }
        return Double(filled) / Double(fillable)
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 18) {
                ProgressRing(progress: progress)
                    .frame(width: 54, height: 54)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Reprendre la partie")
                        .font(Theme.display(18))
                        .foregroundStyle(Theme.ink)
                    Text("\(saved.puzzle.difficulty.title) · \(TimeFormat.string(from: saved.elapsed))")
                        .font(.caption)
                        .foregroundStyle(Theme.inkSecondary)
                }
                Spacer(minLength: 0)
                Image(systemName: "play.fill")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background(Circle().fill(Theme.accent))
            }
            .card(cornerRadius: 20, padding: 16)
        }
        .buttonStyle(PressableButtonStyle())
    }
}

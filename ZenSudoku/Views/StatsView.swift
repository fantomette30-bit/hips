import Foundation
import SwiftUI

struct StatsView: View {

    @Environment(StatsStore.self) private var stats
    @Environment(\.dismiss) private var dismiss
    @State private var showResetAlert = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 16) {
                        overview
                        ForEach(Difficulty.allCases) { difficulty in
                            StatsCard(difficulty: difficulty, entry: stats.entry(for: difficulty))
                        }
                        Button(role: .destructive) {
                            showResetAlert = true
                        } label: {
                            Text("Réinitialiser les statistiques")
                                .font(.subheadline.weight(.semibold))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(Theme.danger)
                        .padding(.top, 6)
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 16)
                }
                .scrollIndicators(.hidden)
            }
            .navigationTitle("Statistiques")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Fermer") { dismiss() }
                }
            }
            .alert("Tout effacer ?", isPresented: $showResetAlert) {
                Button("Annuler", role: .cancel) { }
                Button("Effacer", role: .destructive) { stats.reset() }
            } message: {
                Text("Les records et séries seront définitivement perdus.")
            }
        }
    }

    private var overview: some View {
        HStack(spacing: 12) {
            SummaryTile(title: "Parties", value: "\(stats.totalPlayed)", symbol: "square.grid.3x3")
            SummaryTile(title: "Victoires", value: "\(stats.totalWins)", symbol: "trophy")
            SummaryTile(title: "Réussite",
                        value: stats.totalPlayed > 0 ? "\(Int(Double(stats.totalWins) / Double(stats.totalPlayed) * 100))%" : "—",
                        symbol: "percent")
        }
    }
}

struct StatsCard: View {

    let difficulty: Difficulty
    let entry: DifficultyStats

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                DifficultyMeter(rank: difficulty.rank)
                Text(difficulty.title)
                    .font(Theme.display(18))
                    .foregroundStyle(Theme.ink)
                Spacer()
                Text("\(entry.won)/\(entry.played)")
                    .font(Theme.numeral(15))
                    .foregroundStyle(Theme.inkSecondary)
                    .monospacedDigit()
            }
            VStack(spacing: 8) {
                StatLine(label: "Meilleur temps (sans indice)",
                         value: entry.bestTime.map { TimeFormat.string(from: $0) } ?? "—",
                         highlight: true)
                StatLine(label: "Temps moyen",
                         value: entry.averageTime.map { TimeFormat.string(from: $0) } ?? "—")
                StatLine(label: "Série en cours", value: "\(entry.currentStreak)")
                StatLine(label: "Meilleure série", value: "\(entry.bestStreak)")
                StatLine(label: "Sans faute ni indice", value: "\(entry.flawlessWins)")
            }
        }
        .card()
    }
}

struct StatLine: View {
    let label: String
    let value: String
    var highlight: Bool = false

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(Theme.inkSecondary)
            Spacer()
            Text(value)
                .font(Theme.numeral(15))
                .monospacedDigit()
                .foregroundStyle(highlight ? Theme.gold : Theme.ink)
        }
    }
}

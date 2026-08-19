import Foundation
import Observation

/// Statistiques d'un niveau de difficulté.
struct DifficultyStats: Codable, Equatable {
    var played: Int = 0
    var won: Int = 0
    var bestTime: TimeInterval?
    var totalTime: TimeInterval = 0
    var currentStreak: Int = 0
    var bestStreak: Int = 0
    var flawlessWins: Int = 0

    var averageTime: TimeInterval? {
        guard won > 0 else { return nil }
        return totalTime / Double(won)
    }

    var winRate: Double {
        guard played > 0 else { return 0 }
        return Double(won) / Double(played)
    }
}

@Observable
final class StatsStore {

    private(set) var stats: [String: DifficultyStats]

    init() {
        stats = StatsStore.loadFromDisk() ?? [:]
    }

    func entry(for difficulty: Difficulty) -> DifficultyStats {
        stats[difficulty.rawValue] ?? DifficultyStats()
    }

    var totalWins: Int {
        Difficulty.allCases.reduce(0) { $0 + entry(for: $1).won }
    }

    var totalPlayed: Int {
        Difficulty.allCases.reduce(0) { $0 + entry(for: $1).played }
    }

    func recordStart(_ difficulty: Difficulty) {
        var entry = self.entry(for: difficulty)
        entry.played += 1
        stats[difficulty.rawValue] = entry
        persist()
    }

    func recordWin(_ difficulty: Difficulty, time: TimeInterval, flawless: Bool) {
        var entry = self.entry(for: difficulty)
        entry.won += 1
        entry.totalTime += time
        if let best = entry.bestTime {
            entry.bestTime = min(best, time)
        } else {
            entry.bestTime = time
        }
        entry.currentStreak += 1
        entry.bestStreak = max(entry.bestStreak, entry.currentStreak)
        if flawless { entry.flawlessWins += 1 }
        stats[difficulty.rawValue] = entry
        persist()
    }

    func recordAbandon(_ difficulty: Difficulty) {
        var entry = self.entry(for: difficulty)
        entry.currentStreak = 0
        stats[difficulty.rawValue] = entry
        persist()
    }

    func isNewRecord(_ difficulty: Difficulty, time: TimeInterval) -> Bool {
        guard let best = entry(for: difficulty).bestTime else { return true }
        return time < best
    }

    func reset() {
        stats = [:]
        persist()
    }

    // MARK: - Persistance

    private static var fileURL: URL {
        let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        if !FileManager.default.fileExists(atPath: directory.path) {
            try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        }
        return directory.appendingPathComponent("stats.json")
    }

    private static func loadFromDisk() -> [String: DifficultyStats]? {
        guard let data = try? Data(contentsOf: fileURL) else { return nil }
        return try? JSONDecoder().decode([String: DifficultyStats].self, from: data)
    }

    private func persist() {
        guard let data = try? JSONEncoder().encode(stats) else { return }
        try? data.write(to: StatsStore.fileURL, options: .atomic)
    }
}

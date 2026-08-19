import Foundation

/// Sauvegarde locale de la partie en cours (aucun réseau, tout reste sur l'appareil).
enum GameStore {

    private static let fileName = "current-game.json"

    private static var fileURL: URL {
        let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        if !FileManager.default.fileExists(atPath: directory.path) {
            try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        }
        return directory.appendingPathComponent(fileName)
    }

    static func save(_ game: SavedGame) {
        do {
            let data = try JSONEncoder().encode(game)
            try data.write(to: fileURL, options: .atomic)
        } catch {
            // Une sauvegarde manquée ne doit jamais interrompre la partie.
        }
    }

    static func load() -> SavedGame? {
        guard let data = try? Data(contentsOf: fileURL) else { return nil }
        guard let saved = try? JSONDecoder().decode(SavedGame.self, from: data) else { return nil }
        guard saved.values.count == Sudoku.cellCount, saved.notes.count == Sudoku.cellCount else { return nil }
        guard saved.values != saved.puzzle.solution else { return nil }
        return saved
    }

    static func clear() {
        try? FileManager.default.removeItem(at: fileURL)
    }
}

import SwiftUI

struct RootView: View {

    @Environment(AppSettings.self) private var settings
    @Environment(StatsStore.self) private var stats
    @Environment(\.scenePhase) private var scenePhase

    @State private var game: GameState?
    @State private var savedGame: SavedGame?
    @State private var isGenerating = false
    @State private var generatingDifficulty: Difficulty?
    @State private var showStats = false
    @State private var showSettings = false

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            HomeView(savedGame: savedGame,
                     onContinue: resumeGame,
                     onStart: startGame,
                     onShowStats: { showStats = true },
                     onShowSettings: { showSettings = true })

            if isGenerating {
                GeneratingOverlay(difficulty: generatingDifficulty ?? .easy)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: isGenerating)
        .fullScreenCover(item: $game) { current in
            GameView(game: current, onClose: closeGame)
                .environment(settings)
                .environment(stats)
                .preferredColorScheme(settings.appearance.colorScheme)
        }
        .sheet(isPresented: $showStats) {
            StatsView().environment(stats)
        }
        .sheet(isPresented: $showSettings) {
            SettingsView().environment(settings)
        }
        .onAppear {
            savedGame = GameStore.load()
            Haptics.isEnabled = settings.hapticsEnabled
        }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase != .active, let current = game, !current.isComplete {
                GameStore.save(current.snapshot)
            }
        }
    }

    // MARK: - Actions

    private func resumeGame() {
        guard let saved = savedGame else { return }
        let restored = GameState(saved: saved)
        restored.autoRemoveNotes = settings.autoRemoveNotes
        game = restored
    }

    private func startGame(_ difficulty: Difficulty) {
        guard !isGenerating else { return }
        if let saved = savedGame {
            stats.recordAbandon(saved.puzzle.difficulty)
        }
        Haptics.tap()
        generatingDifficulty = difficulty
        isGenerating = true
        SudokuGenerator.generateAsync(difficulty: difficulty) { puzzle in
            let newGame = GameState(puzzle: puzzle)
            newGame.autoRemoveNotes = settings.autoRemoveNotes
            GameStore.clear()
            savedGame = nil
            stats.recordStart(difficulty)
            isGenerating = false
            game = newGame
        }
    }

    private func closeGame(_ current: GameState) {
        current.stopClock()
        if current.isComplete {
            GameStore.clear()
            savedGame = nil
        } else {
            GameStore.save(current.snapshot)
            savedGame = GameStore.load()
        }
        game = nil
    }
}

struct GeneratingOverlay: View {
    let difficulty: Difficulty

    var body: some View {
        ZStack {
            Color.black.opacity(0.25).ignoresSafeArea()
            VStack(spacing: 16) {
                ProgressView()
                    .controlSize(.large)
                Text("Création d'une grille \(difficulty.title.lowercased())")
                    .font(Theme.display(16))
                    .foregroundStyle(Theme.ink)
                Text("Génération locale, aucune connexion requise")
                    .font(.footnote)
                    .foregroundStyle(Theme.inkSecondary)
            }
            .card(padding: 28)
            .padding(40)
        }
    }
}

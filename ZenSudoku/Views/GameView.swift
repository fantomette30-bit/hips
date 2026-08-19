import SwiftUI

struct GameView: View {

    let game: GameState
    let onClose: (GameState) -> Void

    @Environment(AppSettings.self) private var settings
    @Environment(StatsStore.self) private var stats

    @State private var showVictory = false
    @State private var isNewRecord = false
    @State private var showRestartAlert = false

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            VStack(spacing: 14) {
                topBar
                statusRow
                hintBanner
                boardSection
                Spacer(minLength: 0)
                ToolsBarView(canUndo: !game.history.isEmpty,
                             isNoteMode: game.isNoteMode,
                             onUndo: { Haptics.tap(); game.undo() },
                             onErase: { Haptics.tap(); game.erase() },
                             onToggleNotes: { Haptics.select(); game.isNoteMode.toggle() },
                             onHint: handleHint)
                NumberPadView(remaining: (1...9).map { game.remaining(for: $0) },
                              isNoteMode: game.isNoteMode,
                              showCounts: settings.showRemainingCounts,
                              onDigit: handleDigit)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 12)

            if game.isPaused {
                PauseOverlay { game.togglePause(); game.startClock() }
            }

            if showVictory {
                VictoryView(difficulty: game.difficulty,
                            time: game.elapsed,
                            mistakes: game.mistakes,
                            hints: game.hintsUsed,
                            isNewRecord: isNewRecord,
                            onReviewBoard: { showVictory = false },
                            onFinish: { onClose(game) })
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: showVictory)
        .animation(.easeInOut(duration: 0.2), value: game.isPaused)
        .onAppear {
            game.autoRemoveNotes = settings.autoRemoveNotes
            Haptics.isEnabled = settings.hapticsEnabled
            if !game.isComplete { game.startClock() }
        }
        .onDisappear { game.stopClock() }
        .onChange(of: game.isComplete) { _, completed in
            guard completed else { return }
            handleVictory()
        }
        .onChange(of: game.values) { _, _ in
            guard !game.isComplete else { return }
            GameStore.save(game.snapshot)
        }
        .alert("Recommencer la grille ?", isPresented: $showRestartAlert) {
            Button("Annuler", role: .cancel) { }
            Button("Recommencer", role: .destructive) { game.restart() }
        } message: {
            Text("Les chiffres saisis et le chronomètre seront remis à zéro.")
        }
    }

    // MARK: - Sections

    private var topBar: some View {
        HStack(spacing: 12) {
            Button {
                onClose(game)
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                    .frame(width: 38, height: 38)
                    .background(Circle().fill(Theme.surface))
                    .overlay(Circle().strokeBorder(Theme.separator.opacity(0.7), lineWidth: 1))
            }
            .buttonStyle(PressableButtonStyle())

            VStack(spacing: 2) {
                Text(game.difficulty.title)
                    .font(Theme.display(17))
                    .foregroundStyle(Theme.ink)
                Text("Hors ligne")
                    .font(.caption2)
                    .foregroundStyle(Theme.inkTertiary)
            }
            .frame(maxWidth: .infinity)

            Menu {
                Button {
                    game.fillAllNotes()
                } label: {
                    Label("Remplir les notes", systemImage: "square.grid.3x3.topleft.filled")
                }
                Button {
                    showRestartAlert = true
                } label: {
                    Label("Recommencer", systemImage: "arrow.counterclockwise")
                }
                Button {
                    onClose(game)
                } label: {
                    Label("Quitter la partie", systemImage: "house")
                }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                    .frame(width: 38, height: 38)
                    .background(Circle().fill(Theme.surface))
                    .overlay(Circle().strokeBorder(Theme.separator.opacity(0.7), lineWidth: 1))
            }
        }
    }

    private var statusRow: some View {
        HStack(spacing: 8) {
            InfoPill(symbol: "xmark.circle",
                     text: "\(game.mistakes)",
                     tint: game.mistakes > 0 ? Theme.danger : Theme.inkSecondary)
            InfoPill(symbol: "lightbulb", text: "\(game.hintsUsed)")
            Spacer(minLength: 0)
            if settings.showTimer {
                Button {
                    Haptics.select()
                    game.togglePause()
                } label: {
                    InfoPill(symbol: game.isPaused ? "play.fill" : "pause.fill",
                             text: TimeFormat.string(from: game.elapsed),
                             tint: Theme.ink)
                }
                .buttonStyle(PressableButtonStyle())
            }
        }
    }

    @ViewBuilder
    private var hintBanner: some View {
        if let message = game.hintMessage {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "lightbulb.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Theme.gold)
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
                Button {
                    game.clearHint()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Theme.inkTertiary)
                }
            }
            .card(cornerRadius: 14, padding: 12)
            .transition(.move(edge: .top).combined(with: .opacity))
        }
    }

    private var boardSection: some View {
        BoardView(game: game, context: boardContext, onTap: handleTap)
            .opacity(game.isPaused ? 0.05 : 1)
            .blur(radius: game.isPaused ? 8 : 0)
    }

    private var boardContext: BoardContext {
        BoardContext(selected: game.selectedIndex,
                     selectedValue: game.selectedIndex.map { game.values[$0] } ?? 0,
                     conflicts: settings.showMistakes ? [] : game.conflictingIndices,
                     hinted: Set(game.highlightedByHint),
                     highlightPeers: settings.highlightPeers,
                     highlightSameDigit: settings.highlightSameDigit,
                     showMistakes: settings.showMistakes)
    }

    // MARK: - Actions

    private func handleTap(_ index: Int) {
        Haptics.select()
        game.select(index)
    }

    private func handleDigit(_ digit: Int) {
        let wasComplete = game.isComplete
        game.input(digit)
        if !wasComplete, let index = game.selectedIndex, game.values[index] == digit,
           settings.showMistakes, game.isWrong(index) {
            Haptics.warning()
        } else {
            Haptics.tap()
        }
    }

    private func handleHint() {
        Haptics.tap()
        game.useHint()
    }

    private func handleVictory() {
        isNewRecord = stats.isNewRecord(game.difficulty, time: game.elapsed)
        stats.recordWin(game.difficulty, time: game.elapsed, flawless: game.isPerfect)
        GameStore.clear()
        Haptics.success()
        showVictory = true
    }

    private func replaySameDifficulty() {
        showVictory = false
        onClose(game)
    }
}

struct PauseOverlay: View {
    let onResume: () -> Void

    var body: some View {
        ZStack {
            Theme.backgroundTop.opacity(0.92).ignoresSafeArea()
            VStack(spacing: 18) {
                Image(systemName: "pause.circle.fill")
                    .font(.system(size: 54))
                    .foregroundStyle(Theme.accent)
                Text("Partie en pause")
                    .font(Theme.display(22))
                    .foregroundStyle(Theme.ink)
                Text("Le chronomètre est arrêté.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.inkSecondary)
                PrimaryButton(title: "Reprendre", symbol: "play.fill", action: onResume)
                    .frame(maxWidth: 220)
            }
            .padding(30)
        }
        .contentShape(Rectangle())
        .onTapGesture(perform: onResume)
    }
}

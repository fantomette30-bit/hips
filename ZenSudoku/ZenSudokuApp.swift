import SwiftUI

@main
struct ZenSudokuApp: App {

    @State private var settings = AppSettings()
    @State private var stats = StatsStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(settings)
                .environment(stats)
                .preferredColorScheme(settings.appearance.colorScheme)
                .tint(Theme.accent)
                .onAppear {
                    Haptics.isEnabled = settings.hapticsEnabled
                }
        }
    }
}

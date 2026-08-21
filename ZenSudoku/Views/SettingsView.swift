import SwiftUI

struct SettingsView: View {

    @Environment(AppSettings.self) private var settings
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        @Bindable var settings = settings
        return NavigationStack {
            Form {
                Section("Apparence") {
                    Picker("Thème", selection: $settings.appearance) {
                        ForEach(AppearanceMode.allCases) { mode in
                            Text(mode.title).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("Aide visuelle") {
                    Toggle("Surligner ligne, colonne et bloc", isOn: $settings.highlightPeers)
                    Toggle("Surligner les chiffres identiques", isOn: $settings.highlightSameDigit)
                    Toggle("Signaler les erreurs", isOn: $settings.showMistakes)
                    Toggle("Compteur de chiffres restants", isOn: $settings.showRemainingCounts)
                }

                Section("Confort de jeu") {
                    Toggle("Effacer les notes automatiquement", isOn: $settings.autoRemoveNotes)
                    Toggle("Afficher le chronomètre", isOn: $settings.showTimer)
                    Toggle("Retour haptique", isOn: $settings.hapticsEnabled)
                        .onChange(of: settings.hapticsEnabled) { _, newValue in
                            Haptics.isEnabled = newValue
                        }
                }

                Section("À propos") {
                    LabeledContent("Version", value: "1.1")
                    LabeledContent("Connexion requise", value: "Aucune")
                    Text("Les grilles sont créées directement sur votre iPhone. L'application fonctionne intégralement en mode avion : aucune donnée n'est envoyée, aucun compte n'est nécessaire.")
                        .font(.footnote)
                        .foregroundStyle(Theme.inkSecondary)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Réglages")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
    }
}

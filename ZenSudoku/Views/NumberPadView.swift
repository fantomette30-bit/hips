import SwiftUI

struct NumberPadView: View {

    let remaining: [Int]
    let isNoteMode: Bool
    let showCounts: Bool
    let onDigit: (Int) -> Void

    var body: some View {
        HStack(spacing: 6) {
            ForEach(1...9, id: \.self) { digit in
                NumberKey(digit: digit,
                          remaining: remaining[digit - 1],
                          isNoteMode: isNoteMode,
                          showCount: showCounts) {
                    onDigit(digit)
                }
            }
        }
    }
}

struct NumberKey: View {

    let digit: Int
    let remaining: Int
    let isNoteMode: Bool
    let showCount: Bool
    let action: () -> Void

    private var isExhausted: Bool { remaining == 0 }

    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Text("\(digit)")
                    .font(Theme.numeral(24, weight: .semibold))
                    .foregroundStyle(isExhausted ? Theme.inkTertiary : (isNoteMode ? Theme.accent : Theme.ink))
                if showCount {
                    Text(isExhausted ? "·" : "\(remaining)")
                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                        .foregroundStyle(Theme.inkTertiary)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(isNoteMode ? Theme.accentSoft : Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(Theme.separator.opacity(0.7), lineWidth: 1)
            )
            .opacity(isExhausted && !isNoteMode ? 0.6 : 1)
        }
        .buttonStyle(PressableButtonStyle())
    }
}

struct ToolsBarView: View {

    let canUndo: Bool
    let isNoteMode: Bool
    let onUndo: () -> Void
    let onErase: () -> Void
    let onToggleNotes: () -> Void
    let onHint: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            ToolButton(symbol: "arrow.uturn.backward", title: "Annuler", isEnabled: canUndo, action: onUndo)
            ToolButton(symbol: "eraser", title: "Effacer", isEnabled: true, action: onErase)
            ToolButton(symbol: isNoteMode ? "pencil.circle.fill" : "pencil.circle",
                       title: "Notes",
                       isEnabled: true,
                       isActive: isNoteMode,
                       action: onToggleNotes)
            ToolButton(symbol: "lightbulb", title: "Indice", isEnabled: true, action: onHint)
        }
    }
}

struct ToolButton: View {

    let symbol: String
    let title: String
    let isEnabled: Bool
    var isActive: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 5) {
                Image(systemName: symbol)
                    .font(.system(size: 19, weight: .medium))
                Text(title)
                    .font(.system(size: 11, weight: .medium, design: .rounded))
            }
            .foregroundStyle(isActive ? Color.white : Theme.ink)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(isActive ? Theme.accent : Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(Theme.separator.opacity(isActive ? 0 : 0.7), lineWidth: 1)
            )
            .opacity(isEnabled ? 1 : 0.45)
        }
        .buttonStyle(PressableButtonStyle())
        .disabled(!isEnabled)
    }
}

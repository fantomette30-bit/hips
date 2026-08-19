import Foundation
import SwiftUI

struct PressableButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.975 : 1)
            .opacity(configuration.isPressed ? 0.92 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.75), value: configuration.isPressed)
    }
}

struct SecondaryButton: View {
    let title: String
    let symbol: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: symbol)
                    .font(.system(size: 14, weight: .semibold))
                Text(title)
                    .font(.subheadline.weight(.semibold))
            }
            .foregroundStyle(Theme.ink)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(Theme.separator.opacity(0.7), lineWidth: 1)
            )
        }
        .buttonStyle(PressableButtonStyle())
    }
}

struct PrimaryButton: View {
    let title: String
    var symbol: String?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let symbol {
                    Image(systemName: symbol)
                        .font(.system(size: 15, weight: .bold))
                }
                Text(title)
                    .font(.headline)
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Theme.accent)
            )
            .shadow(color: Theme.accent.opacity(0.35), radius: 14, x: 0, y: 8)
        }
        .buttonStyle(PressableButtonStyle())
    }
}

struct ProgressRing: View {
    let progress: Double

    var body: some View {
        ZStack {
            Circle()
                .stroke(Theme.separator.opacity(0.7), lineWidth: 5)
            Circle()
                .trim(from: 0, to: max(0.02, min(1, progress)))
                .stroke(Theme.accent, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(Int(progress * 100))%")
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(Theme.ink)
        }
    }
}

struct InfoPill: View {
    let symbol: String
    let text: String
    var tint: Color = Theme.inkSecondary

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: symbol)
                .font(.system(size: 11, weight: .semibold))
            Text(text)
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .monospacedDigit()
        }
        .foregroundStyle(tint)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(
            Capsule().fill(Theme.surface.opacity(0.9))
        )
        .overlay(
            Capsule().strokeBorder(Theme.separator.opacity(0.6), lineWidth: 1)
        )
    }
}

/// Petite pluie de confettis dessinée sur un Canvas (aucune dépendance externe).
struct ConfettiView: View {

    struct Piece {
        var x: Double
        var delay: Double
        var speed: Double
        var spin: Double
        var size: Double
        var hue: Double
    }

    @State private var start = Date()
    private let pieces: [Piece]

    init(count: Int = 70) {
        var generated: [Piece] = []
        for _ in 0..<count {
            generated.append(Piece(x: Double.random(in: 0...1),
                                   delay: Double.random(in: 0...1.4),
                                   speed: Double.random(in: 0.18...0.42),
                                   spin: Double.random(in: 1.5...4.5),
                                   size: Double.random(in: 6...12),
                                   hue: Double.random(in: 0...1)))
        }
        pieces = generated
    }

    var body: some View {
        TimelineView(.animation) { context in
            Canvas { drawing, size in
                let time = context.date.timeIntervalSince(start)
                for piece in pieces {
                    let local = time - piece.delay
                    guard local > 0 else { continue }
                    let progress = (local * piece.speed).truncatingRemainder(dividingBy: 1.35)
                    let y = progress * (size.height + 80) - 40
                    let sway = sin(local * 2.2 + piece.x * 6) * 18
                    let x = piece.x * size.width + sway
                    let width = piece.size * abs(cos(local * piece.spin))
                    let rect = CGRect(x: x - width / 2,
                                      y: y,
                                      width: max(1.5, width),
                                      height: piece.size * 1.5)
                    let color = Color(hue: piece.hue, saturation: 0.7, brightness: 0.95)
                    drawing.fill(Path(roundedRect: rect, cornerRadius: 2), with: .color(color.opacity(0.9)))
                }
            }
        }
        .allowsHitTesting(false)
        .onAppear { start = Date() }
    }
}

/// Jauge de difficulté : six barres croissantes, remplies jusqu'au rang du niveau.
struct DifficultyMeter: View {
    let rank: Int
    var tint: Color = Theme.accent

    var body: some View {
        HStack(alignment: .bottom, spacing: 2.5) {
            ForEach(1...6, id: \.self) { index in
                RoundedRectangle(cornerRadius: 1.2, style: .continuous)
                    .fill(index <= rank ? tint : tint.opacity(0.25))
                    .frame(width: 2.6, height: 6 + CGFloat(index - 1) * 2.4)
            }
        }
        .accessibilityLabel("Difficulté \(rank) sur 6")
    }
}

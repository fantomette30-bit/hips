import SwiftUI

struct BoardContext {
    var selected: Int?
    var selectedValue: Int
    var conflicts: Set<Int>
    var hinted: Set<Int>
    var highlightPeers: Bool
    var highlightSameDigit: Bool
    var showMistakes: Bool
}

struct BoardView: View {

    let game: GameState
    let context: BoardContext
    let onTap: (Int) -> Void

    var body: some View {
        GeometryReader { proxy in
            let side = min(proxy.size.width, proxy.size.height)
            let cellSize = side / 9
            ZStack(alignment: .topLeading) {
                cellsLayer(cellSize: cellSize)
                GridLinesView(side: side)
                    .allowsHitTesting(false)
            }
            .frame(width: side, height: side)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Theme.boardBackground)
            )
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .strokeBorder(Theme.gridLineStrong, lineWidth: 1.6)
            )
            .shadow(color: Color.black.opacity(0.10), radius: 20, x: 0, y: 12)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        }
        .aspectRatio(1, contentMode: .fit)
    }

    private func cellsLayer(cellSize: CGFloat) -> some View {
        VStack(spacing: 0) {
            ForEach(0..<9, id: \.self) { row in
                HStack(spacing: 0) {
                    ForEach(0..<9, id: \.self) { column in
                        let index = row * 9 + column
                        CellView(index: index,
                                 value: game.values[index],
                                 notes: game.notes[index],
                                 isGiven: game.isGiven(index),
                                 appearance: appearance(for: index),
                                 size: cellSize)
                            .modifier(ShakeEffect(animatableData: game.errorFlashIndex == index ? CGFloat(game.errorFlashCount) : 0))
                            .animation(.linear(duration: 0.45), value: game.errorFlashCount)
                            .contentShape(Rectangle())
                            .onTapGesture { onTap(index) }
                    }
                }
            }
        }
    }

    private func appearance(for index: Int) -> CellAppearance {
        let value = game.values[index]
        let isSelected = context.selected == index
        let isPeer: Bool = {
            guard context.highlightPeers, let selected = context.selected, selected != index else { return false }
            return Sudoku.peers[selected].contains(index)
        }()
        let isSameDigit = context.highlightSameDigit && value != 0 && value == context.selectedValue && !isSelected
        let isMistake = context.showMistakes && game.isWrong(index)
        let isConflicting = context.conflicts.contains(index) && value != 0
        let isHinted = context.hinted.contains(index)

        var background = Color.clear
        if isMistake || isConflicting {
            background = Theme.cellError
        } else if isSelected {
            background = Theme.cellSelected
        } else if isHinted {
            background = Theme.cellHint
        } else if isSameDigit {
            background = Theme.cellSameDigit
        } else if isPeer {
            background = Theme.cellPeer
        }

        var foreground = Theme.ink
        if !game.isGiven(index) {
            foreground = (isMistake || isConflicting) ? Theme.danger : Theme.accent
        } else if isMistake || isConflicting {
            foreground = Theme.danger
        }

        return CellAppearance(background: background,
                              foreground: foreground,
                              isSelected: isSelected,
                              isEmphasised: isSameDigit || isSelected,
                              isError: isMistake || isConflicting)
    }
}

struct CellAppearance {
    var background: Color
    var foreground: Color
    var isSelected: Bool
    var isEmphasised: Bool
    var isError: Bool
}

struct CellView: View {

    let index: Int
    let value: Int
    let notes: UInt16
    let isGiven: Bool
    let appearance: CellAppearance
    let size: CGFloat

    var body: some View {
        ZStack {
            Rectangle()
                .fill(appearance.background)
            if value != 0 {
                Text("\(value)")
                    .font(Theme.numeral(size * 0.52, weight: isGiven ? .semibold : .medium))
                    .underline(appearance.isError, pattern: .wavy)
                    .foregroundStyle(appearance.foreground)
                    .minimumScaleFactor(0.6)
                    .transition(.scale.combined(with: .opacity))
            } else if notes != 0 {
                NotesGrid(notes: notes, size: size)
            }
        }
        .frame(width: size, height: size)
        .animation(.easeOut(duration: 0.16), value: appearance.background)
        .animation(.spring(response: 0.28, dampingFraction: 0.7), value: value)
    }
}

/// Règle d'affichage des notes : toujours en ordre croissant, de gauche à
/// droite puis ligne suivante, sans position réservée ni trou. Une note seule
/// est donc centrée, deux notes sont côte à côte, etc.
struct NotesGrid: View {
    let notes: UInt16
    let size: CGFloat

    var body: some View {
        let digits = DigitMask.digits(notes)
        let rows = stride(from: 0, to: digits.count, by: 3).map { start in
            Array(digits[start..<min(start + 3, digits.count)])
        }
        VStack(spacing: size * 0.04) {
            ForEach(0..<rows.count, id: \.self) { row in
                HStack(spacing: size * 0.10) {
                    ForEach(rows[row], id: \.self) { digit in
                        Text("\(digit)")
                            .font(.system(size: size * 0.24, weight: .medium, design: .rounded))
                            .foregroundStyle(Theme.inkSecondary)
                            .monospacedDigit()
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(1)
    }
}

/// Secousse horizontale : trois allers-retours quand `animatableData`
/// passe d'un entier au suivant, immobile au repos.
struct ShakeEffect: GeometryEffect {
    var animatableData: CGFloat

    func effectValue(size: CGSize) -> ProjectionTransform {
        ProjectionTransform(CGAffineTransform(translationX: 4 * sin(animatableData * .pi * 6), y: 0))
    }
}

struct GridLinesView: View {
    let side: CGFloat

    var body: some View {
        Canvas { context, size in
            let step = size.width / 9
            for i in 0...9 {
                let isStrong = i % 3 == 0
                let width: CGFloat = isStrong ? 1.6 : 0.7
                let color = isStrong ? Theme.gridLineStrong : Theme.gridLine
                let offset = CGFloat(i) * step

                var vertical = Path()
                vertical.move(to: CGPoint(x: offset, y: 0))
                vertical.addLine(to: CGPoint(x: offset, y: size.height))
                context.stroke(vertical, with: .color(color), lineWidth: width)

                var horizontal = Path()
                horizontal.move(to: CGPoint(x: 0, y: offset))
                horizontal.addLine(to: CGPoint(x: size.width, y: offset))
                context.stroke(horizontal, with: .color(color), lineWidth: width)
            }
        }
        .frame(width: side, height: side)
    }
}

import SwiftUI

struct RoundView: View {
    @EnvironmentObject private var store: ScorekeeperStore
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Group {
            if let match = store.match {
                if match.isComplete {
                    SettlementView()
                } else {
                    activeHole(match)
                }
            } else {
                MGTScreen {
                    ContentUnavailableView("No active round", systemImage: "flag")
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    private func activeHole(_ match: MatchState) -> some View {
        let hole = store.course.hole(match.currentHole)
        let base = ScoringEngine.baseForHole(match.currentHole, doubles: match.doubles)
        let strokes = ScoringEngine.allocateStrokes(players: match.players, course: store.course)

        return MGTScreen {
            ScrollView {
                LazyVStack(spacing: 10) {
                    ScoreHeader(
                        match: match,
                        base: base,
                        onUndo: store.undoLastHole,
                        onReset: store.reset,
                        onDouble: store.callDouble(for:),
                        onToggleLD10: store.setLD10Accepted(_:)
                    )

                    MGTCard(spacing: 8, horizontalPadding: 12, verticalPadding: 10) {
                        ForEach(match.pendingEntries.indices, id: \.self) { index in
                            if let player = match.players.first(where: { $0.id == match.pendingEntries[index].playerId }) {
                                PlayerScoreEntryView(
                                    player: player,
                                    hole: hole,
                                    holeNumber: match.currentHole,
                                    strokes: strokes[index][match.currentHole - 1],
                                    entry: entryBinding(for: match.pendingEntries[index]),
                                    ld10Enabled: match.ld10Accepted
                                )

                                if index != match.pendingEntries.indices.last {
                                    Divider()
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 12)

                    Color.clear.frame(height: 96)
                }
            }
            .safeAreaInset(edge: .bottom) {
                VStack(spacing: 10) {
                    if let saveToast = store.feedbackMessage {
                        SaveToast(message: saveToast)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }

                    Button {
                        if let record = store.submitCurrentHole() {
                            Haptics.success()
                            showSavedToast("Hole \(record.hole) saved")
                        }
                    } label: {
                        Label("Submit Scores", systemImage: "checkmark.circle.fill")
                    }
                    .buttonStyle(MGTPrimaryButtonStyle())
                }
                .padding(.horizontal, 12)
                .padding(.top, 10)
                .padding(.bottom, 8)
                .background(.ultraThinMaterial)
            }
        }
    }

    private func entryBinding(for entry: HoleEntry) -> Binding<HoleEntry> {
        Binding(
            get: {
                store.match?.pendingEntries.first(where: { $0.playerId == entry.playerId }) ?? entry
            },
            set: { store.setEntry($0) }
        )
    }

    private func showSavedToast(_ message: String) {
        if reduceMotion {
            store.feedbackMessage = message
        } else {
            withAnimation(.easeOut(duration: 0.18)) {
                store.feedbackMessage = message
            }
        }

        Task { @MainActor in
            try? await Task.sleep(for: .seconds(3.5))
            guard store.feedbackMessage == message else { return }
            if reduceMotion {
                store.feedbackMessage = nil
            } else {
                withAnimation(.easeOut(duration: 0.18)) {
                    store.feedbackMessage = nil
                }
            }
        }
    }
}

private struct ScoreHeader: View {
    let match: MatchState
    let base: Int
    let onUndo: () -> Void
    let onReset: () -> Void
    let onDouble: (Team) -> Void
    let onToggleLD10: (Bool) -> Void

    private var doubleTeams: [Team] {
        Team.allCases.filter {
            ScoringEngine.canCallDouble(
                team: $0,
                hole: match.currentHole,
                teamBalance: match.teamBalance,
                doubleUsedThisHole: match.doubleUsedThisHole
            )
        }
    }

    var body: some View {
        MGTCard(spacing: 8, horizontalPadding: 12, verticalPadding: 10) {
            HStack(alignment: .center, spacing: 10) {
                Text("Hole \(match.currentHole)")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(MGTTheme.ink)

                Spacer(minLength: 8)

                Text(balanceLabel(match.teamBalance))
                    .font(.title3.weight(.semibold).monospacedDigit())
                    .foregroundStyle(balanceColor)
                    .lineLimit(1)
                    .fixedSize(horizontal: true, vertical: false)
                    .accessibilityLabel("Match score, \(balanceLabel(match.teamBalance))")

                HStack(spacing: 6) {
                    if !match.records.isEmpty {
                        HeaderIconButton(systemImage: "arrow.uturn.backward", tint: MGTTheme.brand) {
                            Haptics.light()
                            onUndo()
                        }
                        .accessibilityLabel("Undo last hole")
                    }

                    HeaderIconButton(systemImage: "arrow.counterclockwise", tint: MGTTheme.red) {
                        Haptics.light()
                        onReset()
                    }
                    .accessibilityLabel("Reset round")
                }
            }

            HStack(spacing: 8) {
                Text("Base $\(base) • Carry $\(match.carry)")
                    .font(.caption.weight(.medium).monospacedDigit())
                    .foregroundStyle(MGTTheme.muted)
                    .lineLimit(1)

                Spacer(minLength: 8)

                BigGameBadge(value: match.bigGameTotal.map { "BG \($0)" } ?? "Side")
            }

            if match.records.last != nil || !doubleTeams.isEmpty || match.currentHole == 17 {
                HStack(spacing: 8) {
                    if let last = match.records.last {
                        Label("Saved H\(last.hole)", systemImage: "checkmark.circle.fill")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(MGTTheme.brand)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 5)
                            .background(MGTTheme.brandSoft, in: Capsule())
                            .accessibilityLabel("Hole \(last.hole) saved")
                    }

                    ForEach(doubleTeams) { team in
                        ScoreChipButton(
                            title: "\(team.rawValue) double",
                            systemImage: "arrow.up.forward.circle.fill",
                            isOn: false,
                            tint: team == .red ? MGTTheme.red : MGTTheme.blue
                        ) {
                            Haptics.light()
                            onDouble(team)
                        }
                    }

                    if match.currentHole == 17 {
                        ScoreChipButton(
                            title: "LD10",
                            systemImage: "flag.checkered",
                            isOn: match.ld10Accepted,
                            tint: MGTTheme.brand
                        ) {
                            Haptics.light()
                            onToggleLD10(!match.ld10Accepted)
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 12)
    }

    private func balanceLabel(_ amount: Int) -> String {
        if amount == 0 { return "$0" }
        return amount > 0 ? "Red +$\(amount)" : "Blue +$\(abs(amount))"
    }

    private var balanceColor: Color {
        if match.teamBalance == 0 { return MGTTheme.brand }
        return match.teamBalance > 0 ? MGTTheme.red : MGTTheme.blue
    }
}

private struct PlayerScoreEntryView: View {
    @EnvironmentObject private var store: ScorekeeperStore

    let player: Player
    let hole: CourseHole
    let holeNumber: Int
    let strokes: Int
    @Binding var entry: HoleEntry
    let ld10Enabled: Bool

    var body: some View {
        let teeBox = hole.teeBox(for: player.tee)
        let previewNet = entry.pickedUp ? teeBox.par + Rulebook.pickupNetOverPar : max(1, entry.gross - strokes)

        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .center, spacing: 10) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(player.name)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(MGTTheme.ink)
                            .lineLimit(1)
                            .minimumScaleFactor(0.78)
                            .layoutPriority(1)
                        if strokes > 0 {
                            HandicapStrokeDots(count: strokes)
                                .offset(y: -5)
                        }
                        TeamBadge(team: player.team)
                    }

                    Text("\(player.tee.shortName) • Par \(teeBox.par) • SI \(teeBox.strokeIndex) • \(teeBox.distance)y")
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(MGTTheme.muted)
                        .lineLimit(1)
                }

                Spacer(minLength: 6)

                ScoreStepper(value: $entry.gross)

                VStack(alignment: .trailing, spacing: 2) {
                    Text("Net")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(MGTTheme.muted)
                    Text("\(previewNet)")
                        .font(.title3.weight(.semibold).monospacedDigit())
                        .foregroundStyle(previewNet < teeBox.par ? MGTTheme.brand : MGTTheme.ink)
                        .frame(minWidth: 30, alignment: .trailing)
                }
            }

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 68), spacing: 6)], alignment: .leading, spacing: 6) {
                ScoreChipButton(
                    title: "Pickup",
                    systemImage: "arrow.down.circle.fill",
                    isOn: entry.pickedUp,
                    tint: MGTTheme.red
                ) {
                    Haptics.light()
                    entry.pickedUp.toggle()
                }

                ScoreChipButton(
                    title: "Sand",
                    systemImage: "figure.golf",
                    isOn: entry.flags.hadBunkerShot,
                    tint: MGTTheme.success
                ) {
                    Haptics.light()
                    entry.flags.hadBunkerShot.toggle()
                }

                if Rulebook.parThreeGreenieHoles.contains(holeNumber) {
                    ScoreChipButton(
                        title: "Green",
                        systemImage: "circle.circle.fill",
                        isOn: entry.flags.onGreenFromTee,
                        tint: MGTTheme.brand
                    ) {
                        Haptics.light()
                        entry.flags.onGreenFromTee.toggle()
                    }

                    ScoreChipButton(
                        title: "3-putt",
                        systemImage: "exclamationmark.triangle.fill",
                        isOn: entry.flags.threePutts,
                        tint: MGTTheme.red
                    ) {
                        Haptics.light()
                        entry.flags.threePutts.toggle()
                    }
                }

                if holeNumber == 17, ld10Enabled {
                    ScoreChipButton(
                        title: "LD10",
                        systemImage: "flag.checkered",
                        isOn: entry.flags.ld10Winner,
                        tint: MGTTheme.brand
                    ) {
                        Haptics.light()
                        store.setLD10Winner(playerId: player.id, isWinner: !entry.flags.ld10Winner)
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

private struct HandicapStrokeDots: View {
    let count: Int

    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<count, id: \.self) { _ in
                Circle()
                    .fill(MGTTheme.brand)
                    .frame(width: 8, height: 8)
                    .overlay {
                        Circle().stroke(.white, lineWidth: 1)
                    }
            }
        }
        .fixedSize()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(count) handicap stroke\(count == 1 ? "" : "s") on this hole")
    }
}

private struct ScoreStepper: View {
    @Binding var value: Int

    var body: some View {
        HStack(spacing: 6) {
            scoreButton(systemImage: "minus", disabled: value <= 1) {
                value = max(1, value - 1)
                Haptics.light()
            }

            Text("\(value)")
                .font(.title2.weight(.semibold).monospacedDigit())
                .foregroundStyle(MGTTheme.ink)
                .frame(width: 36)
                .accessibilityLabel("Gross \(value)")

            scoreButton(systemImage: "plus", disabled: value >= 14) {
                value = min(14, value + 1)
                Haptics.light()
            }
        }
    }

    private func scoreButton(systemImage: String, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.caption.weight(.bold))
                .foregroundStyle(disabled ? MGTTheme.muted.opacity(0.45) : .white)
                .frame(width: 34, height: 34)
                .background(disabled ? MGTTheme.line.opacity(0.45) : MGTTheme.brand, in: Circle())
        }
        .buttonStyle(.plain)
        .disabled(disabled)
    }
}

private struct ScoreChipButton: View {
    let title: String
    var systemImage: String?
    let isOn: Bool
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.caption2.weight(.bold))
                }
                Text(title)
                    .font(.caption.weight(.semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.78)
            }
            .foregroundStyle(isOn ? .white : tint)
            .frame(maxWidth: .infinity, minHeight: 32)
            .padding(.horizontal, 8)
            .background(isOn ? tint : tint.opacity(0.10), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(tint.opacity(isOn ? 0 : 0.35), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }
}

private struct HeaderIconButton: View {
    let systemImage: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(tint)
                .frame(width: 34, height: 34)
                .background(tint.opacity(0.10), in: Circle())
        }
        .buttonStyle(.plain)
    }
}

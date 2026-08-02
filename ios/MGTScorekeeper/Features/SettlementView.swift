import Charts
import SwiftUI

struct SettlementView: View {
    @EnvironmentObject private var store: ScorekeeperStore

    private let archivedMatch: MatchState?

    init(match: MatchState? = nil) {
        archivedMatch = match
    }

    var body: some View {
        MGTScreen {
            if let match = archivedMatch ?? store.match {
                let analytics = ScoringEngine.settlementAnalytics(for: match)

                ScrollView {
                    LazyVStack(spacing: 10) {
                        CompactPageHeader(
                            title: archivedMatch == nil ? "Settlement" : "Past round",
                            subtitle: match.isComplete
                                ? "Final • \(match.records.count) holes"
                                : "Live • \(match.records.count) holes"
                        )

                        SettlementResultCard(match: match)
                            .padding(.horizontal, 12)

                        SettlementSection(title: "How the money moved") {
                            MoneyMovementChart(points: analytics.moneyMovement)
                        }

                        if !analytics.biggestSwings.isEmpty {
                            SettlementSection(title: "Biggest swings") {
                                VStack(spacing: 0) {
                                    ForEach(Array(analytics.biggestSwings.enumerated()), id: \.element.id) { index, swing in
                                        SwingRow(swing: swing)
                                        if index != analytics.biggestSwings.indices.last {
                                            Divider()
                                        }
                                    }
                                }
                            }
                        }

                        SettlementSection(title: "Most valuable") {
                            PlayerValueReport(analytics: analytics)
                        }

                        SettlementSection(title: "Junk") {
                            JunkReport(match: match)
                        }

                        if match.bigGameEnabled {
                            SettlementSection(title: "Big Game", tint: MGTTheme.brandSoft) {
                                HStack(alignment: .firstTextBaseline) {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text("Your foursome’s total")
                                            .font(.headline)
                                            .foregroundStyle(MGTTheme.ink)
                                        Text("Two best net per hole • $\(Rulebook.bigGameEntryFee) per player")
                                            .font(.caption)
                                            .foregroundStyle(MGTTheme.muted)
                                    }
                                    Spacer()
                                    Text("\(match.bigGameTotal ?? 0)")
                                        .font(.system(size: 38, weight: .semibold, design: .rounded).monospacedDigit())
                                        .foregroundStyle(MGTTheme.brand)
                                }
                            }
                        }

                        if archivedMatch == nil {
                            SettlementActions(match: match)
                        }
                    }
                    .padding(.bottom, 24)
                }
            } else {
                ContentUnavailableView("No active round", systemImage: "dollarsign.circle")
            }
        }
        .toolbar(archivedMatch == nil ? .hidden : .visible, for: .navigationBar)
    }
}

private struct SettlementResultCard: View {
    let match: MatchState

    private var winningTeam: Team? {
        if match.teamBalance > 0 { return .red }
        if match.teamBalance < 0 { return .blue }
        return nil
    }

    var body: some View {
        MGTCard(spacing: 12, horizontalPadding: 14, verticalPadding: 14) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(match.isComplete ? "FINAL" : "LIVE")
                        .font(.caption2.weight(.bold))
                        .tracking(1.5)
                        .foregroundStyle(MGTTheme.muted)
                    Text(resultTitle)
                        .font(.system(size: 28, weight: .semibold, design: .serif).italic())
                        .foregroundStyle(MGTTheme.ink)
                }
                Spacer()
                Text(resultAmount)
                    .font(.system(size: 42, weight: .semibold, design: .rounded).monospacedDigit())
                    .foregroundStyle(resultColor)
            }

            if winningTeam != nil {
                Divider()
                Text(ScoringEngine.settlementText(for: match))
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(MGTTheme.muted)
            } else {
                Text(ScoringEngine.settlementText(for: match))
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(MGTTheme.muted)
            }
        }
    }

    private var resultTitle: String {
        guard let winningTeam else { return "All square" }
        return "\(winningTeam.rawValue) takes it"
    }

    private var resultAmount: String {
        guard match.teamBalance != 0 else { return "$0" }
        return "+$\(abs(match.teamBalance))"
    }

    private var resultColor: Color {
        guard let winningTeam else { return MGTTheme.brand }
        return teamColor(winningTeam)
    }

}

private struct SettlementSection<Content: View>: View {
    let title: String
    var tint: Color = .white
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.caption2.weight(.bold))
                .tracking(1.4)
                .foregroundStyle(MGTTheme.brand)
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(tint, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(MGTTheme.line.opacity(0.35), lineWidth: 1)
        )
        .padding(.horizontal, 12)
    }
}

private struct MoneyMovementChart: View {
    let points: [MoneyMovementPoint]

    var body: some View {
        if points.isEmpty {
            Text("Save a hole to start the money line.")
                .font(.subheadline)
                .foregroundStyle(MGTTheme.muted)
                .frame(maxWidth: .infinity, minHeight: 120)
        } else {
            Chart {
                RuleMark(y: .value("Even", 0))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                    .foregroundStyle(MGTTheme.line)

                ForEach(points) { point in
                    AreaMark(
                        x: .value("Hole", point.hole),
                        yStart: .value("Even", 0),
                        yEnd: .value("Balance", point.balance)
                    )
                    .interpolationMethod(.stepEnd)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [MGTTheme.brand.opacity(0.18), MGTTheme.brand.opacity(0.02)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                    LineMark(
                        x: .value("Hole", point.hole),
                        y: .value("Balance", point.balance)
                    )
                    .interpolationMethod(.stepEnd)
                    .lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
                    .foregroundStyle(MGTTheme.brandPressed)

                    PointMark(
                        x: .value("Hole", point.hole),
                        y: .value("Balance", point.balance)
                    )
                    .symbolSize(32)
                    .foregroundStyle(winnerColor(point.winner))

                    if point.doubleWasCalled {
                        PointMark(
                            x: .value("Double hole", point.hole),
                            y: .value("Balance at double", point.balance)
                        )
                        .symbol {
                            Text("2×")
                                .font(.system(size: 9, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                                .frame(width: 22, height: 16)
                                .background(MGTTheme.ink, in: Capsule())
                                .overlay(Capsule().stroke(.white, lineWidth: 1))
                        }
                        .accessibilityLabel("Double called on hole \(point.hole)")
                    }
                }
            }
            .chartYScale(domain: yDomain)
            .chartXAxis {
                AxisMarks(values: xAxisValues) { value in
                    AxisGridLine().foregroundStyle(.clear)
                    AxisTick().foregroundStyle(MGTTheme.line)
                    AxisValueLabel {
                        if let hole = value.as(Int.self) {
                            Text("H\(hole)")
                        }
                    }
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisGridLine().foregroundStyle(MGTTheme.line.opacity(0.4))
                    AxisValueLabel {
                        if let amount = value.as(Double.self) {
                            Text(moneyLabel(Int(amount.rounded())))
                        }
                    }
                }
            }
            .frame(height: 190)
            .accessibilityLabel("Money movement by hole")
            .accessibilityValue(doubleAccessibilityValue)

            HStack(spacing: 14) {
                ChartLegendDot(color: MGTTheme.red, label: "Red won")
                ChartLegendDot(color: MGTTheme.blue, label: "Blue won")
                ChartLegendDot(color: MGTTheme.line, label: "Push")
                if points.contains(where: \.doubleWasCalled) {
                    ChartLegendDouble()
                }
            }
        }
    }

    private var yDomain: ClosedRange<Double> {
        let balances = points.map(\.balance) + [0]
        let low = balances.min() ?? 0
        let high = balances.max() ?? 0
        let padding = max(2, (high - low) / 8)
        return Double(low - padding)...Double(high + padding)
    }

    private var xAxisValues: [Int] {
        guard let finalHole = points.last?.hole else { return [] }
        return Array(Set([1, min(9, finalHole), finalHole])).sorted()
    }

    private var doubleAccessibilityValue: String {
        let holes = points.filter(\.doubleWasCalled).map { "\($0.hole)" }
        guard !holes.isEmpty else { return "No doubles called" }
        return "Doubles called on holes \(holes.joined(separator: ", "))"
    }
}

private struct ChartLegendDot: View {
    let color: Color
    let label: String

    var body: some View {
        Label {
            Text(label)
        } icon: {
            Circle().fill(color).frame(width: 7, height: 7)
        }
        .font(.caption2.weight(.medium))
        .foregroundStyle(MGTTheme.muted)
    }
}

private struct ChartLegendDouble: View {
    var body: some View {
        Label {
            Text("Double")
        } icon: {
            Text("2×")
                .font(.system(size: 8, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .frame(width: 19, height: 13)
                .background(MGTTheme.ink, in: Capsule())
        }
        .font(.caption2.weight(.medium))
        .foregroundStyle(MGTTheme.muted)
    }
}

private struct SwingRow: View {
    let swing: SettlementSwing

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            Text("\(swing.hole)")
                .font(.headline.monospacedDigit())
                .foregroundStyle(MGTTheme.ink)
                .frame(width: 34, height: 34)
                .background(MGTTheme.page, in: Circle())
                .overlay(Circle().stroke(MGTTheme.line.opacity(0.65), lineWidth: 1))

            Text(teamDeltaLabel(swing.delta))
                .font(.headline.monospacedDigit())
                .foregroundStyle(swing.delta >= 0 ? MGTTheme.red : MGTTheme.blue)
                .frame(minWidth: 72, alignment: .leading)

            Text(detail)
                .font(.caption)
                .foregroundStyle(MGTTheme.muted)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, 9)
        .accessibilityElement(children: .combine)
    }

    private var detail: String {
        var details: [String] = []
        if swing.doubleWasCalled { details.append("double in play") }
        if swing.carryIn > 0 { details.append("$\(swing.carryIn) carry") }
        if let name = swing.countingPlayerName, let net = swing.countingNet {
            details.append("\(name) net \(net)")
        }
        if swing.junkDelta != 0 {
            details.append("junk \(signedMoney(swing.junkDelta))")
        }
        return details.isEmpty ? swing.winner.rawValue : details.joined(separator: " • ")
    }
}

private struct PlayerValueReport: View {
    let analytics: SettlementAnalytics

    var body: some View {
        if !analytics.playerValues.isEmpty {
            Text(summary)
                .font(.subheadline)
                .foregroundStyle(MGTTheme.muted)
                .fixedSize(horizontal: false, vertical: true)

            VStack(spacing: 9) {
                ForEach(analytics.playerValues) { player in
                    HStack(spacing: 9) {
                        Text(player.name)
                            .font(.subheadline.weight(player.id == analytics.mostValuable?.id ? .bold : .medium))
                            .foregroundStyle(MGTTheme.ink)
                            .lineLimit(1)
                            .frame(width: 112, alignment: .leading)

                        ProgressView(value: Double(player.partnerMargin), total: Double(max(maxValue, 1)))
                            .tint(teamColor(player.team))

                        Text(player.partnerMargin > 0 ? "+\(player.partnerMargin)" : "0")
                            .font(.subheadline.weight(.semibold).monospacedDigit())
                            .foregroundStyle(MGTTheme.ink)
                            .frame(width: 30, alignment: .trailing)
                    }
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel("\(player.name), partner value \(player.partnerMargin), counting score on \(player.countingHoles) holes")
                }
            }

            Text("Value = how far a player’s net beat their partner’s on holes their score counted (better-ball margin). Tied partner scores add no margin.")
                .font(.caption2)
                .foregroundStyle(MGTTheme.muted)
                .fixedSize(horizontal: false, vertical: true)
        } else {
            Text("Save a hole to calculate partner value.")
                .font(.subheadline)
                .foregroundStyle(MGTTheme.muted)
        }
    }

    private var maxValue: Int {
        analytics.playerValues.map(\.partnerMargin).max() ?? 0
    }

    private var summary: String {
        guard let mvp = analytics.mostValuable else {
            return "No player separated from their partner on the saved holes."
        }
        return mvpSummary(mvp)
    }

    private func mvpSummary(_ player: PlayerValue) -> String {
        let holes = player.biggestGapHoles.map(String.init).joined(separator: " & ")
        let gapSummary = holes.isEmpty ? "with no separation from their partner" : "with the biggest partner gaps on \(holes)"
        return "\(player.name) carried the side — at the team low on \(player.countingHoles) holes, \(gapSummary)."
    }
}

private struct JunkReport: View {
    let match: MatchState

    var body: some View {
        VStack(spacing: 0) {
            ForEach(Array(match.players.enumerated()), id: \.element.id) { index, player in
                HStack(spacing: 10) {
                    TeamBadge(team: player.team)
                    Text(player.name)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(MGTTheme.ink)
                        .lineLimit(1)
                    Spacer()
                    Text(summary(for: player))
                        .font(.caption)
                        .foregroundStyle(MGTTheme.muted)
                        .multilineTextAlignment(.trailing)
                }
                .padding(.vertical, 8)

                if index != match.players.indices.last {
                    Divider()
                }
            }
        }
    }

    private func events(for player: Player) -> [JunkEvent] {
        match.records.flatMap(\.junkEvents).filter { $0.playerId == player.id }
    }

    private func summary(for player: Player) -> String {
        let playerEvents = events(for: player)
        var summaries: [String] = JunkType.allCases.compactMap { type -> String? in
            let count = playerEvents.filter { $0.type == type }.count
            guard count > 0 else { return nil }
            let label = type == .greeniePenalty ? "greenie penalty" : type.rawValue.lowercased()
            return "\(count) \(label)\(count == 1 ? "" : "s")"
        }

        let threePuttCount = match.records.reduce(0) { total, record in
            total + record.playerResults.filter { $0.playerId == player.id && $0.flags.threePutts }.count
        }
        if threePuttCount > 0 {
            summaries.append("\(threePuttCount) 3-putt\(threePuttCount == 1 ? "" : "s")")
        }

        return summaries.isEmpty ? "—" : summaries.joined(separator: " • ")
    }
}

private struct SettlementActions: View {
    @EnvironmentObject private var store: ScorekeeperStore

    let match: MatchState

    var body: some View {
        VStack(spacing: 10) {
            if !store.history.isEmpty {
                NavigationLink {
                    MatchHistoryView(matches: store.history)
                } label: {
                    Label("Past rounds", systemImage: "clock.arrow.circlepath")
                        .font(.subheadline.weight(.semibold))
                }
                .buttonStyle(.bordered)
                .tint(MGTTheme.brand)
            }

            Button {
                Haptics.light()
                if match.isComplete {
                    store.archiveAndReset()
                } else {
                    store.reset()
                }
            } label: {
                Label(match.isComplete ? "Archive & New Round" : "Discard Round", systemImage: "arrow.counterclockwise")
            }
            .buttonStyle(MGTPrimaryButtonStyle())
        }
        .padding(.horizontal, 12)
    }
}

struct MatchHistoryView: View {
    let matches: [MatchState]

    var body: some View {
        MGTScreen {
            ScrollView {
                LazyVStack(spacing: 10) {
                    CompactPageHeader(title: "Past rounds", subtitle: "Saved on this device")

                    ForEach(matches, id: \.id) { match in
                        NavigationLink {
                            SettlementView(match: match)
                        } label: {
                            MGTCard(spacing: 8, horizontalPadding: 12, verticalPadding: 11) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(match.createdAt.formatted(date: .abbreviated, time: .omitted))
                                            .font(.headline)
                                            .foregroundStyle(MGTTheme.ink)
                                        Text(match.players.map(\.name).joined(separator: " • "))
                                            .font(.caption)
                                            .foregroundStyle(MGTTheme.muted)
                                            .lineLimit(2)
                                    }
                                    Spacer(minLength: 8)
                                    Text(balanceLabel(match.teamBalance))
                                        .font(.headline.monospacedDigit())
                                        .foregroundStyle(match.teamBalance >= 0 ? MGTTheme.red : MGTTheme.blue)
                                    Image(systemName: "chevron.right")
                                        .font(.caption.weight(.bold))
                                        .foregroundStyle(MGTTheme.muted)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 12)
                    }
                }
                .padding(.bottom, 24)
            }
        }
        .navigationTitle("History")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.visible, for: .navigationBar)
    }
}

private func teamColor(_ team: Team) -> Color {
    team == .red ? MGTTheme.red : MGTTheme.blue
}

private func winnerColor(_ winner: HoleWinner) -> Color {
    switch winner {
    case .red: MGTTheme.red
    case .blue: MGTTheme.blue
    case .push: MGTTheme.line
    }
}

private func balanceLabel(_ amount: Int) -> String {
    if amount == 0 { return "$0" }
    return amount > 0 ? "Red +$\(amount)" : "Blue +$\(abs(amount))"
}

private func teamDeltaLabel(_ amount: Int) -> String {
    balanceLabel(amount)
}

private func signedMoney(_ amount: Int) -> String {
    if amount == 0 { return "$0" }
    return amount > 0 ? "+$\(amount)" : "-$\(abs(amount))"
}

private func moneyLabel(_ amount: Int) -> String {
    signedMoney(amount)
}

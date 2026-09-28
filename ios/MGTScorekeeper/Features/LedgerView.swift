import SwiftUI

struct LedgerView: View {
    @EnvironmentObject private var store: ScorekeeperStore
    @State private var expandedHoles: Set<Int> = []

    var body: some View {
        MGTScreen {
            if let match = store.match, !match.records.isEmpty {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        CompactPageHeader(
                            title: "Ledger",
                            subtitle: "\(match.records.count) holes • \(balanceLabel(match.teamBalance))"
                        )

                        MGTCard(spacing: 10, horizontalPadding: 12, verticalPadding: 10) {
                            HStack(spacing: 8) {
                                MetricPill(title: "Side", value: balanceLabel(match.teamBalance), tint: match.teamBalance >= 0 ? MGTTheme.red : MGTTheme.blue)
                                MetricPill(title: "Carry", value: "$\(match.carry)")
                                if let total = match.bigGameTotal {
                                    MetricPill(title: "Big Game", value: "\(total)")
                                }
                            }
                        }
                        .padding(.horizontal, 12)

                        ForEach(match.records.reversed()) { record in
                            LedgerHoleCard(
                                record: record,
                                isExpanded: expandedHoles.contains(record.hole),
                                onToggle: { toggle(record.hole) }
                            )
                                .padding(.horizontal, 12)
                        }
                    }
                    .padding(.bottom, 24)
                }
            } else {
                ContentUnavailableView("No holes scored", systemImage: "list.bullet.rectangle")
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    private func balanceLabel(_ amount: Int) -> String {
        if amount == 0 { return "$0" }
        return amount > 0 ? "Red +$\(amount)" : "Blue +$\(abs(amount))"
    }

    private func toggle(_ hole: Int) {
        withAnimation(.easeInOut(duration: 0.2)) {
            if expandedHoles.contains(hole) {
                expandedHoles.remove(hole)
            } else {
                expandedHoles.insert(hole)
            }
        }
    }
}

private struct LedgerHoleCard: View {
    let record: HoleRecord
    let isExpanded: Bool
    let onToggle: () -> Void

    var body: some View {
        MGTCard(spacing: 8, horizontalPadding: 12, verticalPadding: 10) {
            Button(action: onToggle) {
                HStack(spacing: 8) {
                    Text("H\(record.hole)")
                        .font(.headline.weight(.semibold).monospacedDigit())
                        .foregroundStyle(MGTTheme.ink)

                    Text(resultLabel)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(movementColor)
                        .lineLimit(1)
                        .minimumScaleFactor(0.78)

                    Spacer(minLength: 8)

                    Text(balanceLabel(record.teamBalanceAfter))
                        .font(.subheadline.weight(.semibold).monospacedDigit())
                        .foregroundStyle(totalColor)
                        .lineLimit(1)
                        .minimumScaleFactor(0.76)

                    Image(systemName: "chevron.down")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(MGTTheme.muted)
                        .rotationEffect(.degrees(isExpanded ? 180 : 0))
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Hole \(record.hole), \(resultLabel)")
            .accessibilityValue(isExpanded ? "Scores expanded" : "Scores collapsed")
            .accessibilityHint("Shows every player's score on this hole")

            HStack(spacing: 6) {
                MiniLedgerPill(title: "Base", value: "$\(record.base)")
                MiniLedgerPill(title: "Side", value: ledgerAmount(record.sideDelta))
                MiniLedgerPill(title: "Junk", value: ledgerAmount(record.junkDelta))
                MiniLedgerPill(title: "Carry", value: "$\(record.carryOut)")
            }

            if let bigGame = record.bigGame {
                HStack(spacing: 8) {
                    BigGameBadge(value: "BG \(bigGame.subtotal)")
                    Text(bigGame.contributors.joined(separator: ", "))
                        .font(.caption)
                        .foregroundStyle(MGTTheme.muted)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                }
            }

            if !record.junkEvents.isEmpty {
                VStack(alignment: .leading, spacing: 5) {
                    ForEach(record.junkEvents) { event in
                        HStack(spacing: 6) {
                            Image(systemName: event.deltaForPlayersTeam >= 0 ? "sparkle" : "exclamationmark.triangle.fill")
                                .font(.caption)
                                .foregroundStyle(event.deltaForPlayersTeam >= 0 ? MGTTheme.success : MGTTheme.red)
                            Text(event.signedDescription)
                                .font(.caption.weight(.medium))
                                .foregroundStyle(MGTTheme.ink)
                                .lineLimit(1)
                                .minimumScaleFactor(0.78)
                            Spacer(minLength: 0)
                        }
                    }
                }
                .padding(.top, 2)
            }

            if isExpanded {
                Divider()

                VStack(alignment: .leading, spacing: 10) {
                    Text("PLAYER CALCULATIONS")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(MGTTheme.muted)

                    ForEach(record.playerResults) { result in
                        VStack(alignment: .leading, spacing: 3) {
                            HStack(spacing: 8) {
                                Circle()
                                    .fill(result.team == .red ? MGTTheme.red : MGTTheme.blue)
                                    .frame(width: 8, height: 8)

                                Text(result.playerName)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(MGTTheme.ink)
                                    .lineLimit(1)

                                Spacer(minLength: 8)

                                Text(scoreHeadline(result))
                                    .font(.subheadline.weight(.bold).monospacedDigit())
                                    .foregroundStyle(MGTTheme.ink)
                            }

                            Text(scoreCalculation(result))
                                .font(.caption.monospacedDigit())
                                .foregroundStyle(MGTTheme.muted)

                            if let junk = junkCalculation(for: result) {
                                Text(junk)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(junkColor(for: result))
                            }
                        }
                        .accessibilityElement(children: .combine)
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("HOLE CALCULATION")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(MGTTheme.muted)

                    Text(sideCalculation)
                    Text("Side \(ledgerAmount(record.sideDelta)) + Junk \(ledgerAmount(record.junkDelta)) = Hole \(ledgerAmount(record.matchDelta))")
                    Text(runningCalculation)
                }
                .font(.caption.monospacedDigit())
                .foregroundStyle(MGTTheme.ink)
                .padding(9)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(MGTTheme.page, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                .accessibilityElement(children: .combine)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }

    private var resultLabel: String {
        if record.matchDelta == 0 { return "No change" }
        return record.matchDelta > 0
            ? "Red +$\(record.matchDelta)"
            : "Blue +$\(abs(record.matchDelta))"
    }

    private var movementColor: Color {
        if record.matchDelta == 0 { return MGTTheme.muted }
        return record.matchDelta > 0 ? MGTTheme.red : MGTTheme.blue
    }

    private var totalColor: Color {
        if record.teamBalanceAfter == 0 { return MGTTheme.brand }
        return record.teamBalanceAfter > 0 ? MGTTheme.red : MGTTheme.blue
    }

    private func balanceLabel(_ amount: Int) -> String {
        if amount == 0 { return "$0" }
        return amount > 0 ? "Red +$\(amount)" : "Blue +$\(abs(amount))"
    }

    private var sideCalculation: String {
        let breakdown = record.sidePayoutBreakdown
        if breakdown.outcome == .push {
            return "Side push: $\(breakdown.carryIn) carry + $\(breakdown.base) base = $\(breakdown.carryOut) carried"
        }
        return "Side win: $\(breakdown.carryIn) carry + $\(breakdown.base) base + $\(breakdown.winBonus) win bonus = $\(breakdown.payout)"
    }

    private var runningCalculation: String {
        let before = record.teamBalanceAfter - record.matchDelta
        let operation = record.matchDelta < 0 ? "−" : "+"
        return "Running: \(ledgerAmount(before)) \(operation) $\(abs(record.matchDelta)) = \(ledgerAmount(record.teamBalanceAfter))"
    }

    private func scoreCalculation(_ result: PlayerHoleResult) -> String {
        let breakdown = result.netScoreBreakdown
        switch breakdown.method {
        case .pickup(let par, let allowance):
            return "Par \(par) + \(allowance) pickup allowance = Net \(breakdown.net)"
        case .played(let gross, let strokes, let rawNet):
            if strokes == 0 {
                return "Gross \(gross) = Net \(breakdown.net)"
            }
            let subtraction = "Gross \(gross) − \(strokes) stroke\(strokes == 1 ? "" : "s")"
            if rawNet != breakdown.net {
                return "\(subtraction) = \(rawNet) → Net minimum \(breakdown.net)"
            }
            return "\(subtraction) = Net \(breakdown.net)"
        }
    }

    private func scoreHeadline(_ result: PlayerHoleResult) -> String {
        result.pickedUp ? "Pickup • Net \(result.net)" : "Gross \(result.gross)"
    }

    private func junkCalculation(for result: PlayerHoleResult) -> String? {
        let events = record.junkEvents.filter { $0.playerId == result.playerId }
        guard !events.isEmpty else { return nil }
        return events.map {
            "\($0.type.rawValue) junk \(ledgerAmount($0.deltaForPlayersTeam))"
        }.joined(separator: " • ")
    }

    private func junkColor(for result: PlayerHoleResult) -> Color {
        record.junkEvents.contains {
            $0.playerId == result.playerId && $0.deltaForPlayersTeam < 0
        } ? MGTTheme.red : MGTTheme.success
    }

    private func ledgerAmount(_ amount: Int) -> String {
        if amount == 0 { return "$0" }
        return amount > 0 ? "+$\(amount)" : "−$\(abs(amount))"
    }
}

private struct MiniLedgerPill: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(title)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(MGTTheme.muted)
            Text(value)
                .font(.caption.weight(.semibold).monospacedDigit())
                .foregroundStyle(MGTTheme.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.72)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 6)
        .padding(.horizontal, 7)
        .background(MGTTheme.page, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

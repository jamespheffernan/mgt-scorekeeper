import SwiftUI

struct LedgerView: View {
    @EnvironmentObject private var store: ScorekeeperStore

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
                            LedgerHoleCard(record: record)
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
}

private struct LedgerHoleCard: View {
    let record: HoleRecord

    var body: some View {
        MGTCard(spacing: 8, horizontalPadding: 12, verticalPadding: 10) {
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
            }

            HStack(spacing: 6) {
                MiniLedgerPill(title: "Base", value: "$\(record.base)")
                MiniLedgerPill(title: "Side", value: signedMoney(record.sideDelta))
                MiniLedgerPill(title: "Junk", value: signedMoney(record.junkDelta))
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

    private func signedMoney(_ amount: Int) -> String {
        if amount == 0 { return "$0" }
        return amount > 0 ? "+$\(amount)" : "-$\(abs(amount))"
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

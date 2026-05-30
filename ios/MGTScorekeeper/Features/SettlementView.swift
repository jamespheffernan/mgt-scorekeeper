import SwiftUI

struct SettlementView: View {
    @EnvironmentObject private var store: ScorekeeperStore

    var body: some View {
        MGTScreen {
            if let match = store.match {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        CompactPageHeader(
                            title: "Settlement",
                            subtitle: match.isComplete ? "Final • \(balanceLabel(match.teamBalance))" : "Live • \(match.records.count) holes • \(balanceLabel(match.teamBalance))"
                        )

                        MGTCard(spacing: 10, horizontalPadding: 12, verticalPadding: 10) {
                            HStack {
                                Label("Side Match", systemImage: "dollarsign.circle.fill")
                                    .font(.headline)
                                    .foregroundStyle(MGTTheme.ink)
                                Spacer()
                                Text(balanceLabel(match.teamBalance))
                                    .font(.title3.weight(.semibold).monospacedDigit())
                                    .foregroundStyle(match.teamBalance >= 0 ? MGTTheme.red : MGTTheme.blue)
                            }

                            Text(ScoringEngine.settlementText(for: match))
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(MGTTheme.ink)
                        }
                        .padding(.horizontal, 12)

                        if match.bigGameEnabled {
                            MGTCard(spacing: 8, horizontalPadding: 12, verticalPadding: 10) {
                                HStack {
                                    Label("Big Game", systemImage: "leaf.fill")
                                        .font(.headline)
                                        .foregroundStyle(MGTTheme.ink)
                                    Spacer()
                                    BigGameBadge(value: "\(match.bigGameTotal ?? 0)")
                                }
                                HStack {
                                    Text("$\(Rulebook.bigGameEntryFee) per player")
                                        .font(.caption.weight(.semibold).monospacedDigit())
                                        .foregroundStyle(MGTTheme.muted)
                                    Spacer()
                                    Text("ties roll")
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(MGTTheme.muted)
                                }
                            }
                            .padding(.horizontal, 12)
                        }

                        MGTCard(spacing: 8, horizontalPadding: 12, verticalPadding: 10) {
                            ForEach(match.players) { player in
                                HStack(spacing: 8) {
                                    TeamBadge(team: player.team)
                                    Text(player.name)
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(MGTTheme.ink)
                                        .lineLimit(1)
                                    Spacer()
                                    Text("\(player.tee.shortName) • \(player.handicapIndex, specifier: "%.1f")")
                                        .font(.caption.weight(.medium))
                                        .foregroundStyle(MGTTheme.muted)
                                        .lineLimit(1)
                                }

                                if player.id != match.players.last?.id {
                                    Divider()
                                }
                            }
                        }
                        .padding(.horizontal, 12)

                        Button {
                            Haptics.light()
                            store.reset()
                        } label: {
                            Label("Start Over", systemImage: "arrow.counterclockwise")
                        }
                        .buttonStyle(.bordered)
                        .tint(MGTTheme.red)
                        .padding(.bottom, 24)
                    }
                }
            } else {
                ContentUnavailableView("No active round", systemImage: "dollarsign.circle")
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    private func balanceLabel(_ amount: Int) -> String {
        if amount == 0 { return "$0" }
        return amount > 0 ? "Red +$\(amount)" : "Blue +$\(abs(amount))"
    }
}

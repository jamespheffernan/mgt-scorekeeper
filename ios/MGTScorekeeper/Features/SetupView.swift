import SwiftUI

struct SetupView: View {
    @EnvironmentObject private var store: ScorekeeperStore
    @State private var players = ScorekeeperStore.samplePlayers
    @State private var bigGameEnabled = true

    var body: some View {
        NavigationStack {
            MGTScreen {
                ScrollView {
                    VStack(spacing: 14) {
                        CompactPageHeader(
                            title: "The Millbrook Game",
                            subtitle: "Foursome, tees, and games"
                        )

                        MGTCard(spacing: 14) {
                            HStack {
                                Label("Players", systemImage: "person.4.fill")
                                    .font(.headline)
                                    .foregroundStyle(MGTTheme.ink)
                                Spacer()
                                Text("\(players.filter { $0.team == .red }.count) Red / \(players.filter { $0.team == .blue }.count) Blue")
                                    .font(.caption.weight(.semibold).monospacedDigit())
                                    .foregroundStyle(hasValidTeams ? MGTTheme.brand : MGTTheme.red)
                            }

                            ForEach(players.indices, id: \.self) { index in
                                PlayerSetupRow(player: $players[index])
                                if index != players.indices.last {
                                    Divider()
                                }
                            }
                        }
                        .padding(.horizontal, 12)

                        MGTCard(spacing: 14) {
                            Toggle(isOn: $bigGameEnabled) {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text("Track Big Game")
                                        .font(.headline)
                                    Text("Two best net scores per hole, separate from junk.")
                                        .font(.caption)
                                        .foregroundStyle(MGTTheme.muted)
                                }
                            }
                            .tint(MGTTheme.brand)

                            HStack {
                                TeamBadge(team: .red)
                                Image(systemName: "arrow.left.arrow.right")
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(MGTTheme.muted)
                                TeamBadge(team: .blue)
                                Spacer()
                                BigGameBadge(value: bigGameEnabled ? "Big Game On" : "Side only")
                            }
                        }
                        .padding(.horizontal, 12)

                        Button {
                            Haptics.success()
                            store.start(players: players, bigGameEnabled: bigGameEnabled)
                        } label: {
                            Label("Start Round", systemImage: "play.fill")
                        }
                        .buttonStyle(MGTPrimaryButtonStyle())
                        .disabled(!hasValidTeams)
                        .padding(.horizontal, 12)

                        Text("Use exactly two Red players and two Blue players. Handicap strokes are allocated from the low index in the foursome.")
                            .font(.caption)
                            .foregroundStyle(MGTTheme.muted)
                            .padding(.horizontal, 20)
                            .padding(.bottom, 24)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private var hasValidTeams: Bool {
        players.filter { $0.team == .red }.count == 2 &&
            players.filter { $0.team == .blue }.count == 2 &&
            players.allSatisfy { !$0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }
}

private struct PlayerSetupRow: View {
    @Binding var player: Player

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                TextField("Name", text: $player.name)
                    .textInputAutocapitalization(.words)
                    .font(.headline)

                TextField("Index", value: $player.handicapIndex, format: .number.precision(.fractionLength(1)))
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .font(.headline.monospacedDigit())
                    .frame(width: 64)
            }

            HStack(spacing: 10) {
                TeamPicker(team: $player.team)
                Picker("Tee", selection: $player.tee) {
                    ForEach(Tee.allCases) { tee in
                        Text(tee.rawValue).tag(tee)
                    }
                }
                .pickerStyle(.menu)
                .tint(MGTTheme.muted)
                .frame(maxWidth: .infinity, alignment: .trailing)
            }
        }
        .padding(.vertical, 4)
    }
}

private struct TeamPicker: View {
    @Binding var team: Team

    var body: some View {
        HStack(spacing: 0) {
            teamButton(.red)
            teamButton(.blue)
        }
        .background(MGTTheme.page, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(MGTTheme.line.opacity(0.6), lineWidth: 1)
        )
    }

    private func teamButton(_ candidate: Team) -> some View {
        Button {
            Haptics.light()
            team = candidate
        } label: {
            Text(candidate.rawValue)
                .font(.caption.weight(.semibold))
                .foregroundStyle(team == candidate ? .white : MGTTheme.muted)
                .frame(width: 62, height: 30)
                .background(
                    team == candidate ? teamColor(candidate) : .clear,
                    in: RoundedRectangle(cornerRadius: 7, style: .continuous)
                )
        }
        .buttonStyle(.plain)
    }

    private func teamColor(_ team: Team) -> Color {
        team == .red ? MGTTheme.red : MGTTheme.blue
    }
}

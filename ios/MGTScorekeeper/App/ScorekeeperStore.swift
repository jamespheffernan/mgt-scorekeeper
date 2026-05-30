import Foundation

@MainActor
final class ScorekeeperStore: ObservableObject {
    @Published var match: MatchState? {
        didSet { save() }
    }
    @Published var alertMessage: String?
    @Published var feedbackMessage: String?

    let course = Course.millbrook
    private let persistenceKey = "mgt-scorekeeper.active-match"

    init() {
        match = Self.loadSavedMatch(key: persistenceKey)
    }

    func start(players: [Player], bigGameEnabled: Bool) {
        do {
            try ScoringEngine.validatePlayers(players)
            match = MatchState.new(players: players, bigGameEnabled: bigGameEnabled, course: course)
        } catch {
            alertMessage = error.localizedDescription
        }
    }

    func callDouble(for team: Team) {
        guard var current = match,
              ScoringEngine.canCallDouble(
                team: team,
                hole: current.currentHole,
                teamBalance: current.teamBalance,
                doubleUsedThisHole: current.doubleUsedThisHole
              ) else { return }

        current.doubles += 1
        current.doubleUsedThisHole = true
        match = current
    }

    @discardableResult
    func submitCurrentHole() -> HoleRecord? {
        guard var current = match else { return nil }
        do {
            let record = try ScoringEngine.scoreCurrentHole(match: &current, course: course)
            match = current
            feedbackMessage = "Hole \(record.hole) saved"
            return record
        } catch {
            alertMessage = error.localizedDescription
            return nil
        }
    }

    func undoLastHole() {
        guard var current = match, let last = current.records.popLast() else { return }

        current.currentHole = last.hole
        current.doubles = last.doublesInEffect
        current.carry = last.carryIn
        current.greenieCarry = last.greenieCarryIn
        current.teamBalance = last.teamBalanceAfter - last.sideDelta - last.junkDelta
        current.doubleUsedThisHole = last.doubleWasCalled
        current.ld10Accepted = last.ld10Accepted
        current.pendingEntries = last.playerResults.map {
            HoleEntry(
                playerId: $0.playerId,
                gross: $0.gross,
                pickedUp: $0.pickedUp,
                flags: $0.flags
            )
        }

        match = current
    }

    func setEntry(_ entry: HoleEntry) {
        guard var current = match,
              let index = current.pendingEntries.firstIndex(where: { $0.playerId == entry.playerId }) else { return }
        current.pendingEntries[index] = entry
        match = current
    }

    func setLD10Accepted(_ accepted: Bool) {
        guard var current = match else { return }
        current.ld10Accepted = accepted
        if !accepted {
            for index in current.pendingEntries.indices {
                current.pendingEntries[index].flags.ld10Winner = false
            }
        }
        match = current
    }

    func setLD10Winner(playerId: UUID, isWinner: Bool) {
        guard var current = match else { return }
        for index in current.pendingEntries.indices {
            current.pendingEntries[index].flags.ld10Winner =
                isWinner && current.pendingEntries[index].playerId == playerId
        }
        match = current
    }

    func reset() {
        match = nil
        UserDefaults.standard.removeObject(forKey: persistenceKey)
    }

    func save() {
        guard let match else {
            UserDefaults.standard.removeObject(forKey: persistenceKey)
            return
        }
        do {
            let data = try JSONEncoder().encode(match)
            UserDefaults.standard.set(data, forKey: persistenceKey)
        } catch {
            alertMessage = "Could not save match: \(error.localizedDescription)"
        }
    }

    static var samplePlayers: [Player] {
        [
            Player(name: "Player 1", handicapIndex: 6.0, team: .red, tee: .blueGreen),
            Player(name: "Player 2", handicapIndex: 10.0, team: .blue, tee: .blueGreen),
            Player(name: "Player 3", handicapIndex: 12.0, team: .red, tee: .greenSilver),
            Player(name: "Player 4", handicapIndex: 15.0, team: .blue, tee: .greenSilver),
        ]
    }

    private static func loadSavedMatch(key: String) -> MatchState? {
        guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(MatchState.self, from: data)
    }
}

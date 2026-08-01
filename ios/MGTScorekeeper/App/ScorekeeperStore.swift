import Foundation

@MainActor
final class ScorekeeperStore: ObservableObject {
    @Published var match: MatchState? {
        didSet { saveActiveMatch() }
    }
    @Published private(set) var history: [MatchState]
    @Published var alertMessage: String?
    @Published var feedbackMessage: String?

    let course = Course.millbrook
    static let activeMatchKey = "mgt-scorekeeper.active-match"
    static let historyKey = "mgt-scorekeeper.match-history"
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        match = Self.loadSavedMatch(defaults: defaults, key: Self.activeMatchKey)
        history = Self.loadHistory(defaults: defaults, key: Self.historyKey)

        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-settlement-preview") {
            match = Self.makeSettlementPreviewMatch(course: course)
            history = []
        }
        #endif
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
        if match?.isComplete == true {
            archiveAndReset()
            return
        }
        match = nil
    }

    func archiveAndReset() {
        guard let current = match else { return }
        if !current.records.isEmpty {
            history.removeAll { $0.id == current.id }
            history.insert(current, at: 0)
            saveHistory()
        }
        match = nil
    }

    private func saveActiveMatch() {
        guard let match else {
            defaults.removeObject(forKey: Self.activeMatchKey)
            return
        }
        do {
            let data = try JSONEncoder().encode(match)
            defaults.set(data, forKey: Self.activeMatchKey)
        } catch {
            alertMessage = "Could not save match: \(error.localizedDescription)"
        }
    }

    private func saveHistory() {
        do {
            defaults.set(try JSONEncoder().encode(history), forKey: Self.historyKey)
        } catch {
            alertMessage = "Could not save match history: \(error.localizedDescription)"
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

    private static func loadSavedMatch(defaults: UserDefaults, key: String) -> MatchState? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(MatchState.self, from: data)
    }

    private static func loadHistory(defaults: UserDefaults, key: String) -> [MatchState] {
        guard let data = defaults.data(forKey: key) else { return [] }
        return (try? JSONDecoder().decode([MatchState].self, from: data)) ?? []
    }

    #if DEBUG
    private static func makeSettlementPreviewMatch(course: Course) -> MatchState {
        let players = [
            Player(name: "James Heffernan", handicapIndex: 6, team: .red, tee: .blueGreen),
            Player(name: "Doug Reilly", handicapIndex: 10, team: .blue, tee: .blueGreen),
            Player(name: "Pat Mahoney", handicapIndex: 12, team: .red, tee: .greenSilver),
            Player(name: "Mike Lin", handicapIndex: 15, team: .blue, tee: .greenSilver),
        ]
        var preview = MatchState.new(players: players, bigGameEnabled: true, course: course)
        let scoreOffsets = [
            [-1, 1, 1, 0],
            [0, -1, 1, 1],
            [1, 0, -1, 1],
            [0, 1, 0, -1],
            [-1, 0, 1, 0],
            [1, 1, 0, 0],
        ]

        for hole in 1...Rulebook.holeCount {
            let offsets = scoreOffsets[(hole - 1) % scoreOffsets.count]
            preview.pendingEntries = zip(preview.players, offsets).map { player, offset in
                let par = course.hole(hole).teeBox(for: player.tee).par
                var flags = JunkFlags()
                if (hole == 4 || hole == 13), player.team == .red {
                    flags.hadBunkerShot = true
                }
                if Rulebook.parThreeGreenieHoles.contains(hole), player.name == "Doug Reilly" {
                    flags.onGreenFromTee = true
                }
                return HoleEntry(playerId: player.id, gross: max(2, par + offset), flags: flags)
            }
            if hole == 12 {
                preview.doubles += 1
                preview.doubleUsedThisHole = true
            }
            _ = try? ScoringEngine.scoreCurrentHole(match: &preview, course: course)
        }

        return preview
    }
    #endif
}

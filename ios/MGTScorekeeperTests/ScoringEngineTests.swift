import XCTest
@testable import MGTScorekeeper

final class ScoringEngineTests: XCTestCase {
    private let course = Course.millbrook

    func testBaseProgressionAndDoubleEligibilityFollowRulebook() {
        XCTAssertEqual(ScoringEngine.baseForHole(1, doubles: 3), 1)
        XCTAssertEqual(ScoringEngine.baseForHole(2, doubles: 3), 2)
        XCTAssertEqual(ScoringEngine.baseForHole(3, doubles: 0), 2)
        XCTAssertEqual(ScoringEngine.baseForHole(3, doubles: 1), 4)
        XCTAssertEqual(ScoringEngine.baseForHole(18, doubles: 2), 8)

        XCTAssertFalse(
            ScoringEngine.canCallDouble(
                team: .blue,
                hole: 2,
                teamBalance: 4,
                doubleUsedThisHole: false
            )
        )
        XCTAssertTrue(
            ScoringEngine.canCallDouble(
                team: .blue,
                hole: 3,
                teamBalance: 4,
                doubleUsedThisHole: false
            )
        )
        XCTAssertFalse(
            ScoringEngine.canCallDouble(
                team: .red,
                hole: 3,
                teamBalance: 4,
                doubleUsedThisHole: false
            )
        )
        XCTAssertFalse(
            ScoringEngine.canCallDouble(
                team: .blue,
                hole: 3,
                teamBalance: 0,
                doubleUsedThisHole: false
            )
        )
    }

    func testStrokeAllocationUsesLowIndexAndPlayerTeeStrokeIndexes() {
        let players = makePlayers(indexes: [6, 10, 12, 15])
        let matrix = ScoringEngine.allocateStrokes(players: players, course: course)

        XCTAssertEqual(matrix[0].reduce(0, +), 0)
        XCTAssertEqual(matrix[1].reduce(0, +), 4)
        XCTAssertEqual(matrix[2].reduce(0, +), 6)
        XCTAssertEqual(matrix[3].reduce(0, +), 9)

        XCTAssertEqual(matrix[1][7], 1, "Blue/Green SI 1 is hole 8")
        XCTAssertEqual(matrix[1][14], 1, "Blue/Green SI 2 is hole 15")
        XCTAssertEqual(matrix[1][4], 1, "Blue/Green SI 3 is hole 5")
        XCTAssertEqual(matrix[1][12], 1, "Blue/Green SI 4 is hole 13")
    }

    func testPickupRecordsNetDoubleBogey() throws {
        var match = makeMatch(indexes: [0, 0, 0, 0])
        match.pendingEntries = entries(match.players, gross: [5, 5, 5, 5])
        match.pendingEntries[1].pickedUp = true

        let record = try ScoringEngine.scoreCurrentHole(match: &match, course: course)
        let pickedUp = try XCTUnwrap(record.playerResults.first { $0.playerId == match.players[1].id })

        XCTAssertEqual(pickedUp.net, 7)
        XCTAssertEqual(pickedUp.par, 5)
    }

    func testPushCarryThenWinPaysCarryBaseAndWinBonus() throws {
        var match = makeMatch(indexes: [0, 0, 0, 0])

        match.pendingEntries = entries(match.players, gross: [5, 5, 5, 5])
        _ = try ScoringEngine.scoreCurrentHole(match: &match, course: course)
        XCTAssertEqual(match.carry, 1)

        match.pendingEntries = entries(match.players, gross: [3, 3, 3, 3])
        _ = try ScoringEngine.scoreCurrentHole(match: &match, course: course)
        XCTAssertEqual(match.carry, 3)

        match.pendingEntries = entries(match.players, gross: [5, 6, 5, 6])
        let holeThree = try ScoringEngine.scoreCurrentHole(match: &match, course: course)

        XCTAssertEqual(holeThree.winner, .red)
        XCTAssertEqual(holeThree.sidePayout, 7)
        XCTAssertEqual(match.carry, 0)
        XCTAssertEqual(match.teamBalance, 7)
    }

    func testBirdiePaysEachTimeThePlayerMakesGrossBirdie() throws {
        var match = makeMatch(indexes: [0, 0, 0, 0])

        match.pendingEntries = entries(match.players, gross: [4, 5, 5, 5])
        let first = try ScoringEngine.scoreCurrentHole(match: &match, course: course)

        match.pendingEntries = entries(match.players, gross: [2, 3, 3, 3])
        let second = try ScoringEngine.scoreCurrentHole(match: &match, course: course)

        let firstBirdies = first.junkEvents.filter { $0.playerId == match.players[0].id && $0.type == .birdie }
        let secondBirdies = second.junkEvents.filter { $0.playerId == match.players[0].id && $0.type == .birdie }
        XCTAssertEqual(firstBirdies.count, 1)
        XCTAssertEqual(secondBirdies.count, 1)
    }

    func testGreenieCarriesAndThenPaysAccumulatedPool() throws {
        var match = makeMatch(indexes: [0, 0, 0, 0])
        match.currentHole = 2
        match.pendingEntries = entries(match.players, gross: [3, 3, 3, 3])

        let holeTwo = try ScoringEngine.scoreCurrentHole(match: &match, course: course)
        XCTAssertTrue(holeTwo.junkEvents.isEmpty)
        XCTAssertEqual(match.greenieCarry, 2)

        match.currentHole = 7
        match.pendingEntries = entries(match.players, gross: [3, 3, 3, 3])
        match.pendingEntries[0].flags.onGreenFromTee = true

        let holeSeven = try ScoringEngine.scoreCurrentHole(match: &match, course: course)
        let greenie = try XCTUnwrap(holeSeven.junkEvents.first { $0.type == .greenie })
        XCTAssertEqual(greenie.value, 4)
        XCTAssertEqual(greenie.deltaForPlayersTeam, 4)
        XCTAssertEqual(match.greenieCarry, 0)
    }

    func testGreeniePenaltyChargesCandidateAndCarriesPool() throws {
        var match = makeMatch(indexes: [0, 0, 0, 0])
        match.currentHole = 2
        match.pendingEntries = entries(match.players, gross: [3, 3, 3, 3])
        match.pendingEntries[0].flags.onGreenFromTee = true
        match.pendingEntries[0].flags.threePutts = true

        let record = try ScoringEngine.scoreCurrentHole(match: &match, course: course)
        let penalty = try XCTUnwrap(record.junkEvents.first { $0.type == .greeniePenalty })

        XCTAssertEqual(penalty.deltaForPlayersTeam, -2)
        XCTAssertEqual(match.greenieCarry, 2)
        XCTAssertEqual(match.teamBalance, -2)
    }

    func testBigGameUsesTwoBestNetScores() throws {
        var match = makeMatch(indexes: [0, 0, 0, 0], bigGame: true)
        match.pendingEntries = entries(match.players, gross: [5, 6, 4, 7])

        let record = try ScoringEngine.scoreCurrentHole(match: &match, course: course)
        let bigGame = try XCTUnwrap(record.bigGame)

        XCTAssertEqual(bigGame.bestNet, [4, 5])
        XCTAssertEqual(bigGame.subtotal, 9)
        XCTAssertEqual(bigGame.contributors, [match.players[2].name, match.players[0].name])
        XCTAssertEqual(match.bigGameTotal, 9)
    }

    func testLD10OnlyPaysWhenAcceptedOnSeventeen() throws {
        var match = makeMatch(indexes: [0, 0, 0, 0])
        match.currentHole = 17
        match.ld10Accepted = true
        match.pendingEntries = entries(match.players, gross: [4, 4, 4, 4])
        match.pendingEntries[1].flags.ld10Winner = true

        let record = try ScoringEngine.scoreCurrentHole(match: &match, course: course)
        let ld10 = try XCTUnwrap(record.junkEvents.first { $0.type == .ld10 })

        XCTAssertEqual(ld10.value, 10)
        XCTAssertEqual(ld10.team, .blue)
        XCTAssertEqual(match.teamBalance, -10)
    }

    func testSettlementAnalyticsDeriveMovementSwingsAndPartnerValueFromSavedRecords() {
        var match = makeMatch(indexes: [0, 0, 0, 0])
        match.records = [
            record(
                hole: 1,
                nets: [4, 6, 6, 5],
                winner: .red,
                sideDelta: 2,
                junkDelta: 1,
                balanceAfter: 3
            ),
            record(
                hole: 2,
                nets: [3, 2, 3, 3],
                winner: .blue,
                sideDelta: -4,
                junkDelta: -2,
                balanceAfter: -3
            ),
            record(
                hole: 3,
                nets: [6, 5, 4, 6],
                winner: .red,
                sideDelta: 4,
                junkDelta: 2,
                balanceAfter: 3
            ),
        ]
        match.teamBalance = 3

        let analytics = ScoringEngine.settlementAnalytics(for: match)

        XCTAssertEqual(analytics.moneyMovement.map(\.balance), [3, -3, 3])
        XCTAssertEqual(analytics.biggestSwings.map(\.hole), [2, 3, 1])
        XCTAssertEqual(analytics.biggestSwings.map(\.delta), [-6, 6, 3])

        let values = Dictionary(uniqueKeysWithValues: analytics.playerValues.map { ($0.name, $0) })
        XCTAssertEqual(values["Red One"]?.partnerMargin, 2)
        XCTAssertEqual(values["Red One"]?.countingHoles, 2)
        XCTAssertEqual(values["Red One"]?.biggestGapHoles, [1])
        XCTAssertEqual(values["Red Two"]?.partnerMargin, 2)
        XCTAssertEqual(values["Blue One"]?.partnerMargin, 2)
        XCTAssertEqual(values["Blue Two"]?.partnerMargin, 1)
    }

    func testSettlementAnalyticsDoNotInventMostValuablePlayerWhenPartnersAlwaysTie() {
        var match = makeMatch(indexes: [0, 0, 0, 0], bigGame: true)
        match.records = [
            record(
                hole: 1,
                nets: [4, 4, 4, 4],
                winner: .push,
                sideDelta: 0,
                junkDelta: 0,
                balanceAfter: 0
            ),
        ]

        let analytics = ScoringEngine.settlementAnalytics(for: match)

        XCTAssertNil(analytics.mostValuable)
        XCTAssertTrue(analytics.playerValues.allSatisfy { $0.partnerMargin == 0 })
        XCTAssertTrue(analytics.playerValues.allSatisfy { $0.countingHoles == 1 })
    }

    @MainActor
    func testStoreLoadsLegacyActiveMatchAndArchivesItBeforeNewRound() throws {
        let suiteName = "MGTScorekeeperTests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defer { defaults.removePersistentDomain(forName: suiteName) }

        var completed = makeMatch(indexes: [0, 0, 0, 0])
        completed.records = (1...Rulebook.holeCount).map {
            record(
                hole: $0,
                nets: [4, 5, 5, 6],
                winner: .red,
                sideDelta: 2,
                junkDelta: 0,
                balanceAfter: $0 * 2
            )
        }
        completed.teamBalance = 36
        defaults.set(try JSONEncoder().encode(completed), forKey: ScorekeeperStore.activeMatchKey)

        let store = ScorekeeperStore(defaults: defaults)
        XCTAssertEqual(store.match?.id, completed.id, "The TestFlight-era active match must still decode")

        store.archiveAndReset()

        XCTAssertNil(store.match)
        XCTAssertEqual(store.history.map(\.id), [completed.id])

        let relaunchedStore = ScorekeeperStore(defaults: defaults)
        XCTAssertNil(relaunchedStore.match)
        XCTAssertEqual(relaunchedStore.history.map(\.id), [completed.id])
    }

    private func makePlayers(indexes: [Double]) -> [Player] {
        [
            Player(id: UUID(uuidString: "00000000-0000-0000-0000-000000000001")!, name: "Red One", handicapIndex: indexes[0], team: .red, tee: .blueGreen),
            Player(id: UUID(uuidString: "00000000-0000-0000-0000-000000000002")!, name: "Blue One", handicapIndex: indexes[1], team: .blue, tee: .blueGreen),
            Player(id: UUID(uuidString: "00000000-0000-0000-0000-000000000003")!, name: "Red Two", handicapIndex: indexes[2], team: .red, tee: .greenSilver),
            Player(id: UUID(uuidString: "00000000-0000-0000-0000-000000000004")!, name: "Blue Two", handicapIndex: indexes[3], team: .blue, tee: .greenSilver),
        ]
    }

    private func makeMatch(indexes: [Double], bigGame: Bool = false) -> MatchState {
        MatchState.new(players: makePlayers(indexes: indexes), bigGameEnabled: bigGame, course: course)
    }

    private func entries(_ players: [Player], gross: [Int]) -> [HoleEntry] {
        zip(players, gross).map { player, score in
            HoleEntry(playerId: player.id, gross: score)
        }
    }

    private func record(
        hole: Int,
        nets: [Int],
        winner: HoleWinner,
        sideDelta: Int,
        junkDelta: Int,
        balanceAfter: Int
    ) -> HoleRecord {
        let players = makePlayers(indexes: [0, 0, 0, 0])
        let results = zip(players, nets).map { player, net in
            PlayerHoleResult(
                playerId: player.id,
                playerName: player.name,
                team: player.team,
                gross: net,
                strokes: 0,
                net: net,
                par: 4,
                pickedUp: false,
                flags: JunkFlags()
            )
        }

        return HoleRecord(
            hole: hole,
            base: 2,
            carryIn: 0,
            carryOut: 0,
            doublesInEffect: 0,
            winner: winner,
            sidePayout: abs(sideDelta),
            sideDelta: sideDelta,
            junkEvents: [],
            junkDelta: junkDelta,
            greenieCarryIn: 0,
            greenieCarryOut: 0,
            doubleWasCalled: false,
            ld10Accepted: false,
            playerResults: results,
            bigGame: nil,
            teamBalanceAfter: balanceAfter
        )
    }
}

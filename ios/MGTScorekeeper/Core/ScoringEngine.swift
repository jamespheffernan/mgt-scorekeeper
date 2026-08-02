import Foundation

enum ScoringError: LocalizedError, Equatable {
    case fourPlayersRequired
    case teamCompositionRequired
    case holeAlreadyComplete
    case missingEntry(String)
    case invalidHole(Int)
    case bigGameRequiresFourScores

    var errorDescription: String? {
        switch self {
        case .fourPlayersRequired:
            "A Millbrook match requires exactly four players."
        case .teamCompositionRequired:
            "Assign exactly two players to Red and two players to Blue."
        case .holeAlreadyComplete:
            "This round is already complete."
        case .missingEntry(let name):
            "Missing score entry for \(name)."
        case .invalidHole(let hole):
            "Invalid hole \(hole)."
        case .bigGameRequiresFourScores:
            "Big Game scoring requires four net scores for the foursome."
        }
    }
}

struct MoneyMovementPoint: Identifiable, Equatable {
    let hole: Int
    let balance: Int
    let delta: Int
    let winner: HoleWinner

    var id: Int { hole }
}

struct SettlementSwing: Identifiable, Equatable {
    let hole: Int
    let delta: Int
    let winner: HoleWinner
    let sideDelta: Int
    let junkDelta: Int
    let carryIn: Int
    let doubleWasCalled: Bool
    let countingPlayerName: String?
    let countingNet: Int?

    var id: Int { hole }
}

struct PlayerValue: Identifiable, Equatable {
    let playerId: UUID
    let name: String
    let team: Team
    let partnerMargin: Int
    let countingHoles: Int
    let biggestGapHoles: [Int]

    var id: UUID { playerId }
}

struct SettlementAnalytics: Equatable {
    let moneyMovement: [MoneyMovementPoint]
    let biggestSwings: [SettlementSwing]
    let playerValues: [PlayerValue]

    var mostValuable: PlayerValue? { playerValues.first(where: { $0.partnerMargin > 0 }) }
}

enum ScoringEngine {
    static func repairHoleSixPar(in match: MatchState, course: Course) -> MatchState {
        var repaired = match
        var runningBalanceAdjustment = 0

        for recordIndex in repaired.records.indices {
            repaired.records[recordIndex].teamBalanceAfter += runningBalanceAdjustment
            guard repaired.records[recordIndex].hole == 6 else { continue }

            let oldJunkDelta = repaired.records[recordIndex].junkDelta
            for resultIndex in repaired.records[recordIndex].playerResults.indices {
                let result = repaired.records[recordIndex].playerResults[resultIndex]
                guard let player = repaired.players.first(where: { $0.id == result.playerId }) else { continue }

                let correctedPar = course.hole(6).teeBox(for: player.tee).par
                repaired.records[recordIndex].playerResults[resultIndex].par = correctedPar

                let alreadyHasBirdie = repaired.records[recordIndex].junkEvents.contains {
                    $0.playerId == result.playerId && $0.type == .birdie
                }
                guard !result.pickedUp, result.gross < correctedPar, !alreadyHasBirdie else { continue }

                repaired.records[recordIndex].junkEvents.append(
                    junkEvent(
                        score: repaired.records[recordIndex].playerResults[resultIndex],
                        hole: 6,
                        type: .birdie,
                        value: repaired.records[recordIndex].base,
                        delta: repaired.records[recordIndex].base
                    )
                )
            }

            let correctedJunkDelta = repaired.records[recordIndex].junkEvents.reduce(0) { partial, event in
                partial + deltaForRed(team: event.team, amount: event.deltaForPlayersTeam)
            }
            let adjustment = correctedJunkDelta - oldJunkDelta
            repaired.records[recordIndex].junkDelta = correctedJunkDelta
            repaired.records[recordIndex].teamBalanceAfter += adjustment
            runningBalanceAdjustment += adjustment
        }

        repaired.teamBalance += runningBalanceAdjustment
        return repaired
    }

    static func settlementAnalytics(for match: MatchState) -> SettlementAnalytics {
        var previousBalance = 0
        let movement = match.records.map { record in
            let point = MoneyMovementPoint(
                hole: record.hole,
                balance: record.teamBalanceAfter,
                delta: record.teamBalanceAfter - previousBalance,
                winner: record.winner
            )
            previousBalance = record.teamBalanceAfter
            return point
        }

        let swings = zip(match.records, movement)
            .map { record, point in
                let countingResult = record.winner.team.flatMap { winningTeam in
                    record.playerResults
                        .filter { $0.team == winningTeam }
                        .min { lhs, rhs in
                            if lhs.net != rhs.net { return lhs.net < rhs.net }
                            return lhs.playerName < rhs.playerName
                        }
                }
                return SettlementSwing(
                    hole: record.hole,
                    delta: point.delta,
                    winner: record.winner,
                    sideDelta: record.sideDelta,
                    junkDelta: record.junkDelta,
                    carryIn: record.carryIn,
                    doubleWasCalled: record.doubleWasCalled,
                    countingPlayerName: countingResult?.playerName,
                    countingNet: countingResult?.net
                )
            }
            .filter { $0.delta != 0 }
            .sorted { lhs, rhs in
                if abs(lhs.delta) != abs(rhs.delta) { return abs(lhs.delta) > abs(rhs.delta) }
                return lhs.hole < rhs.hole
            }

        struct MutablePlayerValue {
            let player: Player
            var partnerMargin = 0
            var countingHoles = 0
            var gaps: [(hole: Int, margin: Int)] = []
        }

        var values = Dictionary(
            uniqueKeysWithValues: match.players.map { ($0.id, MutablePlayerValue(player: $0)) }
        )

        for record in match.records {
            for team in Team.allCases {
                let teammates = record.playerResults.filter { $0.team == team }
                guard teammates.count == 2, let bestNet = teammates.map(\.net).min() else { continue }

                let countingResults = teammates.filter { $0.net == bestNet }
                for result in countingResults {
                    values[result.playerId]?.countingHoles += 1
                }

                guard countingResults.count == 1,
                      let counting = countingResults.first,
                      let partner = teammates.first(where: { $0.playerId != counting.playerId }) else { continue }

                let margin = max(0, partner.net - counting.net)
                guard margin > 0 else { continue }
                values[counting.playerId]?.partnerMargin += margin
                values[counting.playerId]?.gaps.append((record.hole, margin))
            }
        }

        let playerOrder = Dictionary(uniqueKeysWithValues: match.players.enumerated().map { ($0.element.id, $0.offset) })
        let playerValues = values.values
            .map { value in
                PlayerValue(
                    playerId: value.player.id,
                    name: value.player.name,
                    team: value.player.team,
                    partnerMargin: value.partnerMargin,
                    countingHoles: value.countingHoles,
                    biggestGapHoles: value.gaps
                        .sorted { lhs, rhs in
                            if lhs.margin != rhs.margin { return lhs.margin > rhs.margin }
                            return lhs.hole < rhs.hole
                        }
                        .prefix(2)
                        .map(\.hole)
                )
            }
            .sorted { lhs, rhs in
                if lhs.partnerMargin != rhs.partnerMargin { return lhs.partnerMargin > rhs.partnerMargin }
                if lhs.countingHoles != rhs.countingHoles { return lhs.countingHoles > rhs.countingHoles }
                return playerOrder[lhs.playerId, default: 0] < playerOrder[rhs.playerId, default: 0]
            }

        return SettlementAnalytics(
            moneyMovement: movement,
            biggestSwings: Array(swings.prefix(3)),
            playerValues: playerValues
        )
    }

    static func validatePlayers(_ players: [Player]) throws {
        guard players.count == 4 else { throw ScoringError.fourPlayersRequired }
        guard players.filter({ $0.team == .red }).count == 2,
              players.filter({ $0.team == .blue }).count == 2 else {
            throw ScoringError.teamCompositionRequired
        }
    }

    static func baseForHole(_ hole: Int, doubles: Int) -> Int {
        if hole == 1 { return Rulebook.holeOneBase }
        if hole == 2 { return Rulebook.holeTwoPlusBase }
        return Rulebook.holeTwoPlusBase * Int(pow(2.0, Double(doubles)))
    }

    static func leadingTeam(for teamBalance: Int) -> Team? {
        if teamBalance > 0 { return .red }
        if teamBalance < 0 { return .blue }
        return nil
    }

    static func canCallDouble(
        team: Team,
        hole: Int,
        teamBalance: Int,
        doubleUsedThisHole: Bool
    ) -> Bool {
        guard hole >= 3, !doubleUsedThisHole else { return false }
        guard let leader = leadingTeam(for: teamBalance) else { return false }
        return leader != team
    }

    static func defaultEntries(for players: [Player], hole: Int, course: Course) -> [HoleEntry] {
        players.map { player in
            let par = course.hole(hole).teeBox(for: player.tee).par
            return HoleEntry(playerId: player.id, gross: par)
        }
    }

    static func allocateStrokes(
        players: [Player],
        course: Course,
        baseIndex: Double? = nil
    ) -> [[Int]] {
        let baseline = baseIndex ?? players.map(\.handicapIndex).min() ?? 0
        return players.map { player in
            let total = max(0, Int(floor(player.handicapIndex - baseline)))
            let order = course.strokeIndexes(for: player.tee)
                .enumerated()
                .sorted { lhs, rhs in lhs.element < rhs.element }
                .map(\.offset)
            var allocation = Array(repeating: 0, count: Rulebook.holeCount)
            guard total > 0 else { return allocation }
            for stroke in 0..<total {
                allocation[order[stroke % Rulebook.holeCount]] += 1
            }
            return allocation
        }
    }

    static func scoreCurrentHole(match: inout MatchState, course: Course) throws -> HoleRecord {
        try validatePlayers(match.players)
        guard !match.isComplete else { throw ScoringError.holeAlreadyComplete }
        guard (1...Rulebook.holeCount).contains(match.currentHole) else {
            throw ScoringError.invalidHole(match.currentHole)
        }

        let holeNumber = match.currentHole
        let hole = course.hole(holeNumber)
        let base = baseForHole(holeNumber, doubles: match.doubles)
        let strokes = allocateStrokes(players: match.players, course: course)
        let playerResults = try buildPlayerResults(
            players: match.players,
            entries: match.pendingEntries,
            strokes: strokes,
            hole: hole,
            holeIndex: holeNumber - 1
        )

        let winner = determineWinner(playerResults)
        let side = holePayout(winner: winner, base: base, carryIn: match.carry)
        let sideDelta = deltaForRed(team: winner.team, amount: side.payout)

        let junk = evaluateJunk(
            hole: holeNumber,
            base: base,
            scores: playerResults,
            greenieCarryIn: match.greenieCarry,
            ld10Accepted: match.ld10Accepted
        )
        let junkDelta = junk.events.reduce(0) { partial, event in
            partial + deltaForRed(team: event.team, amount: event.deltaForPlayersTeam)
        }

        let bigGame: BigGameRow?
        if match.bigGameEnabled {
            bigGame = try bigGameRow(hole: holeNumber, scores: playerResults)
        } else {
            bigGame = nil
        }

        let balanceAfter = match.teamBalance + sideDelta + junkDelta
        let record = HoleRecord(
            hole: holeNumber,
            base: base,
            carryIn: match.carry,
            carryOut: side.carryOut,
            doublesInEffect: match.doubles,
            winner: winner,
            sidePayout: side.payout,
            sideDelta: sideDelta,
            junkEvents: junk.events,
            junkDelta: junkDelta,
            greenieCarryIn: match.greenieCarry,
            greenieCarryOut: junk.greenieCarryOut,
            doubleWasCalled: match.doubleUsedThisHole,
            ld10Accepted: match.ld10Accepted,
            playerResults: playerResults,
            bigGame: bigGame,
            teamBalanceAfter: balanceAfter
        )

        match.records.append(record)
        match.teamBalance = balanceAfter
        match.carry = side.carryOut
        match.greenieCarry = junk.greenieCarryOut
        match.doubleUsedThisHole = false
        match.ld10Accepted = false
        if holeNumber < Rulebook.holeCount {
            match.currentHole = holeNumber + 1
            match.pendingEntries = defaultEntries(
                for: match.players,
                hole: match.currentHole,
                course: course
            )
        }

        return record
    }

    static func buildPlayerResults(
        players: [Player],
        entries: [HoleEntry],
        strokes: [[Int]],
        hole: CourseHole,
        holeIndex: Int
    ) throws -> [PlayerHoleResult] {
        try players.enumerated().map { index, player in
            guard let entry = entries.first(where: { $0.playerId == player.id }) else {
                throw ScoringError.missingEntry(player.name)
            }
            let teeBox = hole.teeBox(for: player.tee)
            let receivedStrokes = strokes[index][holeIndex]
            let net = entry.pickedUp
                ? teeBox.par + Rulebook.pickupNetOverPar
                : max(1, entry.gross - receivedStrokes)
            let gross = entry.pickedUp ? net + receivedStrokes : entry.gross
            return PlayerHoleResult(
                playerId: player.id,
                playerName: player.name,
                team: player.team,
                gross: gross,
                strokes: receivedStrokes,
                net: net,
                par: teeBox.par,
                pickedUp: entry.pickedUp,
                flags: entry.flags
            )
        }
    }

    static func determineWinner(_ scores: [PlayerHoleResult]) -> HoleWinner {
        let bestRed = scores
            .filter { $0.team == .red }
            .map(\.net)
            .min() ?? Int.max
        let bestBlue = scores
            .filter { $0.team == .blue }
            .map(\.net)
            .min() ?? Int.max

        if bestRed < bestBlue { return .red }
        if bestBlue < bestRed { return .blue }
        return .push
    }

    static func holePayout(winner: HoleWinner, base: Int, carryIn: Int) -> (payout: Int, carryOut: Int) {
        if winner == .push {
            return (0, carryIn + base)
        }
        return (carryIn + base + base, 0)
    }

    static func bigGameRow(hole: Int, scores: [PlayerHoleResult]) throws -> BigGameRow {
        guard scores.count == 4 else { throw ScoringError.bigGameRequiresFourScores }
        let sorted = scores.sorted { lhs, rhs in
            if lhs.net == rhs.net {
                return lhs.playerName < rhs.playerName
            }
            return lhs.net < rhs.net
        }
        let best = Array(sorted.prefix(2))
        return BigGameRow(
            hole: hole,
            bestNet: best.map(\.net),
            contributors: best.map(\.playerName),
            subtotal: best.reduce(0) { $0 + $1.net }
        )
    }

    static func settlementText(for match: MatchState) -> String {
        let amount = abs(match.teamBalance)
        if amount == 0 {
            return "The side match is tied. No side-match settlement is due."
        }
        let winning = match.teamBalance > 0 ? Team.red : Team.blue
        let losing = winning.opponent
        return "\(losing.rawValue) is down $\(amount). Each \(losing.rawValue) player pays $\(amount) to one \(winning.rawValue) player, as agreed by the teams."
    }

    private static func evaluateJunk(
        hole: Int,
        base: Int,
        scores: [PlayerHoleResult],
        greenieCarryIn: Int,
        ld10Accepted: Bool
    ) -> (events: [JunkEvent], greenieCarryOut: Int) {
        var events: [JunkEvent] = []
        var greenieCarryOut = greenieCarryIn

        if Rulebook.parThreeGreenieHoles.contains(hole) {
            let greenie = resolveGreenie(
                hole: hole,
                base: base,
                scores: scores,
                carryIn: greenieCarryIn
            )
            events.append(contentsOf: greenie.events)
            greenieCarryOut = greenie.carryOut
        }

        for score in scores where !score.pickedUp {
            if score.gross < score.par {
                events.append(
                    junkEvent(score: score, hole: hole, type: .birdie, value: base, delta: base)
                )
            }

            if score.flags.hadBunkerShot,
               !score.flags.onGreenFromTee,
               score.gross <= score.par {
                events.append(
                    junkEvent(score: score, hole: hole, type: .sandie, value: base, delta: base)
                )
            }
        }

        if ld10Accepted, hole == 17, let winner = scores.first(where: { $0.flags.ld10Winner }) {
            events.append(
                junkEvent(
                    score: winner,
                    hole: hole,
                    type: .ld10,
                    value: Rulebook.ld10Stake,
                    delta: Rulebook.ld10Stake
                )
            )
        }

        return (events, greenieCarryOut)
    }

    private static func resolveGreenie(
        hole: Int,
        base: Int,
        scores: [PlayerHoleResult],
        carryIn: Int
    ) -> (events: [JunkEvent], carryOut: Int) {
        let candidates = scores.filter { $0.flags.onGreenFromTee && !$0.pickedUp }
        guard candidates.count == 1 else {
            return ([], carryIn + base)
        }

        let candidate = candidates[0]
        if candidate.flags.threePutts {
            return (
                [junkEvent(score: candidate, hole: hole, type: .greeniePenalty, value: base, delta: -base)],
                carryIn + base
            )
        }

        guard candidate.gross <= candidate.par else {
            return ([], carryIn + base)
        }

        return (
            [junkEvent(score: candidate, hole: hole, type: .greenie, value: carryIn + base, delta: carryIn + base)],
            0
        )
    }

    private static func junkEvent(
        score: PlayerHoleResult,
        hole: Int,
        type: JunkType,
        value: Int,
        delta: Int
    ) -> JunkEvent {
        JunkEvent(
            hole: hole,
            playerId: score.playerId,
            playerName: score.playerName,
            team: score.team,
            type: type,
            value: value,
            deltaForPlayersTeam: delta
        )
    }

    private static func deltaForRed(team: Team?, amount: Int) -> Int {
        guard let team else { return 0 }
        return team == .red ? amount : -amount
    }
}

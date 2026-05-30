import Foundation

enum Team: String, Codable, CaseIterable, Identifiable {
    case red = "Red"
    case blue = "Blue"

    var id: String { rawValue }

    var opponent: Team {
        self == .red ? .blue : .red
    }
}

struct Player: Identifiable, Codable, Equatable {
    var id: UUID
    var name: String
    var handicapIndex: Double
    var team: Team
    var tee: Tee

    init(
        id: UUID = UUID(),
        name: String,
        handicapIndex: Double,
        team: Team,
        tee: Tee
    ) {
        self.id = id
        self.name = name
        self.handicapIndex = handicapIndex
        self.team = team
        self.tee = tee
    }
}

struct JunkFlags: Codable, Equatable {
    var hadBunkerShot = false
    var onGreenFromTee = false
    var threePutts = false
    var ld10Winner = false
}

struct HoleEntry: Identifiable, Codable, Equatable {
    var playerId: UUID
    var gross: Int
    var pickedUp: Bool
    var flags: JunkFlags

    var id: UUID { playerId }

    init(playerId: UUID, gross: Int, pickedUp: Bool = false, flags: JunkFlags = JunkFlags()) {
        self.playerId = playerId
        self.gross = gross
        self.pickedUp = pickedUp
        self.flags = flags
    }
}

struct PlayerHoleResult: Identifiable, Codable, Equatable {
    var playerId: UUID
    var playerName: String
    var team: Team
    var gross: Int
    var strokes: Int
    var net: Int
    var par: Int
    var pickedUp: Bool
    var flags: JunkFlags

    var id: UUID { playerId }
}

enum HoleWinner: String, Codable, Equatable {
    case red = "Red"
    case blue = "Blue"
    case push = "Push"

    var team: Team? {
        switch self {
        case .red: .red
        case .blue: .blue
        case .push: nil
        }
    }
}

enum JunkType: String, Codable, CaseIterable {
    case birdie = "Birdie"
    case sandie = "Sandie"
    case greenie = "Greenie"
    case greeniePenalty = "Greenie Penalty"
    case ld10 = "LD10"
}

struct JunkEvent: Identifiable, Codable, Equatable {
    var id = UUID()
    var hole: Int
    var playerId: UUID
    var playerName: String
    var team: Team
    var type: JunkType
    var value: Int
    var deltaForPlayersTeam: Int

    var signedDescription: String {
        let sign = deltaForPlayersTeam >= 0 ? "+" : "-"
        return "\(playerName) \(type.rawValue) \(sign)$\(abs(deltaForPlayersTeam))"
    }
}

struct BigGameRow: Identifiable, Codable, Equatable {
    var hole: Int
    var bestNet: [Int]
    var contributors: [String]
    var subtotal: Int

    var id: Int { hole }
}

struct HoleRecord: Identifiable, Codable, Equatable {
    var hole: Int
    var base: Int
    var carryIn: Int
    var carryOut: Int
    var doublesInEffect: Int
    var winner: HoleWinner
    var sidePayout: Int
    var sideDelta: Int
    var junkEvents: [JunkEvent]
    var junkDelta: Int
    var greenieCarryIn: Int
    var greenieCarryOut: Int
    var doubleWasCalled: Bool
    var ld10Accepted: Bool
    var playerResults: [PlayerHoleResult]
    var bigGame: BigGameRow?
    var teamBalanceAfter: Int

    var id: Int { hole }
}

struct MatchState: Codable, Equatable {
    var id = UUID()
    var createdAt = Date()
    var players: [Player]
    var bigGameEnabled: Bool
    var currentHole: Int
    var doubles: Int
    var carry: Int
    var doubleUsedThisHole: Bool
    var teamBalance: Int
    var greenieCarry: Int
    var ld10Accepted: Bool
    var records: [HoleRecord]
    var pendingEntries: [HoleEntry]

    var isComplete: Bool {
        records.count >= Rulebook.holeCount
    }

    var bigGameTotal: Int? {
        guard bigGameEnabled else { return nil }
        return records.compactMap(\.bigGame).reduce(0) { $0 + $1.subtotal }
    }

    static func new(players: [Player], bigGameEnabled: Bool, course: Course) -> MatchState {
        MatchState(
            players: players,
            bigGameEnabled: bigGameEnabled,
            currentHole: 1,
            doubles: 0,
            carry: 0,
            doubleUsedThisHole: false,
            teamBalance: 0,
            greenieCarry: 0,
            ld10Accepted: false,
            records: [],
            pendingEntries: ScoringEngine.defaultEntries(for: players, hole: 1, course: course)
        )
    }
}

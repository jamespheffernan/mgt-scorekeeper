import Foundation

enum Tee: String, Codable, CaseIterable, Identifiable {
    case whiteBlue = "White/Blue"
    case blueGreen = "Blue/Green"
    case greenSilver = "Green/Silver"
    case redGold = "Red/Gold"

    var id: String { rawValue }

    var shortName: String {
        switch self {
        case .whiteBlue: "White"
        case .blueGreen: "Blue"
        case .greenSilver: "Green"
        case .redGold: "Red"
        }
    }
}

struct TeeBox: Codable, Equatable {
    var distance: Int
    var par: Int
    var strokeIndex: Int
}

struct CourseHole: Identifiable, Codable, Equatable {
    var number: Int
    var teeBoxes: [Tee: TeeBox]

    var id: Int { number }

    func teeBox(for tee: Tee) -> TeeBox {
        guard let box = teeBoxes[tee] else {
            fatalError("Missing tee box \(tee.rawValue) on hole \(number)")
        }
        return box
    }
}

struct Course: Codable, Equatable {
    var name: String
    var holes: [CourseHole]

    func hole(_ number: Int) -> CourseHole {
        guard let hole = holes.first(where: { $0.number == number }) else {
            fatalError("Missing hole \(number)")
        }
        return hole
    }

    func strokeIndexes(for tee: Tee) -> [Int] {
        holes.map { $0.teeBox(for: tee).strokeIndex }
    }
}

extension Course {
    static let millbrook = Course(
        name: "Millbrook Golf & Tennis Club",
        holes: [
            CourseHole(number: 1, teeBoxes: [
                .whiteBlue: TeeBox(distance: 497, par: 5, strokeIndex: 7),
                .blueGreen: TeeBox(distance: 485, par: 5, strokeIndex: 7),
                .greenSilver: TeeBox(distance: 455, par: 5, strokeIndex: 7),
                .redGold: TeeBox(distance: 455, par: 5, strokeIndex: 3),
            ]),
            CourseHole(number: 2, teeBoxes: [
                .whiteBlue: TeeBox(distance: 190, par: 3, strokeIndex: 9),
                .blueGreen: TeeBox(distance: 190, par: 3, strokeIndex: 9),
                .greenSilver: TeeBox(distance: 177, par: 3, strokeIndex: 9),
                .redGold: TeeBox(distance: 139, par: 3, strokeIndex: 15),
            ]),
            CourseHole(number: 3, teeBoxes: [
                .whiteBlue: TeeBox(distance: 518, par: 5, strokeIndex: 5),
                .blueGreen: TeeBox(distance: 498, par: 5, strokeIndex: 5),
                .greenSilver: TeeBox(distance: 473, par: 5, strokeIndex: 5),
                .redGold: TeeBox(distance: 414, par: 5, strokeIndex: 5),
            ]),
            CourseHole(number: 4, teeBoxes: [
                .whiteBlue: TeeBox(distance: 289, par: 4, strokeIndex: 13),
                .blueGreen: TeeBox(distance: 320, par: 4, strokeIndex: 13),
                .greenSilver: TeeBox(distance: 218, par: 4, strokeIndex: 13),
                .redGold: TeeBox(distance: 218, par: 4, strokeIndex: 13),
            ]),
            CourseHole(number: 5, teeBoxes: [
                .whiteBlue: TeeBox(distance: 379, par: 4, strokeIndex: 3),
                .blueGreen: TeeBox(distance: 328, par: 4, strokeIndex: 3),
                .greenSilver: TeeBox(distance: 328, par: 4, strokeIndex: 3),
                .redGold: TeeBox(distance: 232, par: 4, strokeIndex: 11),
            ]),
            CourseHole(number: 6, teeBoxes: [
                .whiteBlue: TeeBox(distance: 441, par: 5, strokeIndex: 11),
                .blueGreen: TeeBox(distance: 389, par: 4, strokeIndex: 11),
                .greenSilver: TeeBox(distance: 325, par: 4, strokeIndex: 11),
                .redGold: TeeBox(distance: 389, par: 5, strokeIndex: 7),
            ]),
            CourseHole(number: 7, teeBoxes: [
                .whiteBlue: TeeBox(distance: 163, par: 3, strokeIndex: 17),
                .blueGreen: TeeBox(distance: 150, par: 3, strokeIndex: 17),
                .greenSilver: TeeBox(distance: 140, par: 3, strokeIndex: 17),
                .redGold: TeeBox(distance: 109, par: 3, strokeIndex: 17),
            ]),
            CourseHole(number: 8, teeBoxes: [
                .whiteBlue: TeeBox(distance: 386, par: 4, strokeIndex: 1),
                .blueGreen: TeeBox(distance: 343, par: 4, strokeIndex: 1),
                .greenSilver: TeeBox(distance: 291, par: 4, strokeIndex: 1),
                .redGold: TeeBox(distance: 291, par: 4, strokeIndex: 1),
            ]),
            CourseHole(number: 9, teeBoxes: [
                .whiteBlue: TeeBox(distance: 151, par: 3, strokeIndex: 15),
                .blueGreen: TeeBox(distance: 207, par: 3, strokeIndex: 15),
                .greenSilver: TeeBox(distance: 151, par: 3, strokeIndex: 15),
                .redGold: TeeBox(distance: 140, par: 3, strokeIndex: 9),
            ]),
            CourseHole(number: 10, teeBoxes: [
                .whiteBlue: TeeBox(distance: 485, par: 5, strokeIndex: 6),
                .blueGreen: TeeBox(distance: 455, par: 5, strokeIndex: 6),
                .greenSilver: TeeBox(distance: 455, par: 5, strokeIndex: 6),
                .redGold: TeeBox(distance: 485, par: 5, strokeIndex: 2),
            ]),
            CourseHole(number: 11, teeBoxes: [
                .whiteBlue: TeeBox(distance: 190, par: 3, strokeIndex: 12),
                .blueGreen: TeeBox(distance: 177, par: 3, strokeIndex: 12),
                .greenSilver: TeeBox(distance: 140, par: 3, strokeIndex: 12),
                .redGold: TeeBox(distance: 177, par: 3, strokeIndex: 10),
            ]),
            CourseHole(number: 12, teeBoxes: [
                .whiteBlue: TeeBox(distance: 498, par: 5, strokeIndex: 8),
                .blueGreen: TeeBox(distance: 473, par: 5, strokeIndex: 8),
                .greenSilver: TeeBox(distance: 414, par: 5, strokeIndex: 8),
                .redGold: TeeBox(distance: 296, par: 4, strokeIndex: 16),
            ]),
            CourseHole(number: 13, teeBoxes: [
                .whiteBlue: TeeBox(distance: 320, par: 4, strokeIndex: 4),
                .blueGreen: TeeBox(distance: 218, par: 4, strokeIndex: 4),
                .greenSilver: TeeBox(distance: 218, par: 4, strokeIndex: 4),
                .redGold: TeeBox(distance: 145, par: 3, strokeIndex: 18),
            ]),
            CourseHole(number: 14, teeBoxes: [
                .whiteBlue: TeeBox(distance: 328, par: 4, strokeIndex: 16),
                .blueGreen: TeeBox(distance: 328, par: 4, strokeIndex: 16),
                .greenSilver: TeeBox(distance: 228, par: 4, strokeIndex: 16),
                .redGold: TeeBox(distance: 328, par: 4, strokeIndex: 6),
            ]),
            CourseHole(number: 15, teeBoxes: [
                .whiteBlue: TeeBox(distance: 389, par: 4, strokeIndex: 2),
                .blueGreen: TeeBox(distance: 325, par: 4, strokeIndex: 2),
                .greenSilver: TeeBox(distance: 325, par: 4, strokeIndex: 2),
                .redGold: TeeBox(distance: 325, par: 5, strokeIndex: 4),
            ]),
            CourseHole(number: 16, teeBoxes: [
                .whiteBlue: TeeBox(distance: 150, par: 3, strokeIndex: 18),
                .blueGreen: TeeBox(distance: 140, par: 3, strokeIndex: 18),
                .greenSilver: TeeBox(distance: 125, par: 3, strokeIndex: 18),
                .redGold: TeeBox(distance: 140, par: 3, strokeIndex: 8),
            ]),
            CourseHole(number: 17, teeBoxes: [
                .whiteBlue: TeeBox(distance: 343, par: 4, strokeIndex: 14),
                .blueGreen: TeeBox(distance: 291, par: 4, strokeIndex: 14),
                .greenSilver: TeeBox(distance: 295, par: 4, strokeIndex: 14),
                .redGold: TeeBox(distance: 343, par: 5, strokeIndex: 14),
            ]),
            CourseHole(number: 18, teeBoxes: [
                .whiteBlue: TeeBox(distance: 207, par: 3, strokeIndex: 10),
                .blueGreen: TeeBox(distance: 151, par: 3, strokeIndex: 10),
                .greenSilver: TeeBox(distance: 190, par: 3, strokeIndex: 10),
                .redGold: TeeBox(distance: 207, par: 4, strokeIndex: 12),
            ]),
        ]
    )
}


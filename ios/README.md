# MGT Scorekeeper iOS

Native SwiftUI rebuild of the Millbrook scorekeeper.

The core scoring engine lives under `MGTScorekeeper/Core` and is covered by XCTest in
`MGTScorekeeperTests`. It implements the Millbrook rulebook from the repository root:

- low-index handicap stroke allocation
- side-match better-ball scoring
- base, carry, valid doubles, and win bonus
- birdies, sandies, greenies, greenie carry, greenie penalty, and LD10
- Big Game two-best-net totals
- settlement wording from the final running total

Generate the Xcode project:

```bash
cd ios
xcodegen generate
```

Build and test:

```bash
xcodebuild test -project MGTScorekeeper.xcodeproj -scheme MGTScorekeeper -destination 'platform=iOS Simulator,name=iPhone 17'
```


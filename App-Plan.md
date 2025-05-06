Meta-plan – how we'll organise all future work so AI agents don't choke on context limits

Layer	What it contains	Format / size rule	How we reference it
0. Index	One README that links to every artifact	≤ 1 KB	"📚 Index.md §"
1. Vision doc	Product vision, success metrics	≤ 2 KB	"Vision.md"
2. Requirements	Functional & non-functional requirements, user stories (numbered)	Split by feature family; each file ≤ 3 KB	"Req-F1.md" etc.
3. Domain model	ER/class diagrams & field lists	Mermaid + brief prose	"Model.md"
4. Algorithms spec	Plain-language formulas + edge-case tables	One algo per file, ≤ 2 KB	"Algo-Payout.md"
5. API & state contracts	TypeScript interfaces / JSON schemas	One module per file	"API-GameState.ts"
6. UI wireframes	Low-fidelity images or ASCII sketches + copy text	One screen per file	"UI-HoleView.png"
7. Implementation tasks	Fine-grained tickets (title, acceptance, est.)	CSV or Markdown task list; slice by milestone	"Tasks-M1.md"
8. Test specs	Unit & e2e cases referencing ticket IDs	One feature per file	"Test-F1.md"
9. DevOps	Build, deploy, infra notes	Separate short files	"DevOps-Hosting.md"
10. Changelogs	Versioned release notes	Append-only log	"CHANGELOG.md"

Working pattern
	1.	Chunk first: we write/iterate per layer file; each stays far below GPT context.
	2.	Reference, don't paste: when asking the agent to work, include only the needed file(s).
	3.	Single-source truth: edits always update the file in repo/Notion; we never rely on chat history alone.
	4.	Number everything: stories, algos, tasks—easy to cite without full text.
	5.	Automated summaries: after major edits, run AI to rewrite a 200-word synopsis stored in "_Summary.md"; use that in later prompts when detail is unnecessary.

Deliverable flow
	1.	Lock Vision →
	2.	Approve high-level Requirements list →
	3.	Flesh out Model & Algorithms →
	4.	Produce Wireframes & API contracts →
	5.	Generate Task backlog with estimates →
	6.	Sprint planning / build / test / deploy.



# Millbrook Game App Updated:

# 📚 Millbrook Scorekeeper – Documentation Index

(last updated 2025-04-29)

| Layer | File -- tap to jump |
| --- | --- |
| 0. Index | **(this page)** |
| 1. Vision | [Vision.md](http://vision.md/) |
| 2. Requirements | [Requirements.md](http://requirements.md/) |
| 3. Domain Model | [Model.md](http://model.md/) |
| 4. Algorithms | [Algo-Allocation.md](http://algo-allocation.md/) · [Algo-Base.md](http://algo-base.md/) · [Algo-Payout.md](http://algo-payout.md/) · [Algo-Junk.md](http://algo-junk.md/) |
| 5. API & State Contracts | API-GameState.ts · API-CalcEngine.ts |
| 6. UI Wireframes | UI-Setup.txt · UI-Hole.txt · UI-Ledger.txt |
| 7. Implementation Tasks | [Tasks-M1.md](http://tasks-m1.md/) · [Tasks-M2.md](http://tasks-m2.md/) |
| 8. Test Specs | [Test-CalcEngine.md](http://test-calcengine.md/) · [Test-E2E.md](http://test-e2e.md/) · [Test-LiveSync.md](http://test-livesync.md/) |
| 9. DevOps / Infra | [DevOps-Hosting.md](http://devops-hosting.md/) |
| 10. Changelog | [CHANGELOG.md](http://changelog.md/) |

*All files are plain-text Markdown or TypeScript snippets-sized ≤ 3 KB to stay safely within AI context limits. Add or rename rows only through this index so cross-references never break.*

# Vision – Millbrook Game & Big Game Scorekeeper

(last updated 2025-04-29)

## Purpose

Make it effortless to run BOTH wagering formats the foursome plays:

- **Millbrook Game** side-match (Red vs Blue teams, junk, doubles, etc.).
- Optional **Big Game** tally of the two best net scores per hole for the foursome.

## Product story

> "I log scores once per hole and the app instantly updates our Millbrook ledger and shows our Big Game running total – no arguments, no spreadsheets."
> 

## Success metrics (v1.0)

| Metric | Target |
| --- | --- |
| Rounds fully scored (side + Big Game) | ≥ 50 in first 3 months |
| Avg. input time per hole | ≤ 10 s |
| Calculation errors reported | 0 |
| Users rating 4★ or 5★ | ≥ 80 % |

## MVP scope

- Full Millbrook Game engine (handicaps, doubles, junk, payouts).
- **Big Game toggle** – captures two-best-net each hole, computes 18-hole total.
    - Output: a simple number the foursome can text to the commissioner.
    - No cross-group sync yet.

## Out of scope (v1.0)

- Automatic purse settlement across multiple foursomes.
- Multi-currency, multi-language.
- Real-time spectator dashboards (planned for Milestone 2).
- Editable rulebooks inside the app (maintained externally).

## Longer-term vision

1. Cloud sync so several foursomes feed a central Big Game leaderboard.
2. Library of additional wager formats (Nassau, Skins, Wolf, etc.).

# Requirements – Millbrook Scorekeeper

(last updated 2025-04-29)

## 2.1 Functional (FR)

| ID | User story |
| --- | --- |
| FR-1 | As a scorer, I can create a round with 4 players, assign teams, and confirm handicaps in under 1 minute. |
| FR-2 | The app allocates handicap strokes using the "low-index" rule and stroke-index table. |
| FR-3 | I can enter each player's gross score per hole with ≤ 2 taps. |
| FR-4 | The app auto-computes net scores, hole winner/push, carry, base, doubles, and junk bets. |
| FR-5 | When my team trails, I can tap **Double** before tee-off and the new base applies immediately. |
| FR-6 | Junk bets (Birdie, Sandie, Greenie, Greenie-penalty, LD10) are detected and posted at the current base. |
| FR-7 | A live ledger shows base, carry, doubles, hole payout, junk totals, and running balance per player. |
| FR-8 | **Big Game toggle:** if enabled, the app records the two best net scores per hole and displays an 18-hole subtotal. |
| FR-9 | I can view a settlement screen after 18 holes showing: side-match totals, junk totals, and Big Game total; I can export CSV/PNG. |
| FR-10 | Player defaults (name, index, GHIN #) are stored locally and surfaced for confirmation at the next round. |
| FR-11 | I can resume an in-progress round after closing the tab (state persists offline). |
| FR-12 | *(Stretch)* I can share a read-only live ledger link with another device. |

## 2.2 Non-functional (NFR)

| ID | Requirement |
| --- | --- |
| NFR-1 | Fully offline-capable after first load (Service Worker + IndexedDB). |
| NFR-2 | First meaningful paint ≤ 2 s on mid-range mobile (Lighthouse ≥ 85). |
| NFR-3 | Any interaction responds within 500 ms. |
| NFR-4 | Installable PWA; responsive ≥ 375 px width. |
| NFR-5 | WCAG 2.1 AA accessibility (contrast, keyboard, screen-reader labels). |
| NFR-6 | User data stays on device; nothing uploaded unless an opt-in cloud feature is enabled. |
| NFR-7 | Unit-test coverage ≥ 80 % for the calculation engine. |

## 2.3 Assumptions & constraints

- English UI, USD stakes only.
- Only modern Chrome/Safari supported.
- Rulebooks are maintained externally; app code ships a frozen copy per version.

## 2.4 Dependencies

- Millbrook course scorecard JSON (par, yardage, SI).
- Optional future GHIN API key for handicap refresh.

# **STEP 3 — MODEL.md**

*Plain-text Markdown; copy into its own Notion sub-page.*

```
# Domain Model  (Millbrook + Big Game)
(last updated 2025-04-29)

## Entity list
• **Player** – golfer record (local only).
• **Match**  – one foursome's round, may include Big Game toggle.
• **HoleScore** – gross / net numbers per player.
• **LedgerRow** – Millbrook money math per hole.
• **JunkEvent** – one junk payout or penalty.
• **BigGameRow** – if Big Game enabled, two-best-net subtotal per hole.

## Class diagram (Mermaid)
```mermaid
classDiagram
class Player {
  +id: UUID
  +name: string
  +index: float
  +ghin?: string
  +defaultTeam?: "Red"|"Blue"
}

class Match {
  +id: UUID
  +date: Date
  +bigGame: boolean
  +playerIds: string[4]
  +holePar: int[18]
  +holeSI: int[18]
  +state: "active"|"finished"
  +currentHole: int
  +carry: int
  +base: int
  +doubles: int
  +bigGameTotal: int     %% 18-hole subtotal (sum of BigGameRow.subtotal)
}

class HoleScore {
  +hole: int
  +gross: int[4]
  +net: int[4]
  +teamNet: int[2]       %% lower net for Red/Blue
}

class LedgerRow {
  +hole: int
  +base: int
  +carryAfter: int
  +doubles: int
  +payout: int
  +runningTotals: int[4]
}

class JunkEvent {
  +hole: int
  +playerId: string
  +type: "Birdie"|"Sandie"|"Greenie"|"Penalty"|"LD10"
  +value: int            %% dollars
}

class BigGameRow {
  +hole: int
  +bestNet: int[2]       %% two best net numbers
  +subtotal: int         %% their sum (range 0-10)
}

Player "4" --- "1" Match
Match  "1" o-- "*" HoleScore
Match  "1" o-- "*" LedgerRow
Match  "1" o-- "*" JunkEvent
Match  "1" o-- "*" BigGameRow
```

## **Data-flow**

1. **Setup** → create Match (bigGame = true/false), tie in 4 Player ids.
2. **Per-hole entry** → save/overwrite HoleScore[h].
    - Run **CalcEngine** to:
    
    – update LedgerRow[h] (Millbrook)
    
    – update BigGameRow[h] if bigGame is on
    
    – add any JunkEvents
    
3. **Finish** → mark Match.state = finished, compute bigGameTotal, show settlement.

All objects persist in browser **IndexedDB**; exporting a round serialises the Match tree.

```
--------------------------------------------------------------------------

STEP 4 — ALGORITHM FILES
========================
_(Each sub-file ≤ 2 KB; copy/paste into separate Notion code blocks.)_

---

### Algo-Allocation.md  (handicap strokes)
```

# **Handicap Stroke Allocation**

Input

- indexes[4] (float)
- holeSI[18] (int 1–18)

low = min(indexes)

strokes[i] = floor(indexes[i] – low)

Create bool matrix strokesPerHole[4][18]

For each player i give +1 net stroke on the first strokes[i] holes

where holeSI ≤ strokes[i].  Second-stroke loop if strokes[i] > 18.

Returns strokesPerHole.

```
---

### Algo-Base.md  (base & doubles)
```

# **Base & Doubling Sequence**

initial: hole1 base = 1 ; hole2 base = 2

hole3+ base = 2 × 2^doubles   // doubles = valid double calls so far

function callDouble(match):

if match.trailingTeam() and not match.doubleUsedThisHole:

match.doubles += 1

match.base = 2 * 2**match.doubles

```
---

### Algo-Payout.md  (hole money)
```

# **Hole Payout (Millbrook)**

if winner == "Push":

carry += base ; payout = 0

else:

payout = carry + base + base   # win-bonus = base

carry   = 0

Update each player's running total (+ for winners, – for losers).

```
---

### Algo-Junk.md  (birdie / sandie / etc.)
```

# **Junk Evaluation**

At hole close evaluate flags:

## **Type Condition Value ($)**

Birdie    gross < par             base

Sandie    bunker → par or better    base

Greenie   Par-3 tee-ball on green + closest    base (carries)

Penalty   Greenie candidate 3-putts        base (loss)

LD10      Hole 17 long-drive in fair/green     10 fixed

Emit JunkEvent(s); update running totals.

```
---

### Algo-BigGame.md  (two best net)
```

# **Big Game Hole Subtotal**

Input  net[4]  (player order fixed)

1. Sort net ascending → bestNet[0..3]
2. subtotal = bestNet[0] + bestNet[1]
3. BigGameRow = { hole, bestNet:[bestNet0,bestNet1], subtotal }

Match.bigGameTotal = Σ subtotal (holes 1-18).

Note: no junk, no carry, no doubles in Big Game.

```
--------------------------------------------------------------------------

**Confirm these models & algorithms** or request tweaks, then we'll move to Step 5 (API & state contracts).
```

# **STEP 5 — API & STATE CONTRACTS**

File: **API-GameState.ts**

────────────────────────────────────────────────

/*********************************************************

- Core domain types for Millbrook + Big Game PWA.
- Persisted in IndexedDB ('millbrook') via Dexie.
    - ********************************************************/

export type Team = 'Red' | 'Blue';

/* ––––– 1. Player & Match ––––– */

export interface Player {

id: string;      // uuid

name: string;

index: number;    // GHIN / WHS handicap index (e.g. 8.4)

ghin?: string;

defaultTeam?: Team;

}

export interface Match {

id: string;             // uuid

date: string;           // ISO (YYYY-MM-DD)

bigGame: boolean;

playerIds: [string, string, string, string];

holePar: readonly number[];  // length 18

holeSI:   readonly number[];  // length 18

state: 'active' | 'finished';

currentHole: number;       // 1-18

carry: number;             // dollars

base: number;             // dollars for *next* hole

doubles: number;           // count of doubles so far

bigGameTotal: number;      // sum of BigGameRow.subtotal

}

/* ––––– 2. Per-hole Snapshots ––––– */

export interface HoleScore {

hole: number;                 // 1-18

gross: [number, number, number, number];

net:     [number, number, number, number];

teamNet: [number, number];     // lower net per team

}

export interface LedgerRow {

hole: number;

base: number;

carryAfter: number;

doubles: number;

payout: number;

runningTotals: [number, number, number, number];

}

export type JunkType =

| 'Birdie'

| 'Sandie'

| 'Greenie'

| 'Penalty'

| 'LD10';

export interface JunkEvent {

hole: number;

playerId: string;

type: JunkType;

value: number;          // dollars

}

export interface BigGameRow {

hole: number;

bestNet: [number, number];

subtotal: number;

}

/* ––––– 3. Aggregate GameState ––––– */

export interface GameState {

match: Match;

holeScores: HoleScore[];    // index = hole-1

ledger: LedgerRow[];

junkEvents: JunkEvent[];

bigGameRows: BigGameRow[];

}

/* ––––– 4. Dexie Schema ––––– */

export interface DbSchema {

matches: Match;

gameStates: GameState;       // key = match.id

}

────────────────────────────────────────────────

File: **API-CalcEngine.ts**

────────────────────────────────────────────────

/* Pure functions – unit-testable – no I/O */

import {

Match,

HoleScore,

LedgerRow,

JunkEvent,

BigGameRow,

GameState

} from './API-GameState';

/* –– Handicap strokes –– */*

*export function allocateStrokes(indexes: number[], si: number[]): boolean[][] {*

*/* returns bool[4][18] matrix */

}

/* –– Call Double –– */*

*export function callDouble(match: Match, trailingTeam: 'Red' | 'Blue'): Match {*

*/* adjusts base & doubles if rules allow */

}

/* –– Compute Hole –– */*

*export function computeHole(*

*game: GameState,*

*holeIdx: number,             // 0-based*

*gross: [number, number, number, number],*

*strokeMap: boolean[][]         // from allocateStrokes*

*): {*

*holeScore: HoleScore;*

*ledgerRow: LedgerRow;*

*junk: JunkEvent[];*

*bigGameRow?: BigGameRow;*

*} { /* …implementation… */ }

/* –– Finish Round –– */*

*export function settleMatch(game: GameState): LedgerRow[] {*

*/* returns final ledger with running totals */

}

────────────────────────────────────────────────

# **STEP 6 — UI WIREFRAMES (ASCII)**

File: **UI-Setup.txt**

────────────────────────────────────────────────

Millbrook Scorekeeper – Match Setup

┌──────────────────────────────────────────────┐

│ Players & Index  (tap to edit)            │

│ ◻ Alice    8.4   Team [Red ▼]            │

│ ◻ Bob      6.1   Team [Blue ▼]           │

│ ◻ Carol   10.2   Team [Red ▼]            │

│ ◻ Dave     9.3   Team [Blue ▼]           │

│            

│            

│ [ ] Enable "Big Game" (two-best-net)        │

│            

│            

│            

│ [  START ROUND  ]            │

└──────────────────────────────────────────────┘

Notes: ↻ pulls GHIN index (future). Big Game toggle off by default.

File: **UI-Hole.txt**

────────────────────────────────────────────────

Hole 7 / Par 4

┌──────────────────── Gross Scores ─────────────┐

│ Red • Alice [ 4 ▼]   Bob   [ 5 ▼]  • Blue      │

│ Red • Carol [ 5 ▼]   Dave  [ 4 ▼]  • Blue      │

└───────────────────────────────────────────────┘

Base $8   Carry $6   Doubles 2        ↷ Double

Running Totals:  Red +$24   Blue –$24 (tap to expand)

Notes: Double button active only if user's team trailing.

File: **UI-Ledger.txt**

────────────────────────────────────────────────

Round Summary

┌ Hole │ Base │ Carry-in │ Win $ │ Junk │ … ┐

│    1  │    1   │    0      │    2     │    0    │    │

│  …            

└──────────────────────────────────────────────┘

Final Totals: Alice +$12   Carol +$12   Bob –$12   Dave –$12

[ Export CSV ]   [ Save PNG ]   [ New Round ]

────────────────────────────────────────────────

(End of layers 5 & 6. Next: layer 7 task backlog, layer 8 test specs, etc.)

# **STEP 7 — IMPLEMENTATION TASK BACKLOG**

File: **Tasks-M1.md** (Playable MVP – Millbrook + Big Game offline)

```
ID  | Title                               | FR/NFR refs      | Acceptance criteria (summarised)                                         | Est | Notes
----|-------------------------------------|------------------|-------------------------------------------------------------------------|-----|------
T-01| Repo scaffold / Vite-React-TS shell | NFR-1,2,4        | App loads "Hello Millbrook" offline after first visit                   | 2   | base commit
T-02| Dexie DB schema (Player, Match …)   | FR-10,11; NFR-1 | CRUD player, create empty match, round resumes after reload             | 3   |
T-03| CalcEngine – stroke allocator       | FR-2             | Unit test matrix vs spec                                                | 2   |
T-04| CalcEngine – base + doubling        | FR-5             | Unit tests: sequences 1,2,4,4,8…                                        | 2   |
T-05| CalcEngine – hole payout            | FR-4             | Unit tests push / win / carry                                          | 3   |
T-06| CalcEngine – junk detection         | FR-6             | Tests for birdie, sandie, greenie carry, LD10                           | 5   |
T-07| CalcEngine – Big Game subtotal      | FR-8             | Given nets returns two-best subtotal                                   | 2   |
T-08| Zustand store wiring GameState      | FR-3,4,7,8       | Exposes createMatch, enterScore, callDouble; persists to Dexie         | 3   |
T-09| Match Setup UI                      | FR-1,8           | Validates 4 players, Big Game toggle, start round                      | 3   |
T-10| Hole View – score entry             | FR-3             | 4 pickers, net & stroke dots render                                    | 5   |
T-11| Hole View – status bar + Double btn | FR-4,5           | Live base / carry / doubles, button enables for trailing team          | 2   |
T-12| Hole View – dispatch computeHole    | FR-4,6,8         | Updates ledger + BigGameRow; advances hole                             | 3   |
T-13| Ledger drawer component             | FR-7             | Lists per-hole payouts + running totals + Big Game column if enabled   | 3   |
T-14| Settlement screen + export          | FR-9             | CSV + PNG; shows Big Game total                                        | 3   |
T-15| Lighthouse perf pass                | NFR-2,3          | Mobile perf ≥ 85                                                       | 3   |
T-16| Accessibility sweep                 | NFR-5            | axe-core clean; keyboard nav whole app                                 | 2   |
T-17| Unit-test coverage goal             | NFR-7            | Jest coverage ≥ 0.80 lines                                             | 3   |
T-18| PWA install & offline-first         | NFR-1,4          | Add-to-home works; offline fully functional                            | 2   |
T-19| Netlify CI + Prod deploy            | DevOps           | Push to main auto-deploys; preview per PR                              | 2   |
T-20| Release notes v0.1                  | Changelog        | CHANGELOG entry, git tag                                               | 1   |
TOTAL ESTIMATE ≈ 50 pts
```

*Sprint plan*: complete T-01 → T-08 sequentially; UI tasks parallel after store ready; perf / a11y / release last.

---

File: **Tasks-M2.md** ("Live & Cloud" stretch)

```
T-21 WebRTC live sync prototype        FR-12          | Lag <1 s LAN                               | 5
T-22 Firestore relay fallback          FR-12; NFR-1   | Offline queue flush on reconnect           | 5
T-23 Share-link spectator mode         FR-12          | Read-only URL shows live ledger            | 3
T-24 Anonymous cloud signin            future         | Creates Firebase uid, stores in Dexie      | 3
T-25 GHIN index refresh                dependency     | ↻ button populates latest index            | 3
T-26 Settings screen                   FR-10          | Manage saved players, GHIN #, cloud toggle | 2
T-27 Multi-currency groundwork         stretch        | Currency code selector (still USD only)    | 2
T-28 CalcEngine npm workspace          tech-debt      | Extracted as @millbrook/engine             | 4
T-29 Cross-device E2E test             FR-12          | Phone updates appear on desktop            | 3
T-30 Release v0.2 + notes              Changelog      | Tag, changelog, deploy                     | 1
TOTAL ≈ 31 pts
```

---

# **STEP 7 ADDENDUM — COURSE MANAGEMENT TASKS**

File: **Tasks-M3.md** ("Course Management")

```
ID  | Title                               | FR/NFR refs      | Acceptance criteria (summarised)                                         | Est | Notes
----|-------------------------------------|------------------|-------------------------------------------------------------------------|-----|------
T-31| Course data model                   | FR-13            | Define schema for course/tees/holes with validation                      | 3   | JSON structure
T-32| Course storage implementation       | FR-13; NFR-1     | Persist courses in Dexie, sample data for Millbrook                      | 3   | Preloaded courses
T-33| Setup - Course UI                   | FR-13            | Add course selection screen after player setup                           | 3   | + New course UI
T-34| Setup - Tee selection               | FR-13            | Allow per-player tee selection with color indicators                     | 2   | 
T-35| Score input with tee awareness      | FR-13            | Score entry shows correct pars & hole info per tee                       | 3   | Conditional UI
T-36| Enhanced stroke allocation          | FR-2, FR-13      | Apply correct stroke indexes based on player's tee                       | 4   | Multi-tee logic
T-37| Hole information display            | FR-14            | Show details about current hole (yardage, par, SI, visuals)              | 3   | Context for player
T-38| Course manager                      | FR-15            | Add/Edit/Delete courses and tees                                         | 4   | Admin UI
T-39| Course data import/export           | FR-16            | JSON export/import of course data                                        | 2   | Data portability
T-40| Course preview & details            | FR-14            | Visual display of course layout and statistics                           | 3   | Info panel
T-41| E2E testing for course features     | FR-13-16; NFR-7  | Test suite covering course selection & tee-specific scoring              | 3   | Regression safety
TOTAL ESTIMATE ≈ 33 pts
```

## 2.1 Functional (FR) Update

| ID | User story |
| --- | --- |
| FR-13 | As a player, I can select which course and specific tees each player is using, and the app will automatically apply the correct pars, yardages, and stroke indexes for scoring. |
| FR-14 | As a player, I can view detailed information about each hole including yardage, par, and stroke index for all tee options. |
| FR-15 | As an administrator, I can add, edit and delete course information including multiple tee options and hole-by-hole details. |
| FR-16 | As a player, I can import and export course data in JSON format to share with others or backup my collection. |

# **STEP 7 ADDENDUM 2 — ENHANCED PLAYER & GAME MANAGEMENT**

File: **Tasks-M4.md** ("Enhanced Player Experience")

```
ID  | Title                               | FR/NFR refs      | Acceptance criteria (summarised)                                         | Est | Notes
----|-------------------------------------|------------------|-------------------------------------------------------------------------|-----|------
T-42| Player Roster Component             | FR-10            | Create scrollable/searchable player list with quick selection            | 3   | Phase 1
T-43| Player Preferences Store            | FR-10            | Extend Player model with preferences (team, tee, GHIN)                   | 2   | Phase 1
T-44| Quick Handicap Editor               | FR-10            | Implement inline handicap update UI with validation                      | 2   | Phase 1
T-45| Recently Used Players               | FR-10            | Add logic to track and prioritize recently used players                  | 1   | Phase 1
T-46| Team Memory                         | FR-10            | Store and auto-suggest preferred teams                                   | 2   | Phase 1
T-47| Per-Player Tee Selection            | FR-13            | Add tee dropdowns in setup with Millbrook options                        | 3   | Phase 2
T-48| Big Game Toggle Enhancement         | FR-8             | Improve toggle with clearer indication of ruleset changes                | 2   | Phase 2
T-49| Quick Rematch Button                | FR-10            | Add functionality to restart with same players/teams                     | 1   | Phase 2
T-50| Setup Flow Refinement               | FR-1             | Optimize steps from player selection to game start                       | 2   | Phase 2
T-51| Greenie Signaling                   | FR-6             | Add clear button/indicator for Greenie opportunities on par-3s           | 2   | Phase 3
T-52| Junk Quick-Actions                  | FR-6             | Implement tap patterns for adding common junk events                     | 3   | Phase 3
T-53| Greenie Carry Tracker               | FR-6             | Build UI component to show accumulated Greenies                          | 2   | Phase 3
T-54| Double Button Enhancement           | FR-5             | Improve doubling UI for trailing team with clearer state                 | 2   | Phase 3
T-55| LD10 Prompt for Hole 17             | FR-6             | Add special dialog for LD10 proposal on hole 17                         | 2   | Phase 3
T-56| Compact Ledger View                 | FR-7             | Create condensed game state display showing base/carry/doubles           | 3   | Phase 4
T-57| Junk Scoreboard                     | FR-7             | Implement visual summary of junk events per player                       | 3   | Phase 4
T-58| Stroke Allocation Indicators        | FR-2             | Add clear visual indicators for stroke holes per player                  | 2   | Phase 4
T-59| Millbrook Data Loader               | FR-13            | Import and structure Millbrook course data                               | 2   | Phase 5
T-60| Course-Aware Scoring                | FR-13            | Connect scoring to course data for proper hole information               | 3   | Phase 5
TOTAL ESTIMATE ≈ 42 pts
```

## Domain Model Extensions

New entity types to support enhanced player experience:

```mermaid
classDiagram
class PlayerPreferences {
  +playerId: string
  +defaultTeam: "Red"|"Blue"
  +preferredTee: string
  +ghinId: string
  +lastUsed: Date
}

class TeeSelection {
  +matchId: string
  +playerId: string
  +teeName: string
}

class JunkTracker {
  +matchId: string
  +hole: number
  +greenieCarryCount: number
  +activeGreenies: boolean
}

class QuickMatch {
  +id: string
  +name: string
  +playerIds: string[4]
  +teamAssignments: Team[4]
  +lastPlayed: Date
}

Player "1" --- "1" PlayerPreferences
Match "1" o-- "*" TeeSelection
Match "1" o-- "1" JunkTracker
```

## UI Wireframes

File: **UI-PlayerRoster.txt**

```
┌──────────────────────────────────────────────┐
│ Select Players                               │
│                                              │
│ RECENT                                       │
│ ◉ Alice    8.4 [✎]  Team [Red ▼]            │
│ ◉ Bob      6.1 [✎]  Team [Blue ▼]           │
│ ◯ Carol   10.2 [✎]  Team [Red ▼]            │
│                                              │
│ ALL PLAYERS                                  │
│ ◯ Dave     9.3 [✎]  Team [Blue ▼]           │
│ ◯ Fred    11.5 [✎]  Team [Red ▼]            │
│ ◯ Greg     7.2 [✎]  Team [Blue ▼]           │
│                                              │
│ Selected: 2/4    [+ Add New Player]          │
└──────────────────────────────────────────────┘
```

File: **UI-EnhancedHole.txt**

```
┌──────────────────────────────────────────────┐
│ Hole 7 (Par 3) • Greenie Eligible            │
│                                              │
│ ┌──────── Gross Scores ──────────────────┐   │
│ │ Red • Alice [ 3 ▼]   Bob   [ 4 ▼] • Blue │ │
│ │ Red • Carol [ 4 ▼]   Dave  [ 3 ▼] • Blue │ │
│ └────────────────────────────────────────┘   │
│                                              │
│ ┌──────── Junk Events ───────────────────┐   │
│ │ [Birdie] [Sandie] [Greenie] [Penalty]  │   │
│ └────────────────────────────────────────┘   │
│                                              │
│ Base $4   Carry $0   Doubles 1   Greenies 2  │
│                                              │
│ [ ↷ Double ]   <Blue team trailing>          │
└──────────────────────────────────────────────┘
```

File: **UI-LD10Prompt.txt**

```
┌──────────────────────────────────────────────┐
│ Hole 17 - LD10 Opportunity                   │
│                                              │
│ Red team proposes LD10 challenge:            │
│ • Longest drive in fairway/green wins $10    │
│ • Drives in rough/bunker are ineligible      │
│                                              │
│ [Accept]    [Decline]                        │
└──────────────────────────────────────────────┘
```

File: **UI-JunkScoreboard.txt**

```
┌──────────────────────────────────────────────┐
│ Junk Summary                                 │
│                                              │
│ Player   Birdies  Sandies  Greenies  Other   │
│ Alice      2        0        1        0      │
│ Bob        1        1        0        0      │
│ Carol      0        1        0        1 (LD10)│
│ Dave       1        0        2        0      │
│                                              │
│ [Close]                                      │
└──────────────────────────────────────────────┘
```

## Development Approach

The work is organized into five phases, with a focus on implementing the highest-impact player experience improvements first:

1. **Phase 1: Player Management** - Tasks T-42 through T-46
   - Enhances the player roster and preferences system

2. **Phase 2: Game Setup Flow** - Tasks T-47 through T-50
   - Streamlines the match setup process

3. **Phase 3: Scoring Experience** - Tasks T-51 through T-55
   - Improves the hole-by-hole scoring with better junk handling

4. **Phase 4: Game Visualization** - Tasks T-56 through T-58
   - Enhances how game state is displayed to players

5. **Phase 5: Course Integration** - Tasks T-59 and T-60
   - Connects player experience to course data

This approach follows the priority order established in the original App-Plan, focusing first on the core player experience before adding more advanced features.

# **STEP 8 — TEST SPECS**

File: **Test-CalcEngine.md**

```
TC-01  Identical indexes ⇒ strokes matrix all false
TC-02  Indexes 6.1/8.4/9.3/10.2 ⇒ strokes 0/2/3/4 holes flagged correctly
TC-03  Base progression after doubles on holes 3 & 7 ⇒ 1,2,4,4,4,4,8,8…
TC-04  Carry-over push then win (carry 6, base 8, win Blue) ⇒ payout 22, carry 0
TC-05  Greenie carry across two pushes then win ⇒ payout stacks (base sequence respected)
TC-06  LD10 triggers hole 17 only, pays fixed 10
```

File: **Test-E2E.md** (offline happy path)

```
1. Install PWA, switch to airplane mode.
2. Create match with Big Game ON, enter fixture scores for 18 holes.
3. Verify ledger totals after each hole match fixture.
4. On hole 17 tap LD10 proposal accepted; payout recorded.
5. After 18 holes settlement screen shows correct side totals + Big Game total.
6. Export CSV – file is non-empty and matches ledger.
```

File: **Test-LiveSync.md** (post-M2)

```
Open round on Device A (host).
Share link to Device B.
B sees ledger within 1 s.
A enters three holes offline, reconnects → B catches up accurately.
B URL remains read-only (no editable elements).
```

---

# **STEP 9 — DEVOPS-HOSTING.md**

```
Build stack   : Vite + React + TS
Hosting       : Netlify static + optional edge functions

[build]
  command = "npm run build"
  publish = "dist"

CI steps
  1. npm ci
  2. npm test  (Jest + coverage gate)
  3. npx lighthouse-ci --preset mobile  (fail <85)
  4. npm run build
  5. Deploy preview / prod

Env vars
  GHIN_API_KEY  (future)

Rollback
  Netlify "Deploys" → restore previous in <10 s
Monitoring
  Netlify analytics + Sentry (sample 5 %)
```

---

# **STEP 10 — CHANGELOG.md (stub)**

```
# Changelog – Millbrook Scorekeeper

## [0.1.0] – 2025-??-??  (Playable MVP)
Added
- Offline PWA shell
- Match setup, Millbrook engine, Big Game toggle
- Junk detection, doubles, ledger drawer
- CSV / PNG export
- IndexedDB persistence & resume
- Unit tests ≥ 80 %, Lighthouse ≥ 85

## [Unreleased]
- Live sync, cloud backup (Milestone 2)
```

---

# Implementation Plan (Updated May 2023)

## Current Status Summary

The Millbrook Scorekeeper application has implemented all core calculation components and major UI screens for both the Millbrook Game and optional Big Game functionality. The app is functional for its primary purpose of tracking scores, calculating wagers, and displaying results.

Current implementation includes:
- Complete CalcEngine with all necessary algorithms
- Database schema and persistence using IndexedDB 
- Core UI components for match setup, scoring, ledger, and settlement
- Course management with multi-tee support
- Player roster functionality
- Enhanced ledger display with detailed breakdown
- Settlement screen with CSV and PNG export capabilities

## Next Development Phase

The next development phase focuses on enhancements to improve the user experience and add additional features. The work is organized into three sprints:

### Sprint 1: Core Feature Completion ✅
- ✅ Enhanced the ledger drawer with detailed per-hole payouts and Big Game tracking
- ✅ Added export functionality to the settlement screen (CSV and PNG)
- ✅ Improved data visualization and user interface
- Completed: May 2023

### Sprint 2: Course Enhancement (Current)
- Improve tee-awareness in score input
- Enhance stroke allocation for multi-tee play
- Add course data import/export
- Create better course visualization
- Estimated timeline: 2 weeks

### Sprint 3: Player Experience
- Extend player model with preferences
- Create quick handicap editor
- Begin E2E testing implementation
- Estimated timeline: 2 weeks

## Future Roadmap

After completing these enhancement sprints, future development will focus on:
- Enhanced junk tracking
- Performance optimization
- Additional documentation
- PWA enhancements
- Possible multi-foursome support for Big Game

## Success Criteria

The following metrics will determine the success of this development phase:
- Reduced time to enter scores (target: ≤8 seconds per hole)
- Improved user satisfaction (target: 90% positive feedback)
- Increased usage in real play (target: 75+ rounds tracked in first 3 months)
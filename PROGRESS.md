# Millbrook Scorekeeper - Progress Tracker

## Completed Tasks

### Task T-01: Repo scaffold / Vite-React-TS shell
- ✅ Initialized Vite + React + TypeScript project
- ✅ Created basic app with "Hello Millbrook" message
- ✅ Configured offline support

### Task T-02: Dexie DB schema (Player, Match...)
- ✅ Implemented database schema for Player, Match, and GameState
- ✅ Created useDatabase hook for data persistence  
- ✅ Added DatabaseTest component for testing CRUD operations
- ✅ Demonstrated persistence with IndexedDB

### Task T-03: CalcEngine - stroke allocator
- ✅ Implemented stroke allocator algorithm
- ✅ Added comprehensive unit tests
- ✅ Created StrokeAllocatorTest visual component
- ✅ Tests passing for all test cases (TC-01, TC-02, TC-03)

### Task T-04: CalcEngine - base + doubling
- ✅ Implemented base calculation formula
- ✅ Added doubling logic with proper constraints
- ✅ Created BaseCalculatorTest visual component
- ✅ Tests passing for all test cases (TC-01 through TC-07)

### Task T-05: CalcEngine - hole payout
- ✅ Implemented payout logic for holes (win bonus, push carries)
- ✅ Created PayoutCalculatorTest visual component
- ✅ Added player payout distribution and running totals
- ✅ Tests passing for TC-04 test case (carry-over push then win)

### Task T-06: CalcEngine - junk detection
- ✅ Implemented detection for Birdie, Sandie, Greenie, Penalty, and LD10
- ✅ Created JunkCalculatorTest visual component
- ✅ Added support for multiple junk events per hole
- ✅ Tests passing for TC-05 test case (greenie carry) and other junk events

### Task T-07: CalcEngine - Big Game subtotal
- ✅ Implemented two-best-net score calculation algorithm
- ✅ Created BigGameCalculatorTest visual component
- ✅ Added running total tracking for 18 holes
- ✅ Tests passing for TC-07 test case (two-best calculation)

### Task T-08: Zustand store wiring GameState
- ✅ Implemented Zustand store with persistent state
- ✅ Connected all CalcEngine components in a unified game state
- ✅ Created GameStoreTest component to visualize match flow
- ✅ Added functionality for match creation, score entry, doubles, and round completion

### Task T-09: Match Setup UI
- ✅ Created UI for setting up a new match (MatchSetup.tsx)
- ✅ Implemented player selection/creation (PlayerRoster.tsx)
- ✅ Added team assignment functionality
- ✅ Implemented Big Game toggle

### Task T-10: Hole View – score entry
- ✅ Created UI for entering scores for each hole (HoleView.tsx)
- ✅ Implemented display of net scores and strokes
- ✅ Added hole information display (HoleInfo.tsx)

### Task T-11: Hole View – status bar + Double btn
- ✅ Implemented status bar with base, carry, and doubles information
- ✅ Added double button for trailing team

### Task T-12: Hole View – dispatch computeHole
- ✅ Implemented updates to ledger + BigGameRow
- ✅ Added proper hole advancement functionality
- ✅ Added validation for score entry and junk events
- ✅ Improved user feedback with error handling and loading states

### Task T-31: Course data model
- ✅ Defined schema for course/tees/holes with validation
- ✅ Implemented interfaces in courseModel.ts

### Task T-32: Course storage implementation
- ✅ Persisted courses in Dexie database
- ✅ Added sample data for Millbrook course (millbrookCourseData.ts)

### Task T-33: Setup - Course UI
- ✅ Added course selection screen (CourseSetup.tsx)
- ✅ Implemented new course creation UI

### Task T-34: Setup - Tee selection
- ✅ Implemented per-player tee selection with color indicators (TeeSelection.tsx)

### Task T-37: Hole information display
- ✅ Added details about current hole (yardage, par, SI, visuals)

### Task T-38: Course manager
- ✅ Implemented functionality to add/edit/delete courses and tees (CourseManager.tsx)
- ✅ Created HoleEditor.tsx for editing individual hole details

### Task T-42: Player Roster Component
- ✅ Created scrollable/searchable player list with quick selection (PlayerRoster.tsx)

### Task T-56: Ledger View
- ✅ Implemented ledger display showing game details (LedgerView.tsx)

### Task T-57: Settlement View
- ✅ Created final settlement screen (SettlementView.tsx)

### Task T-13: Ledger drawer component enhancement ✅
- ✅ Added per-hole payouts + running totals
- ✅ Implemented enhanced Big Game column with detailed breakdown
- ✅ Improved visual styling with color coding for wins/losses
- ✅ Added visual indicators for junk events
- ✅ Enhanced mobile responsiveness

### Task T-14: Settlement screen export enhancements ✅
- ✅ Added CSV export with detailed player results and hole-by-hole data
- ✅ Implemented PNG screenshot export functionality
- ✅ Enhanced Big Game display with hole-by-hole breakdown
- ✅ Improved visual styling and layout for better readability
- ✅ Added separate junk and side match breakdowns per player

### Task T-39: Course data import/export ✅
- ✅ Implemented JSON export of individual courses and all courses
- ✅ Added import functionality for course data files
- ✅ Implemented validation for imported course data
- ✅ Enhanced course manager UI with import/export controls
- ✅ Added preservation of hole and tee details during import/export

### Task T-35: Score input with tee awareness ✅
- ✅ Updated score entry to show correct pars & hole info per tee
- ✅ Enhanced UI with per-player hole details based on tee selection
- ✅ Added visual indicators for strokes received on each hole
- ✅ Improved score dropdown with par-relative labeling
- ✅ Added automatic adjustment of default scores based on par

### Task T-36: Enhanced stroke allocation ✅
- ✅ Implemented allocateStrokesMultiTee function for tee-specific stroke allocation
- ✅ Added utility for retrieving player-specific stroke indexes
- ✅ Updated game store to use multi-tee stroke allocation
- ✅ Added comprehensive testing for multi-tee features
- ✅ Ensured backward compatibility with single-tee courses

### Task T-40: Course preview & details ✅
- ✅ Created visual display of course layout and statistics
- ✅ Implemented interactive tee selection
- ✅ Added hole-by-hole preview with key information
- ✅ Enhanced course information display with detailed statistics
- ✅ Implemented standalone course preview page accessible from setup screen

### Task T-45: Fix Base Value Calculation ✅
- ✅ Fixed issue where base value automatically doubled on hole 2
- ✅ Modified `calculateBase` function in `baseCalculator.ts` to maintain base of 1 for hole 2 unless doubled
- ✅ Updated test cases in `baseCalculator.test.ts` to verify correct behavior
- ✅ Ensured base value correctly follows the intended progression through all holes

### Task T-46: Fix Team Payout Calculation ✅
- ✅ Fixed issue where team winnings were split among players
- ✅ Updated `calculatePlayerPayouts` function in `payoutCalculator.ts` to give each player the full amount
- ✅ Updated test cases in `payoutCalculator.test.ts` to verify correct behavior
- ✅ Ensured team payouts now follow the correct Millbrook Game rules

### Task T-47: Fix Player Creation UI ✅
- ✅ Fixed invisible buttons in player creation interface
- ✅ Added explicit styling for form action buttons in `App.css`
- ✅ Ensured proper contrast and visibility for all interactive elements
- ✅ Verified across different screen sizes

### Task T-48: Implement Double-Per-Hole Limit ✅
- ✅ Enforced rule that a team can only double once per hole
- ✅ Added `doubleUsedThisHole` flag to Match state
- ✅ Updated UI in `HoleView` component to hide double button after use
- ✅ Added visual feedback indicating when doubles have been used
- ✅ Ensured the flag is reset when advancing to a new hole

### Task T-49: Fix Player Persistence ✅
- ✅ Fixed issue where players did not persist across sessions
- ✅ Added initialization of sample players if player database is empty
- ✅ Ensured proper persistence with IndexedDB
- ✅ Updated useDatabase hook to handle player persistence
- ✅ Added player data to GameState interface for proper state handling

### Task T-50: Fix Team Score Calculation ✅
- ✅ Fixed issue where team scores were not exact opposites
- ✅ Updated calculatePlayerPayouts to ensure losing team scores are exact opposites of winning team
- ✅ Removed division of team amounts among players - each player gets full amount
- ✅ Updated gameStore to handle junk events properly
- ✅ Each player now earns the full amount the team wins

### Task T-51: Fix Hole 2 Payout Calculation ✅
- ✅ Fixed issue where hole 2 payout didn't calculate correctly for junk events
- ✅ Updated `calculateBase` function to ensure hole 2 uses a fixed base of $2
- ✅ Improved base calculation for hole 2 to properly handle doubling
- ✅ Verified that junk events (birdie, greenie) are correctly included in the total payout
- ✅ Ensured payouts match the expected $8 total ($2 for hole win, plus junk events)

### Task T-52: Fix Team Total Calculation ✅
- ✅ Fixed issue where team totals were incorrectly summing individual player amounts
- ✅ Updated `findTrailingTeam` function to properly calculate team totals by using team size
- ✅ Fixed display of team totals in LedgerView and SettlementView components
- ✅ Updated `getTeamTotals` functions in UI components to divide by team size
- ✅ Added debugging logs for team totals for easier troubleshooting
- ✅ Ensured trailing team is correctly identified based on accurate team totals
- ✅ Fixed double counting issue in all team total calculations across the application

### Task T-53: Implement Zero-Sum Junk Calculation ✅
- ✅ Fixed issue where junk events were unbalanced (only added to one team, not subtracted from the other)
- ✅ Updated junk calculation to make it zero-sum (when one team earns junk, the other team loses that amount)
- ✅ Modified the enterHoleScores method to calculate net junk difference between teams
- ✅ Added improved debugging logs for tracking junk calculations
- ✅ Ensured team scores remain perfectly balanced throughout the game
- ✅ When one team is up by a certain amount, the other team is down by exactly the same amount

## Current Status (Updated 2023-05-31)
- All CalcEngine components implemented and tested
- State management layer implemented with Zustand
- Core UI components completed (setup, hole view, ledger)
- Course management functionality implemented
- Player roster management functionality implemented
- Tee-aware scoring and stroke allocation implemented
- Test components working in the UI
- Development server functioning at http://localhost:5173
- Tasks T-01 through T-14, T-31 through T-40, T-42, T-45 through T-48, T-56, T-57 completed successfully

## Priority Tasks for Next Sprint

### Immediate Priority - Bug Fixes
### Task T-45: Fix Base Value Calculation
- Fix issue where base value automatically doubles on hole 2
- Modify `calculateBase` function in `baseCalculator.ts` to maintain base of 1 for hole 2 unless doubled
- Update related test cases in `baseCalculator.test.ts`
- Verify behavior in the game flow

### Task T-46: Fix Team Payout Calculation
- Fix issue where team winnings are split among players (each player should get full amount)
- Update `calculatePlayerPayouts` function in `payoutCalculator.ts`
- Modify calculation so each winner gets full amount from each loser
- Adjust test cases in `payoutCalculator.test.ts` to verify correct behavior
- Test with various team configurations

### Task T-47: Fix Player Creation UI
- Fix invisible buttons in player creation interface
- Add explicit styling for form action buttons in `App.css`
- Ensure proper contrast and visibility for all interactive elements
- Verify across different screen sizes and devices

### Task T-48: Implement Double-Per-Hole Limit
- Enforce rule that a team can only double once per hole
- Ensure `doubleUsedThisHole` flag in `DoublingState` is properly tracked
- Update UI in `HoleView` component to disable double button after use
- Add visual feedback indicating when doubles have been used

### Medium Priority - Course Functionality
### Task T-43: Player Preferences Store
- Extend Player model with preferences (team, tee, GHIN)
- Implement persistent player preferences

### Task T-44: Quick Handicap Editor
- Create inline handicap update UI with validation
- Implement quick edit functionality

## Future Milestone Planning
- Enhanced junk tracking (T-51, T-52, T-53)
- End-to-end (E2E) testing implementation
- Performance optimization
- User documentation and help screens
- Progressive Web App (PWA) enhancements

## Estimated Timeline
- Sprint 1 (2 weeks): Tasks T-13, T-14
- Sprint 2 (2 weeks): Tasks T-35, T-36, T-39, T-40
- Sprint 3 (2 weeks): Tasks T-43, T-44, begin E2E testing setup 
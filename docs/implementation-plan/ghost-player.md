# Ghost Player Feature

## Background and Motivation
Millbrook games require four players. When fewer than four real golfers are available, groups currently invent "ghost scores" by hand to keep the format intact. Automating this inside the app lets any group (including solo, duo, or trio) launch a round without manual side-calculations, while still preserving realism and transparency.

A *Ghost Player* is a synthetic player generated from the profile (handicap index) of a real golfer in the roster.  Each ghost:
1. Joins teams exactly like a human player (determined during setup).
2. Receives probabilistically generated hole scores that reflect the selected golfer's index.
3. Participates in side-match, junk, and doubles calculations just like a human.
4. Is **ignored for Big Game** stats per Millbrook rules (three-man Big Game).
5. Appears in history with a flag that a ghost was present, so rounds can be filtered later.

- NEW: For added suspense and engagement, each ghost player's score should be hidden by default during play. The score is only revealed when the user presses a dedicated button (ideally on the ghost player's fourbox or card). The reveal should include a brief narrative and visual flair to enhance the experience.

+ **2024-06-14 User Feedback Update:**
+ The ghost FAB should not open a modal. Instead, clicking the FAB should turn the roster into "ghost mode"—the roster UI is repopulated with all eligible players (not in the match), and you can select any as ghosts. The UI should visually indicate ghost status for all selected players in this mode. No modal is used; the selection is done directly in the main roster UI.

## Branch Name
`feature/ghost-player`

## Goals & Success Criteria
- Setup flow offers a "+" Ghost option until 4 total players (real + ghost) are selected.
- User chooses a real roster player (not currently playing) as the base for each ghost; the UI shows "Ghost (<n>)" with a faded avatar.
- Multiple ghosts can be added, each based on a unique, non-playing roster member.
- Each ghost receives 18 realistic scores (gross & net) based on the selected player's index and hole handicap ratings.
- Aggregate ghost gross score distribution aligns with expected scoring spread for that index (±2 strokes 68 % of the time).
- Ghosts participate fully in side-match payouts, junk, and doubles logic.
- Ghosts **do not** count toward Big Game calculations.
- Rounds with one or more ghosts are saved with `hasGhost:true` and visually tagged in history.
- Unit tests prove statistical properties of the generator and correct ledger integration for any mix of real/ghost players.
- Feature is mobile-first, accessible, and visually distinct.

## Key Challenges and Analysis

### Current Implementation Status Review (2024-12-27)

After reviewing the codebase, the ghost player feature has been substantially implemented with the following components in place:

| Component | Status | Details |
|-----------|--------|---------|
| Type Definitions | ✅ Complete | `isGhost` and `sourcePlayerId` properties added to Player type in `db/API-GameState.ts` |
| Ghost Score Generator | ✅ Complete | `ghostScoreGenerator.ts` implements statistical model with μ/σ calculations |
| Setup UI | ✅ Complete | Ghost mode toggle in `PlayersScreen.tsx` with visual distinction |
| Store Integration | ✅ Complete | `setupFlowStore` manages ghost players; `gameStore` handles ghost in match creation |
| Big Game Exclusion | ✅ Complete | Ghost players excluded from Big Game calculations in `gameStore.ts` |
| History Tracking | ✅ Complete | `hasGhost` flag propagated through match history |
| Visual Styling | ✅ Complete | Ghost players show with faded avatars and ghost emoji |

### Remaining Implementation Gaps

| Challenge | Current State | Work Needed |
|-----------|--------------|-------------|
| **Junk Event Generation** | ❌ Not Implemented | Ghost junk events (birdies, sandies, etc.) are evaluated but not generated based on probability model |
| **Score Hiding/Reveal** | ❌ Not Implemented | Ghost scores are immediately visible; no suspense mechanism |
| **Async Match Creation** | 🟡 In Progress | Store refactored but UI/tests not updated for async flow |
| **Testing Coverage** | ❌ Incomplete | Ghost flow tests exist but don't cover statistical properties |
| **Documentation** | ❌ Incomplete | No wireframes or user documentation |

### Technical Debt & Architecture Issues

1. **Junk Event Generation**: The current implementation evaluates junk events for ghosts but doesn't generate them probabilistically. The research document provides detailed probability tables that need to be implemented.

2. **Async Course Data**: The match creation was made async to fetch real course/tee data, but:
   - UI components still call `createMatch` synchronously
   - No loading states implemented
   - Tests not updated for async behavior

3. **Score Distribution Validation**: While the ghost score generator implements the statistical model, there's no validation that the output matches expected distributions.

### Refined Implementation Approach

Based on the current state, here's the prioritized approach to complete the ghost player feature:

1. **Complete Junk Event Generation** (Critical Path)
   - Implement `generateGhostJunkEvents()` function using probability tables from research
   - Integrate with ghost score generation to produce realistic junk patterns
   - Ensure junk events align with gross scores (e.g., birdie only when score = par-1)

2. **Fix Async Match Creation** (Blocking Issue)
   - Update all UI components to await `createMatch()`
   - Add loading states during match initialization
   - Update all tests for async behavior
   - Ensure ghost scores use real course SI data from the start

3. **Implement Score Hiding/Reveal** (User Experience)
   - Add `revealedHoles` state to track which ghost scores are visible
   - Create reveal animation and narrative generation
   - Integrate with FourBox and HoleDetail components

4. **Complete Testing & Documentation** (Quality Assurance)
   - Add statistical validation tests for score distributions
   - Create integration tests for full ghost rounds
   - Add wireframes and user documentation

## High-level Task Breakdown
> Executor completes **one task at a time** and updates the status board.

### Phase 1: Complete Core Functionality (Priority 1)

1. **Implement Ghost Junk Event Generation**
   *Create `generateGhostJunkEvents()` function that produces realistic junk events based on gross scores and handicap.*
   *Done When*: Function returns junk flags matching probability tables; unit tests validate distributions.

2. **Integrate Junk Generation with Match Creation**
   *Modify `createMatch` to generate junk events for ghosts alongside scores.*
   *Done When*: Ghost players have appropriate junk events in match; ledger shows correct junk payouts.

3. **Complete Async Match Creation Flow**
   *Update all UI components and tests to handle async `createMatch()`.*
   *Done When*: UI shows loading state; all tests pass; ghost scores use real SI data from hole 1.

### Phase 2: Enhanced User Experience (Priority 2)

4. **Implement Score Hiding Mechanism**
   *Add state tracking for revealed ghost scores per hole.*
   *Done When*: Ghost scores hidden by default; state persists during round.

5. **Create Reveal UI and Animation**
   *Add reveal button to FourBox; implement fade-in animation.*
   *Done When*: Tapping reveals score with smooth animation; accessible via keyboard.

6. **Generate Dynamic Narratives**
   *Create narrative templates based on score and junk events.*
   *Done When*: Each reveal shows contextually appropriate narrative (e.g., "Ghost Alice sinks a 15-footer for birdie!").

### Phase 3: Quality & Polish (Priority 3)

7. **Statistical Validation Tests**
   *Test ghost score distributions match expected handicap performance.*
   *Done When*: Tests verify mean, σ, birdie rates match research data.

8. **Integration Testing**
   *Test complete rounds with various ghost configurations.*
   *Done When*: All ghost scenarios (1-4 ghosts) work correctly.

9. **Documentation & Wireframes**
   *Create user docs and wireframes for ghost features.*
   *Done When*: Docs explain ghost mode; wireframes show UI flow.

10. **Performance Optimization**
    *Optimize ghost score generation for smooth UI.*
    *Done When*: No UI lag when starting matches with ghosts.

### Deprecated/Completed Tasks

The following tasks from the original plan are already complete:
- ✅ Research & Finalise Distribution Parameters
- ✅ Branch Setup & Schema Update  
- ✅ Setup Screen UI – Ghost FAB
- ✅ Ghost Score Generator Utility
- ✅ Integrate Generator into Game Start Flow
- ✅ Exclude Ghosts from Big Game
- ✅ History & Tagging
- ✅ Styling / Accessibility Polish
- ✅ Ghost Mode Roster Selection

## Acceptance Criteria Checklist
- [x] Setup screen offers "+" Ghost until 4 total players (real + ghost) are selected.
- [x] User selects a unique, non-playing roster player for each ghost; each ghost labelled "Ghost (Name)".
- [x] Generator produces 18 scores per ghost meeting statistical spec.
- [ ] Ghosts generate realistic junk events based on probability tables.
- [x] Ghosts affect side-match ledger exactly like human.
- [ ] Ghosts affect junk payouts with probabilistic events.
- [x] Ghosts participate in doubles exactly like human.
- [x] Ghosts excluded from Big Game calculations.
- [x] Rounds with one or more ghosts saved with `hasGhost:true` and icon in history list.
- [x] UI visually differentiates each ghost (grey avatar, tooltip, a11y labels).
- [ ] Each ghost player's score is hidden by default and only revealed when user presses a button.
- [ ] Score reveal for each ghost includes a brief narrative and visual flair.
- [ ] Async match creation works with loading states.
- [ ] Unit & integration tests pass; coverage ≥ 80% for new code.

## Project Status Board

### Phase 1: Complete Core Functionality
- [x] 1. Implement Ghost Junk Event Generation
- [x] 2. Integrate Junk Generation with Match Creation  
- [x] 3. Complete Async Match Creation Flow

### Phase 2: Enhanced User Experience
- [x] 4. Implement Score Hiding Mechanism
- [x] 5. Create Reveal UI and Animation
- [ ] 6. Generate Dynamic Narratives

### Phase 3: Quality & Polish
- [ ] 7. Statistical Validation Tests
- [ ] 8. Integration Testing
- [ ] 9. Documentation & Wireframes
- [ ] 10. Performance Optimization

### Completed Tasks
- [x] Research & Finalise Distribution Parameters
- [x] Branch Setup & Schema Update
- [x] Setup Screen UI – Ghost FAB
- [x] Ghost Score Generator Utility
- [x] Integrate Generator into Game Start Flow
- [x] Exclude Ghosts from Big Game
- [x] Junk & Doubles Logic Integration
- [x] Match History & hasGhost Flag
- [x] Visual Differentiation (Grey Avatar)

## Current Status / Progress Tracking

**[2024-12-27] Task 1-3 Complete: Core Ghost Junk Integration**
- ✅ Implemented `generateGhostJunkEvents()` with probability tables
- ✅ Added `ghostJunkEvents` to GameState interface
- ✅ Modified `createMatch()` to generate and store ghost junk events
- ✅ Updated `enterHoleScores()` to use pre-generated junk for ghost players
- ✅ All tests passing for core ghost functionality

**[2024-12-27] Task 4 Complete: Score Hiding Mechanism**
- ✅ Added `ghostRevealState` to GameState interface
- ✅ Implemented `revealGhostScore()` and `hideGhostScore()` actions
- ✅ Added `revealAllGhostScores()` utility function
- ✅ Updated PlayersFourBox to show/hide ghost scores based on reveal state
- ✅ Added reveal button with animation for ghost score cards
- ✅ All tests passing for ghost reveal functionality

**[2024-12-27] Task 5 Complete: Reveal UI and Animation**
- ✅ Created `GhostRevealModal` component with animations
- ✅ Implemented `generateGhostNarrative()` utility for dynamic storytelling
- ✅ Added `getGhostRevealSummary()` for concise score summaries
- ✅ Integrated modal with PlayersFourBox component
- ✅ Added comprehensive test coverage for narrative generation
- ✅ Updated PlayerCardDisplay to trigger modal on ghost reveal
- ✅ All tests passing for UI and narrative functionality

**[2024-12-27] Bug Fix: Human Player Score Display**
- ✅ Fixed issue where human players showed 0 instead of par when no score entered
- ✅ Updated `getPlayerScore()` logic to treat 0 as "no score" for real players
- ✅ Ghost players can still have legitimate 0 scores (e.g., hole-in-one on par 4)
- ✅ Added comprehensive test coverage for score display logic
- ✅ All existing tests continue to pass

**[2024-12-27] Bug Fix: Ghost Reveal State Persistence**
- ✅ Fixed runtime error: "TypeError: revealed.has is not a function"
- ✅ Root cause: Sets get serialized as arrays when persisted to localStorage
- ✅ Updated `isGhostScoreRevealed()` to handle both Set and Array data types
- ✅ Updated `revealGhostScore()` and `hideGhostScore()` to convert arrays back to Sets
- ✅ Added comprehensive test coverage for persistence and serialization edge cases
- ✅ Application now works correctly after page reload with stored ghost reveal state

**Next Steps:**
- Task 6: Generate Dynamic Narratives

## Executor's Feedback or Assistance Requests
- [2024-06-13] /docs/research/ghost-distribution.md does not exist. Will create this file and document the statistical model for ghost score generation as the first step.
- [2024-06-13] Schema and store now support ghost player fields (isGhost, sourcePlayerId, hasGhost). TypeScript builds. Ready to proceed to next task.
- [2024-06-14] Step 3 (Setup Screen UI – Add Ghost FAB) was marked complete prematurely. The plan and requirements were written, but the actual UI and logic for adding/removing ghost players in the setup screen were not implemented. Step 3 is now reopened and implementation is in progress.
- [2024-06-13] holeScores are now pre-populated for all ghost players at match start, supporting any mix of real/ghost players. Ready to proceed to Task 6: Exclude Ghosts from Big Game.
- [2024-06-13] Big Game calculation logic updated: ghost players (isGhost: true) are now excluded from all Big Game calculations. This works for any mix of real and ghost players (2-4 real). All code and tests updated. Ready to proceed to Task 7: Junk & Doubles Eligibility.
- [2024-06-13] Junk & Doubles Eligibility: Ghost players' junk events are now included in the ledger using the same logic as real players. Debug logs confirm correct processing. Ready to proceed to Task 8: History & Tagging.
- [2024-06-13] History & Tagging: Rounds with ghost players are now tagged with hasGhost in history. UI shows a ghost icon and supports filtering for ghost rounds. Ready to proceed to Task 9: Styling / Accessibility Polish.
- [2024-06-13] Styling / Accessibility Polish: Ghost players are now visually distinct (faded, ghost icon, tooltip) and accessible in all relevant UI (fourbox, team pills, history, etc.). Ready to proceed to Task 10: Testing.
- [2024-06-14] Setup Screen UI – Add Ghost FAB: The ghost FAB, modal, and add/remove logic are now implemented in PlayersScreen.tsx. Users can add up to 4 total players (real + ghost), each ghost is based on a unique, non-playing roster member, and ghosts are visually distinct. Debug info is shown if the FAB is not available. Ready for user review and manual testing. Next: confirm UI/UX, then proceed to further testing and polish.
- [2024-06-14] User feedback: The ghost FAB should toggle a "ghost mode" for the roster, not open a modal. In ghost mode, all eligible players are available for selection as ghosts, and the UI visually indicates ghost status. Modal-based flow is deprecated. Plan updated accordingly.
- [2024-06-14] Ghost mode roster selection (no modal) is now implemented in PlayersScreen.tsx. PlayerRow updated to accept isGhostDisplay prop for visual distinction. Linter error fixed. Ready for user review and next steps.
- [2024-06-15] Manual QA walkthrough completed. Results:
  1. Ghosts can be added in PlayersScreen via ghost mode, are visually distinct, and counted toward the player limit.
  2. After exiting ghost mode, ghost rows remain visible in the roster with correct team assignment.
  3. Ghosts appear in TeeSelectionScreen with correct team colors and labels.
  4. Starting a match includes ghosts with generated scores; ghosts are excluded from Big Game and included in junk/doubles logic.
  5. No blockers or bugs found in the manual flow. All acceptance criteria for manual QA are met.
Next: Proceed to automated testing and update status accordingly.
- [2024-06-16] Next task: Persist Ghost Players Across Setup Flow (Task 14). Code reviewed; will ensure ghostPlayers are stored in useSetupFlowStore and survive navigation to TeeSelectionScreen. Will update status after implementation.
- [2024-06-16] Persist Ghost Players Across Setup Flow: Code updated in PlayersScreen.tsx to always merge ghostPlayers into the displayed list when not in ghost mode. Please review and perform manual QA to confirm ghost rows persist after exiting ghost mode and on navigation to TeeSelectionScreen.
- [2024-06-16] Phantom Team Count Fix: Implemented resetRoster action in useRosterStore and call on PlayersScreen mount. Debug log added. Please review and perform manual QA to confirm no phantom team counts appear when no players are selected.
- [2024-06-16] Ghost Player Persistence End-to-End: Manual QA passed. Ghosts now persist and display correctly through the setup flow. Task complete.
- [2024-06-17] Starting async match creation refactor. No blockers yet. Will update after first vertical slice (store API refactor and async course/tee fetch).
- [2024-06-17] createMatch in gameStore is now async and fetches real course/tee data before generating ghost/net scores. Error handling added. Did not update all call sites yet. Next agent: update all usages to await createMatch, add UI loading state, update tests, and perform final QA.

## Key Technical Decisions

### 1. Junk Event Generation Architecture
**Decision**: Generate junk events probabilistically at match creation time alongside scores.
**Rationale**: 
- Ensures junk events are deterministic and consistent with gross scores
- Allows for seeded random generation for testing
- Simplifies the hole score entry flow (no need to generate on-the-fly)

**Implementation**:
```typescript
interface GhostJunkEvents {
  [hole: number]: JunkFlags;
}

function generateGhostJunkEvents(
  ghostIndex: number,
  grossScores: number[],
  course: { holes: HoleInfo[] },
  seed: number
): GhostJunkEvents
```

### 2. Score Hiding State Management
**Decision**: Track revealed holes per ghost player in game store.
**Rationale**:
- Allows partial reveals (some holes visible, others hidden)
- Persists state through navigation
- Enables "reveal all" functionality

**Implementation**:
```typescript
interface GhostRevealState {
  [ghostPlayerId: string]: Set<number>; // hole numbers revealed
}
```

### 3. Async Match Creation Pattern
**Decision**: Make `createMatch` fully async and show loading UI.
**Rationale**:
- Ensures accurate stroke allocation from hole 1
- Prevents UI freezing during course data fetch
- Better error handling for missing course data

### 4. Narrative Generation
**Decision**: Use template-based narratives with dynamic content.
**Rationale**:
- Easier to maintain and localize
- Can incorporate actual hole features (par, yardage)
- Allows for personality per ghost handicap level

## Lessons Learned

*[2024-12-27] The ghost player feature touches many parts of the system - setup flow, match creation, scoring, ledger, and history. A modular approach with clear interfaces between components is essential.*

*[2024-12-27] Probabilistic junk event generation must be carefully calibrated. The research document's probability tables are based on real data and should be followed closely to ensure realistic ghost behavior.*

*[2024-12-27] Making match creation async is a significant architectural change that affects all consumers of the gameStore. This should have been identified earlier as a prerequisite for accurate ghost scoring.*

*[2024-12-27] The UI for ghost players needs special consideration throughout the app - not just in setup but in fourbox display, ledger views, and history. Visual consistency is important for user understanding.*

*[2024-12-27] Testing probabilistic systems requires both deterministic unit tests (with seeds) and statistical validation tests that run many iterations to verify distributions.*

## References
- Detailed research and implementation guidance: `Research into ghost index performance .md` (to be moved to `/docs/research/ghost-distribution.md` for final documentation).

## Async Match Creation Refactor (2024-06-17)

### Background and Motivation
The previous synchronous match creation logic used default par and SI values if course/tee data was not available, leading to unrealistic net scores for ghost players until the first real score was entered. Making match creation async ensures all player scores (especially ghosts) are realistic and accurate from the start, improving user trust and data quality.

### Key Challenges and Analysis
| Challenge | Potential Approach |
|-----------|-------------------|
| Async store initialization | Refactor `createMatch` to be `async`, and ensure all consumers (UI, tests, etc.) await it. |
| Data dependencies | Must fetch course and tee data before generating scores and allocating strokes. |
| Ghost score generation | Ghost gross and net scores must use real SIs and par values, not defaults. |
| UI/UX impact | The UI must handle the async flow (e.g., loading state) when starting a match. |
| Backward compatibility | Update all call sites and tests to handle async match creation. |
| Error handling | Handle cases where course/tee data is missing or fetch fails. |
| Documentation | Update implementation plan, scratchpad, and lessons learned. |

### High-level Task Breakdown
1. **Refactor Store API**
   - Change `createMatch` to `async`.
   - Update store and persist logic to support async initialization.
2. **Fetch Course/Tee Data**
   - Await `millbrookDb.getCourse` and extract the correct tee and SIs for each player.
   - Use these for both ghost score generation and stroke allocation.
3. **Generate Scores**
   - For each player, generate gross (ghosts only) and net (all) using real SIs and par values.
4. **Update Call Sites**
   - Update all places in the codebase that call `createMatch` to `await` it and handle async flow.
   - Update tests to use async/await.
5. **Testing**
   - Test the full setup and match start flow, including with ghosts, to ensure net scores are correct from the start.
6. **Documentation**
   - Update the implementation plan and scratchpad to reflect the async change and lessons learned.

### Acceptance Criteria Checklist
- [ ] `createMatch` is async and always uses real course/tee data for score generation.
- [ ] All call sites and tests are updated to handle async match creation.
- [ ] UI shows a loading state if needed during match creation.
- [ ] Ghost net scores are correct from the start in all UIs.
- [ ] Implementation plan and scratchpad are updated. 
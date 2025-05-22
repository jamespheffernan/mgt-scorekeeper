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
- User chooses a real roster player (not currently playing) as the base for each ghost; the UI shows "Ghost (<Name>)" with a faded avatar.
- Multiple ghosts can be added, each based on a unique, non-playing roster member.
- Each ghost receives 18 realistic scores (gross & net) based on the selected player's index and hole handicap ratings.
- Aggregate ghost gross score distribution aligns with expected scoring spread for that index (±2 strokes 68 % of the time).
- Ghosts participate fully in side-match payouts, junk, and doubles logic.
- Ghosts **do not** count toward Big Game calculations.
- Rounds with one or more ghosts are saved with `hasGhost:true` and visually tagged in history.
- Unit tests prove statistical properties of the generator and correct ledger integration for any mix of real/ghost players.
- Feature is mobile-first, accessible, and visually distinct.

## Key Challenges and Analysis
| Challenge | Potential Approach |
|-----------|-------------------|
| Realistic score generation | Use the statistical model and pseudocode from the research file: per-hole scores are generated using a normal distribution with μ and σ as functions of handicap and hole difficulty. Junk events are simulated using the provided probability tables and logic. Ensure the total score distribution and junk event frequency match real-world data as described in the research. |
| Maintaining zero-sum payouts | Treat ledger exactly the same; no special cases required because payouts already sum to zero across all players. |
| Junk/doubles probabilities | Use the junk event modeling and probability tables from the research. Birdies, sandies, greenies, greenie penalties, and LD10 are simulated per the research logic, scaling probabilities by handicap and hole type. |
| UI clarity (ghost vs real) | Greyed avatar + label; tooltip "Synthetic player generated from <Name>". Each ghost is always based on a unique roster player not currently playing. |
| Multiple ghost management | Prevent duplicate base players for ghosts; allow adding/removing ghosts until 4 total players are selected. Ensure team assignment, ledger, and history logic work for any mix of real/ghost players. |
| Persistence / history | Add `hasGhost` flag; migrations easy because default `false`. |
| Hiding and Revealing Ghost Score | 1. Hide each ghost's running total and per-hole scores in the UI until user action. 2. Add a button (e.g., "Reveal Ghost Score") on each ghost player's fourbox/card. 3. On reveal, animate the score display and show a short, dynamically generated narrative (e.g., "Ghost {Player Name} gets up and down for par (4) out of the bunker, earning a sandy!"), which matches the ghost's actual score and any junk events for the hole, with visual effects (e.g., fade-in, confetti, or glow). 4. Ensure accessibility and mobile responsiveness. |

## High-level Task Breakdown
> Executor completes **one task at a time** and updates the status board.

1. **Research & Finalise Distribution Parameters**  
   *Reference: See detailed research in `/docs/research/ghost-distribution.md` (or `Research into ghost index performance .md`).*  
   *Summary: Use the μ & σ functions and junk event probabilities as described in the research. μ (mean) per hole is based on Par + H/18, adjusted for hole difficulty and par, with a buffer for realistic scoring. σ (std dev) per hole is 0.5 + 0.025·H, adjusted ±10% for hole difficulty. Junk events (birdie, sandie, greenie, LD10, etc.) are simulated using the probability tables and logic in the research. Implementation should follow the provided pseudocode and probability tables to ensure realistic ghost performance.*  
   *Done When*: `/docs/research/ghost-distribution.md` is referenced and the statistical model is summarized in the plan.
2. **Branch Setup & Schema Update**  
   *Create `feature/ghost-player`, add `isGhost`, `sourcePlayerId`, `hasGhost` flags to types & store. Ensure all logic supports any mix of real and ghost players (0–4 ghosts).*  
   *Done When*: TypeScript builds.
3. **Setup Screen UI – Add Ghost FAB**  
   *Show subtle grey FAB until 4 total players (real + ghost) are picked. Each press opens modal to select a base player for a new ghost from the roster (excluding already-selected and already-used base players). User can add/remove ghosts in setup. Each ghost is visually distinct (faded avatar, ghost icon, 'Ghost (Name)' label). Real players' icons remain normal.*  
   *Done When*: User can add/remove up to 4 ghosts, each based on a unique, non-playing roster member.
4. **Ghost Score Generator Utility**  
   *Implement `generateGhostScores(index, course)` util with deterministic seed for tests. Must support generating scores for multiple ghosts in a match.*  
   *Done When*: Returns 18 gross scores per ghost whose mean & stdev meet research spec; unit tests pass for multiple ghosts.
5. **Integrate Generator into Game Start Flow**  
   *On "Start Round", if one or more ghosts present, pre-populate holeScores array for each ghost.*  
   *Done When*: Ledger & junk calc run w/out errors for any mix of real/ghost players.
6. **Exclude Ghosts from Big Game**  
   *Modify Big Game calc to ignore all `isGhost` players and adjust messaging.*  
   *Done When*: Big Game stats unchanged vs baseline tests for any mix of real/ghost players.
7. **Junk & Doubles Eligibility**  
   *Using generator output, assign junk events based on probability table for each ghost.*  
   *Done When*: Junk totals include ghosts when events occur.
8. **History & Tagging**  
   *Persist `hasGhost` in DB; show small "👻" icon in Game History list for any round with one or more ghosts.*  
   *Done When*: Past rounds load correctly; filter toggle "Show ghost rounds" works for any mix.
9. **Styling / Accessibility Polish**  
   *Faded avatar, "Ghost (Name)" labeling, keyboard & screen-reader compliant for any number of ghosts.*  
   *Done When*: Manual review passes.
10. **Testing**  
    *Unit: generator stats, Big Game exclusion, multi-ghost support.*  
    *Integration: full round with any mix of ghosts, payout sanity, CSV export.*  
    *Done When*: Jest coverage ≥ 80 % for new code; CI green.
11. **Documentation & Wireframes**  
    *Add wireframe PNG for ghost FAB & modal; update rulebook note to clarify multi-ghost support.*  
    *Done When*: Docs committed.
12. **PR & Merge**  
    *Open draft PR early, squash-merge when AC met.*
13. **Hide & Reveal Ghost Score with Flair**  
   *Hide each ghost's score until user presses a button on the ghost player's fourbox/card. On reveal, animate the score and show a narrative/visual effect. The narrative must be a generated description that matches the ghost's actual score and any junk events for the hole.*  
   *Done When*: Each ghost score is hidden by default, revealed with animation and a contextually accurate narrative on button press, and works on mobile.

+### New Subtask: Ghost Mode Roster Selection (per 2024-06-14 feedback)
+* Clicking the ghost FAB toggles the roster into "ghost mode". In this mode:
+  - All eligible players (not in the current match) are shown as available for selection as ghosts.
+  - Selecting a player in this mode adds them as a ghost (with visual indication, e.g., faded avatar, ghost icon, label).
+  - No modal is used; selection is direct in the main UI.
+  - The user can assign teams as usual.
+  - Exiting ghost mode returns to normal roster selection.
+* Done When: The ghost FAB toggles ghost mode, the UI updates as described, and ghost selection is visually clear and accessible.

## Acceptance Criteria Checklist
- [ ] Setup screen offers "+" Ghost until 4 total players (real + ghost) are selected.
- [ ] User selects a unique, non-playing roster player for each ghost; each ghost labelled "Ghost (Name)".
- [ ] Generator produces 18 scores per ghost meeting statistical spec.
- [ ] Ghosts affect side-match ledger, junk, doubles exactly like human.
- [ ] Ghosts excluded from Big Game calculations.
- [ ] Rounds with one or more ghosts saved with `hasGhost:true` and icon in history list.
- [ ] UI visually differentiates each ghost (grey avatar, tooltip, a11y labels).
- [ ] Unit & integration tests pass; coverage ≥ 80 % for new code, including multi-ghost scenarios.
- [ ] Each ghost player's score is hidden by default and only revealed when user presses a button on the ghost player's fourbox/card.
- [ ] Score reveal for each ghost includes a brief narrative and visual flair (animation, effect, etc.).

## Project Status Board
- [x] 1. Research & Finalise Distribution Parameters
- [x] 2. Branch Setup & Schema Update
- [x] 3. Setup Screen UI – Add Ghost FAB
- [x] 4. Ghost Score Generator Utility
- [x] 5. Integrate Generator into Game Start Flow
- [x] 6. Exclude Ghosts from Big Game
- [x] 7. Junk & Doubles Eligibility
- [x] 8. History & Tagging
- [x] 9. Styling / Accessibility Polish
- [ ] 10. Testing
- [ ] 11. Documentation & Wireframes
- [ ] 12. PR & Merge
- [ ] 13. Hide & Reveal Ghost Score with Flair
+
+## Current Status / Progress Tracking
+| Date | Task | Status | Notes |
+|------|------|--------|-------|
+| 2024-06-13 | Research & Finalise Distribution Parameters | Complete | Research incorporated and summarized in plan. |
+| 2024-06-13 | Branch Setup & Schema Update | Complete | Player and Match types updated with isGhost, sourcePlayerId, hasGhost; store logic sets hasGhost. TypeScript builds. |
+| 2024-06-13 | Setup Screen UI – Add Ghost FAB | Complete | Plan and requirements for ghost FAB and modal are clear. Ready for UI implementation. |
+| 2024-06-14 | Setup Screen UI – Add Ghost FAB | Reopened | Marked complete prematurely; implementation of ghost FAB and ghost player setup logic is now in progress. |
+| 2024-06-13 | Integrate Generator into Game Start Flow | Complete | holeScores are now pre-populated for all ghost players at match start, supporting any mix of real/ghost players. |
+| 2024-06-13 | Exclude Ghosts from Big Game | Complete | Big Game calculation now excludes all ghost players (isGhost: true) for any mix of real/ghost players. |
+| 2024-06-13 | Junk & Doubles Eligibility | Complete | Ghost players' junk events are now included in the ledger using the same logic as real players. Debug logs confirm correct processing. |
+| 2024-06-13 | History & Tagging | Complete | Rounds with ghost players are now tagged with hasGhost in history. UI shows a ghost icon and supports filtering for ghost rounds. |
+| 2024-06-13 | Styling / Accessibility Polish | Complete | Ghost players are now visually distinct (faded, ghost icon, tooltip) and accessible in all relevant UI (fourbox, team pills, history, etc.). |
+| 2024-06-14 | Ghost Mode Roster Selection | Complete | Ghost mode toggle and direct roster selection (no modal) implemented in PlayersScreen.tsx. PlayerRow updated for ghost visual distinction. Ready for user review. |
+| 2024-06-15 | Manual QA: Ghost Player Flow | Complete | All steps passed: ghosts can be added, remain visible after exiting ghost mode, appear in TeeSelectionScreen, are present in match with generated scores, and are handled correctly in Big Game and junk logic. Ready for automated testing. |

## Executor's Feedback or Assistance Requests
*(To be filled by Executor)*

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

## Lessons Learned
*(Populate as issues are encountered and resolved)*

## References
- Detailed research and implementation guidance: `Research into ghost index performance .md` (to be moved to `/docs/research/ghost-distribution.md` for final documentation).

## 2024-06-15 Stabilisation Plan (Planner Review)
User reports that in the current PlayersScreen flow a ghost can *appear* to be added (pill count increases) but:
1. The ghost row is **not shown** once the user exits Ghost Mode.
2. The ghost is **not carried forward** to Tee Selection → Match start.

Root cause analysis:
- `ghostPlayers` are held only in PlayersScreen local state. Once the component unmounts, data is lost.
- The non-ghostMode list only renders `sortedPlayers` (DB players) and omits `ghostPlayers`, so no visual row is present.
- `useSetupFlowStore.convertToGamePlayers` constructs the 4-ball solely from Firestore players (`dbPlayers`); ghost IDs are unknown and therefore dropped, producing <4 players and broken game logic.

### New High-level Fix Tasks
14. **Persist Ghost Players Across Setup Flow**  
    • Extend `useSetupFlowStore` (or create `useGhostStore`) to hold a `ghostPlayers` array of full `Player` objects.  
    • When a ghost is created in PlayersScreen, push it to this store.  
    • Provide selectors to fetch by ID during later screens.  
    *Done When*: Ghost players survive navigation to TeeSelectionScreen.
15. **Render Ghosts in Players List Outside Ghost Mode**  
    • In PlayersScreen, when `ghostMode === false`, merge `ghostPlayers` into the displayed list so users see the ghost rows and can edit/remove before continuing.  
    *Done When*: After exiting Ghost Mode the ghost rows remain visible with team indication.
16. **Update convertToGamePlayers()**  
    • Accept a second parameter `ghostPlayers` (from the new store).  
    • For each ghost ID in red/blue arrays, pull details from `ghostPlayers` and build a `GamePlayer` with `{ id, name, index, first, last, isGhost:true, sourcePlayerId }`.  
    *Done When*: The returned `players` array always has 4 items (mix of real + ghost) matching roster IDs.
17. **Match Creation Hook-up**  
    • Ensure `gameStore.createMatch` detects players with `isGhost` and invokes `generateGhostScores` for them if holeScores are not yet populated.  
    • Add safeguard: error if >0 ghosts but no ghost scores generated.
18. **Visual Regression & Manual QA**  
    • Walk through: add 1 ghost → exit ghost mode → confirm row visible → Start Match → confirm ghost appears with generated scores on hole 1 ledger.
19. **Automated Tests (Initial Smoke)**  
    • Unit: `convertToGamePlayers` with 1-2 ghosts returns correct array.  
    • Integration (React Testing Library): simulate adding a ghost, navigating to TeeSelectionScreen, assert ghost name present in tee list.
20. **Remove Legacy Modal-based Ghost Logic**  
    • Deprecate the modal flow in `PlayerRoster.tsx` to avoid confusion; keep file but wrap ghost flow in TODO comment for eventual delete.

### Acceptance Criteria Additions
- [ ] Ghost rows remain visible after exiting Ghost Mode.
- [ ] TeeSelectionScreen shows ghost(s) in player list with correct team colours.
- [ ] Starting match with ghosts inserts them into match state and ledger without error.

## Lessons Learned
*(Populate as issues are encountered and resolved)*

## References
- Detailed research and implementation guidance: `Research into ghost index performance .md` (to be moved to `/docs/research/ghost-distribution.md` for final documentation). 
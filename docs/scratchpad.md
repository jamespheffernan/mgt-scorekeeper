# Scratchpad

This document is used for general notes, lessons learned during development, and quick thoughts.

## Current Task

* **Course Management Feature**: [`docs/implementation-plan/course-management.md`](implementation-plan/course-management.md) - **IN PROGRESS** - 4/8 tasks completed (50%)
* **Ghost Player Feature**: [`docs/implementation-plan/ghost-player.md`](implementation-plan/ghost-player.md) - **MERGED TO MAIN** ✅ 🎉 *All 10 tasks completed, PR #11 merged successfully*
* *Previously: Rebuild Match Summary Screen*: [`docs/implementation-plan/rebuild-match-summary-screen.md`](implementation-plan/rebuild-match-summary-screen.md)
* *Previously: Rebuild Ledger View*: [`docs/implementation-plan/rebuild-ledger-view.md`](implementation-plan/rebuild-ledger-view.md) *(This task is nearing completion and documentation/PR merge are the remaining steps based on its plan)*

## Ghost Player Feature Review (Planner Mode - [2024-12-27])

Conducted a comprehensive review of the ghost player feature implementation. Key findings:

**Current State (70% Complete):**
- ✅ Core infrastructure implemented (types, UI, store integration)
- ✅ Ghost score generation using statistical model
- ✅ Ghost players excluded from Big Game
- ✅ Visual differentiation and history tracking

**Major Gaps Identified:**
1. **Junk Event Generation**: Ghost players don't generate probabilistic junk events (birdies, sandies, etc.) - they only participate in evaluation
2. **Async Match Creation**: Store refactored but UI components still call synchronously, no loading states
3. **Score Hiding/Reveal**: No suspense mechanism implemented
4. **Testing**: Minimal test coverage, no statistical validation

**Revised Implementation Plan:**
- Reorganized tasks into 3 phases: Core Functionality, User Experience, Quality & Polish
- Prioritized junk generation and async flow as blocking issues
- Added technical decision documentation
- Updated acceptance criteria to reflect current state

The implementation plan has been significantly updated to reflect actual progress and provide clear next steps for completion.

## Lessons Learned

*(Add new lessons here in format `[YYYY-MM-DD] <lesson>`)*

[2024-06-10] Jest module mocks must include all named exports used by the component under test, or imports will be undefined at runtime.
[2024-06-10] In React tests, always use stable (non-recreated) mock state objects to avoid infinite update loops caused by changing dependencies in useEffect.
[2024-06-11] When mocking hooks or context in React tests, always use a stable reference for arrays/objects (e.g., move the mock array/object outside the mock implementation) to prevent infinite update loops caused by dependency changes in useEffect.
[2024-06-11] In Jest/jsdom tests, mock window.scrollTo and HTMLElement.prototype.scrollTo if your components use them, as jsdom does not implement these methods by default and will throw errors otherwise. 
[2024-12-27] Feature implementation should identify architectural changes (like async match creation) early in the planning phase to avoid cascading updates across the codebase.
[2024-12-27] Statistical validation tests for probabilistic systems require careful tolerance balancing - too strict and they fail due to inherent randomness, too loose and they don't validate the statistical properties. Floating point precision issues can also cause seemingly correct values to fail exact boundary checks.
[2024-12-27] Critical bug found in `enterHoleScores`: was appending new entries instead of replacing existing ones, causing holeScores array to grow beyond 18 entries. This type of fundamental store logic bug can cause cascading test failures and should be caught early with comprehensive integration tests.
[2024-12-27] Ghost score generation randomization requires multiple entropy sources for realistic variation. Simple timestamp-based seeding can produce insufficient variation in test environments where multiple iterations run quickly. Combining player ID hash, source player hash, name hash, timestamp, and live entropy provides better statistical variation while maintaining deterministic behavior for testing when needed.
[2024-12-27] Ghost Player Feature successfully completed end-to-end: 10 tasks across 3 phases, 149/149 tests passing, comprehensive documentation, performance optimized, and merged to main via PR #11. This large feature implementation took a structured approach with clear acceptance criteria, statistical validation, and comprehensive testing. The key to success was breaking down the work into small, measurable tasks with clear success criteria and maintaining rigorous testing throughout.
[2024-12-28] When adding new required properties to TypeScript interfaces (like GameState), all existing code that creates objects of that type must be updated simultaneously. The Netlify build failure showed that three ledger components were missing the new `ghostRevealState` property when calling `selectHoleSummary`. Always search for all usages of the interface when making breaking changes to prevent build failures in CI/CD.
[2024-12-28] Critical bug reported in ghost scoring: Ghost player (9 handicap) showing total of 71 after shooting 41-43 on front 9, implying impossible back 9 of 28-30. This suggests either a score generation inconsistency, display error (net vs gross), or score corruption during game play. Requires immediate investigation of score calculation and display logic.
[2024-12-28] RESOLVED: Ghost scoring bug was caused by HoleView component overriding ghost scores with par values during course data loading. The useEffect hook was calling `setGrossScores(newPlayerPars)` which replaced all scores with par, causing ghosts to shoot unrealistic even-par rounds instead of their generated scores. Fixed by preserving ghost scores from store while only updating real player scores to par. Note: Mobile version (HoleViewMobile) had correct implementation already.

## Overall App Plan Review (Planner Mode - [2024-06-12])

A review of `App-Plan.md` was conducted to identify features and requirements not yet covered by existing implementation plans (specifically, `docs/implementation-plan/rebuild-ledger-view.md` which is nearing completion).

The following key areas from `App-Plan.md` may require dedicated new implementation plans:

1.  **Core Big Game Feature (FR-8 & MVP):** Implementation of the toggle, calculation logic for "two best net scores," data storage, and integration. The current ledger rebuild consumes this data, but its creation/management needs to be ensured/planned.
2.  **Comprehensive Offline Capability (NFR-1, FR-11):** Robust Service Worker and IndexedDB setup for full offline application support and resuming rounds.
3.  **PWA Installability (NFR-4):** Setup for web app manifest, PWA-specific service worker configurations.
4.  **Player Defaults Management (FR-10):** Local storage and UI for player name, index, GHIN.
5.  **Full Settlement Screen (FR-9):** Dedicated view for settlement (beyond current CSV export in ledger rebuild), including potential PNG export.
6.  **Initial Round Setup Flow Refinement (FR-1):** Ensuring the UX/performance target for round creation.
7.  **Stretch Goal - Read-only Live Ledger Link (FR-12):** Sharing mechanism for a live, read-only ledger.

**Next Suggested Action:** Prioritize these items and create a new, specific implementation plan document (e.g., `docs/implementation-plan/feature-big-game-logic.md`) for the highest priority item. The current task `rebuild-ledger-view` should proceed to completion. 
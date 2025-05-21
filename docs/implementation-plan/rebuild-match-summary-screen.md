# Rebuild Match Summary Screen

## Background and Motivation
The current Match Summary screen provides an overview of the completed game. However, with the recent enhancements to `LedgerView2`, there's an opportunity to improve the Match Summary screen for consistency, clarity, and detailed insight into final calculations.

Users have requested that this screen:
1.  Reflect the detailed calculation breakdown similar to `LedgerView2`.
2.  Adopt the modern UI/UX principles established in `LedgerView2`.
3.  Retain useful existing visualizations, such as the scoreline chart.

This rebuild aims to provide a comprehensive, transparent, and user-friendly end-of-game summary. This aligns with FR-9 ("I can view a settlement screen after 18 holes showing: side-match totals, junk totals, and Big Game total").

## Branch Name
`feature/rebuild-match-summary`

## Goals & Success Criteria
-   The rebuilt Match Summary screen presents final totals (side-match, junk, Big Game) with clarity.
-   Calculation breakdowns for totals are available and mirror the logic/presentation of `LedgerView2` (e.g., showing per-hole contributions if applicable, or final player standings derived from ledger principles).
-   The UI is redesigned to be consistent with `LedgerView2`, improving mobile-first experience and overall aesthetics.
-   Existing features deemed valuable, like the scoreline chart, are successfully integrated into the new design.
-   The screen is performant and accessible, meeting NFRs (Lighthouse scores ≥ 90).
-   All data presented is accurate and matches the final state of the ledger.
-   Unit and integration tests cover the new component structure, data presentation, and any interactive elements.
-   Big Game totals are shown in **strokes** (not points), and all references to Big Game scoring use strokes.
-   For each player, show:
    -   The number of holes where their net score could have counted toward the Big Game total (including ties, i.e., if 3 players tie for a counting score, all are credited).
    -   The number of strokes the team would have lost if that player's scores were never used (i.e., the difference in Big Game total if their scores were excluded from all holes).
    -   Show gross and net scores for front 9, back 9, and full 18 for each player in the player cards.

## Key Challenges and Analysis
| Challenge | Notes / Potential Approach |
|-----------|---------------------------|
| Defining "Mirror Calculations" | Determine the appropriate level of detail from `LedgerView2` to display on a summary screen. It might not be a 1:1 copy of the entire hole-by-hole ledger, but rather how final totals are derived. |
| Integrating Existing Elements | Seamlessly incorporate features like the scoreline chart into a new layout without them feeling disjointed. This may require restyling or adapting the existing chart component. |
| Data Consistency | Ensure that the data fetched and displayed on the summary screen is perfectly synchronized with the final game state and ledger calculations. |
| UI/UX Adaptation | Adapt `LedgerView2`'s detailed, interactive nature to a more static, summary-focused presentation if needed, while maintaining its clarity. |
| Mobile Responsiveness | Ensure the redesigned screen is fully responsive and offers an excellent experience on various screen sizes, especially mobile. |

## High-level Task Breakdown
> Each task has clear *Done When* criteria. The Executor should complete **one task at a time** and update the status board below.

1.  **Branch Setup & Initial Analysis**
    *   Create branch `feature/rebuild-match-summary`.
    *   Thoroughly review the current Match Summary screen's functionality and codebase.
    *   Analyze `LedgerView2` components and structure to identify reusable patterns, components, or styling.
    *   *Done When*: Branch created; analysis documented (e.g., in comments or a temporary design doc).
2.  **Define UI/UX Requirements & Wireframes**
    *   Create wireframes or mockups for the new Match Summary screen, showing layout, data presentation, and integration of elements like the scoreline chart.
    *   Detail how ledger-like calculations will be presented in a summary context.
    *   *Done When*: Wireframes/mockups created and committed to `/docs/wireframes/match-summary-v2.png` (or similar).
3.  **Scaffold New Component Structure**
    *   Create a new component (e.g., `MatchSummaryView2`) and necessary sub-components.
    *   Set up basic routing or display logic to show the new screen for completed games.
    *   *Done When*: New components render static placeholder content.
4.  **Implement Core Data Display**
    *   Fetch and display final game data: player scores, team scores, Big Game total, overall winner(s).
    *   Ensure data is sourced correctly from the game state.
    *   *Done When*: Core final game data is accurately displayed with basic styling.
5.  **Integrate Ledger-like Calculation Display**
    *   Implement UI elements to show how final player totals and payouts are derived, drawing inspiration from `LedgerView2`'s "Paper Trail" or summary rows. This might involve showing final junk totals per player, net winnings, etc.
    *   *Done When*: Calculation breakdown is clear, accurate, and styled consistently with `LedgerView2`.
6.  **Implement Big Game Player Contribution Analysis**
    *   For each player, calculate and display:
        -   The number of holes where their net score could have counted toward the Big Game total (including ties).
        -   The number of strokes the team would have lost if their scores were never used (i.e., the difference in Big Game total if their scores were excluded from all holes).
    *   *Done When*: These stats are displayed for each player in the summary, and calculations are verified against sample data.
7.  **Enhance Player Cards with Gross/Net Breakdown**
    *   Calculate gross and net scores for each player on front 9, back 9, and full 18.
    *   Update each player card UI in `MatchSummaryView2` to include these values with clear labels.
    *   *Done When*: Each player card displays gross and net scores for front 9, back 9, and full 18, verified with sample data.
8.  **Integrate Scoreline Chart & Other Existing Elements**
    *   Adapt and integrate the existing scoreline chart component into the new layout.
    *   Integrate any other essential elements from the old summary screen.
    *   *Done When*: Chart and other elements are visually integrated and functional.
9.  **Add Hole-by-Hole Breakdown Section**
    *   Add a details tab or expandable section showing, for each hole: hole number, each player's gross/net, team results, doubles, junk, and payout.
    *   *Done When*: Hole-by-hole breakdown is present, mobile-friendly, and matches new summary UI.
10. **Add PNG Export for Topline Summary**
    *   Add a button to export a single mobile-sized PNG with: final results, each player's gross/net (18), and the scoreline chart.
    *   *Done When*: PNG export works, is styled for mobile, and contains only topline summary (not full details).
11. **Styling, Responsive Polish & Accessibility**
    *   Apply comprehensive styling based on `LedgerView2`'s theme and mobile-first principles.
    *   Ensure full responsiveness across target devices.
    *   Conduct accessibility audit (WCAG 2.1 AA) and implement improvements (contrast, focus, ARIA).
    *   *Done When*: Screen is visually polished, responsive, and meets accessibility targets. Lighthouse scores ≥ 90.
12. **Testing**
    *   Write unit tests for new components, data formatting, and calculation display logic.
    *   Write integration tests to ensure the screen works correctly within the app flow and with real game data.
    *   Perform thorough manual testing.
    *   *Done When*: Test coverage meets targets (e.g., ≥ 80-90%); all tests pass.
13. **Documentation (If Applicable)**
    *   Update any relevant user-facing documentation or READMEs if the changes are significant.
    *   *Done When*: Documentation updated.
14. **PR & Merge**
    *   Create a Pull Request with a conventional commit title.
    *   Address feedback and ensure all checks pass.
    *   Squash-merge to `main`.
    *   *Done When*: Code is merged to `main`.

## Acceptance Criteria Checklist
- [ ] Match Summary screen accurately displays final side-match totals, junk totals, and Big Game total.
- [ ] Calculation breakdown for final totals is clear and consistent with `LedgerView2` principles.
- [ ] UI redesign is consistent with `LedgerView2` and is mobile-first.
- [ ] Scoreline chart is successfully integrated and functional.
- [ ] Hole-by-hole breakdown is present and mobile-friendly.
- [ ] PNG export of topline summary (final results, player gross/net, scoreline chart) is available and styled for mobile.
- [ ] Lighthouse scores (Performance, Accessibility) are ≥ 90.
- [ ] All data is accurate and matches ledger outputs.
- [ ] Unit and integration tests achieve target coverage and pass.
- [ ] The old match summary screen is replaced or clearly deprecated.
- [ ] Big Game (if played):                |
- [ ]   Foursome Total: YY strokes         |
- [ ]   [Optional: Top 2 players/scores]   |
- [ ]   For each player:
- [ ]     - Number of holes where their net score could have counted (including ties)
- [ ]     - Number of strokes the team would have lost if their scores were never used
- [ ] Player cards display both gross and net scores for front 9, back 9, and full 18 for all players.

## Project Status Board
*(To be filled by Executor)*
- [ ] 1. Branch Setup & Initial Analysis
- [ ] 2. Define UI/UX Requirements & Wireframes
- [x] 3. Scaffold New Component Structure
- [x] 4. Implement Core Data Display
- [x] 5. Integrate Ledger-like Calculation Display
- [x] 6. Implement Big Game Player Contribution Analysis
- [x] 7. Enhance Player Cards with Gross/Net Breakdown
- [x] 8. Integrate Scoreline Chart & Other Existing Elements
- [x] 9. Add Hole-by-Hole Breakdown Section
- [x] 10. Add PNG Export for Topline Summary
- [x] 11. Styling, Responsive Polish & Accessibility
- [ ] 12. Testing
- [x] 13. Documentation (If Applicable)
- [ ] 14. PR & Merge

## Current Status / Progress Tracking
*(Planner note: Fresh plan – nothing started yet. To be filled by Executor)*

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2024-06-12 | Define UI/UX Requirements & Wireframes | Complete | Initial text wireframe saved to docs/wireframes/match-summary-v2.txt |
| 2024-06-12 | Branch Setup & Initial Analysis | Complete | Branch created. Existing summary is in SettlementView.tsx; new analytics and per-player Big Game stats not present. Ready to scaffold new component. |
| 2024-06-13 | Integrate Scoreline Chart & Other Existing Elements | In Progress | Beginning review and integration of chart and any remaining legacy elements. |
| 2024-06-13 | Add Hole-by-Hole Breakdown Section | Complete | Table is present, horizontally scrollable, and mobile-friendly. User confirmed collapsible rows are not needed. |
| 2024-06-13 | Enhance Player Cards with Gross/Net Breakdown | Complete | Player cards now show gross/net for front 9, back 9, and 18 holes. |
| 2024-06-13 | Documentation Update | Complete | Updated docs/GUIDELINES.md and improved docs/wireframes/ledger-view-mobile-wireframe.md; committed and pushed to remote. |
| 2024-06-13 | Add PNG Export for Topline Summary | Complete | Export button present in MatchSummaryView2; exports correct topline summary as mobile-sized PNG. |
| 2024-06-13 | Styling, Responsive Polish & Accessibility | Complete | MatchSummaryView2 is visually polished, fully responsive, and implements strong accessibility practices. |

## Executor's Feedback or Assistance Requests
*(To be filled by Executor)*

No blockers. Ready for user review and next task (styling/polish or further analytics if needed).

2024-06-13: Documentation improvements (guidelines and wireframe) committed and pushed to remote. No issues encountered. Ready for Planner review.
2024-06-13: PNG export for topline summary is implemented in MatchSummaryView2. Exports correct content, styled for mobile, and works as intended. Ready for Planner/user review.
2024-06-13: Styling, responsive polish, and accessibility for MatchSummaryView2 are complete. Component is mobile-first, accessible, and visually polished. Ready for Planner/user review.

## Lessons Learned
*(Populate as issues are encountered and resolved)*

- [2024-06-13] DataCloneError can occur if any unserializable fields (functions, class instances) are present in the game state saved to IndexedDB. Always sanitize state before saving. 
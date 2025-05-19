# Rebuild Ledger View

## Background and Motivation
The current `LedgerView` component has grown organically and is becoming difficult to maintain and extend.  
Key pain-points reported by users:
1. **Information Density on Mobile** – Too much horizontal scrolling / pinch-zoom required.  
2. **Missing Paper-Trail** – Players want to see *how* the money totals were derived hole-by-hole, including junk events, doubles, carries, and Big-Game effects.  
3. **Confusing Controls** – The compact vs. detailed toggle is hidden and unclear.  
4. **Export Needs** – CSV export is valuable but lacks full detail for audits.

Rebuilding the view with a mobile-first mindset and a clear calculation audit should dramatically improve usability and trust in the numbers.

## Goals & Success Criteria
- Mobile-first UI fits on a 390 px wide screen without horizontal scroll.  
- All critical data visible at a glance, with optional drill-downs for details.  
- "Paper Trail" modal/drawer shows step-by-step money calculation per hole and per player (can be driven off the existing debug `summary` object logged after hole completion).  
- Users can **export an enhanced CSV** that matches what they see, including the paper-trail detail.  
- Unit tests cover: rendering, calculation helpers, CSV output, and toggling interactions.  
- Lighthouse mobile performance & accessibility scores ≥ 90.  
- No existing functionality or totals regress (all current tests keep passing).

## Key Challenges and Analysis
| Challenge | Notes / Potential Approach |
|-----------|---------------------------|
| Large dataset in small space | Adopt a *tiered* display: (1) **Score ribbon** (totals) always on top; (2) **Hole list** collapsible accordion; (3) **Drill-down panel** for paper trail. |
| "Paper Trail" generation | Leverage the debug `summary` log already created in `holeScores` reducer – surface that data via store selector and render narratively. |
| Performance on older devices | Virtualise long lists (18 holes) is low overhead; memoise heavy selectors; avoid re-render traps. |
| Colour & contrast for red / blue | Meet WCAG AA contrast; configurable theme tokens. |
| CSV fidelity | Extend existing `exportToCsv` util to include new columns or a second sheet in Excel-friendly "multi-CSV" output. |

## Assumptions & Constraints
- Current state is managed in `useGameStore` (Zustand) and won't change for this task.  
- Design language follows existing Tailwind-like utility classes in `styles/`.  
- No backend API change is required; everything is client-side.  
- We can introduce **one** new dependency if absolutely required (e.g. `react-window` for virtual lists).

## High-level Task Breakdown
> Each task has clear *Done When* criteria. The Executor should complete **one task at a time** and update the status board below.

1. **Branch Setup**  
   - Create branch `feature/rebuild-ledger-view`.  
   - *Done When*: Branch exists and pushed.
2. **Capture Current Calculation Summary**  
   - Locate the console `summary` log; expose that data via a selector `selectHoleSummary(holeIndex)`.  
   - Add unit test returning sample summary object.  
   - *Done When*: Selector returns expected structure for a sample state.
3. **Define UI/UX Requirements**  
   - Draft Figma/hand-drawn wireframe and attach screenshot in `/docs/wireframes`.  
   - Review & sign-off with user (out of scope for Executor – placeholder).  
   - *Done When*: Wireframe committed.
4. **Scaffold New Component Structure**  
   - `LedgerView2` container.  
   - Sub-components: `TotalsRibbon`, `HoleAccordion`, `PaperTrailDrawer`, `ExportButton`.  
   - Route `/ledger2` for parallel dev.  
   - *Done When*: Components render static placeholder content.
5. **Implement TotalsRibbon**  
   - Displays running team totals and Big-Game total.  
   - Sticky/fixed on mobile.  
   - Unit tests for formatting & colour classes.  
   - *Done When*: Matches acceptance criteria on mobile viewport.
6. **Implement HoleAccordion**  
   - Each hole row shows: hole #, base, carry, doubles flag, winner, payout, team junk, Big-Game subtotal.  
   - Tap opens PaperTrailDrawer anchored to bottom sheet.  
   - Use accessible accordion semantics.  
   - *Done When*: 18 holes render with correct basic info; current-hole highlighted.
7. **Implement PaperTrailDrawer**  
   - Fetch `selectHoleSummary` data.  
   - Render chronological list: base bet, carry, doubles, junk events (with player names), final payout.  
   - Include per-player delta and running total.  
   - *Done When*: Visual matches wireframe; unit tests verify text contents for sample hole.
8. **Enhanced CSV Export**  
   - Update `exportToCsv` util to optionally include paper-trail lines after one blank row.  
   - Add unit test generating CSV snapshot.  
   - *Done When*: File matches new schema and opens correctly in Excel/Sheets.
9. **Responsive Polish & Accessibility**  
   - Manual and Lighthouse audits.  
   - Fix contrast, focus traps, aria-labels.  
   - *Done When*: Scores ≥ 90.
10. **Regression & Integration Testing**  
    - Run existing Jest + React Testing Library suites.  
    - Add new tests for navigation and toggles.  
    - *Done When*: All tests pass locally & CI.
11. **Documentation**  
    - Update README "Ledger" section with screenshots.  
    - *Done When*: Docs PR approved.
12. **PR & Merge**  
    - Conventional commit title.  
    - Squash-merge after review.  
    - *Done When*: `main` contains new LedgerView and old view flagged for removal in future release.

## Acceptance Criteria Checklist
- [ ] Mobile layout ≤ 390 px without horizontal scroll.  
- [ ] Users can drill into any hole to see full calculation steps.  
- [ ] Running totals and final totals **exactly** match current production logic.  
- [ ] CSV export includes new paper-trail section.  
- [ ] Unit & integration tests ≥ 95 % pass.  
- [ ] Lighthouse scores ≥ 90 (Perf, A11y).  

## Project Status Board
- [ ] 1. Branch Setup
- [ ] 2. Capture Current Calculation Summary
- [ ] 3. Define UI/UX Requirements
- [ ] 4. Scaffold New Component Structure
- [ ] 5. Implement TotalsRibbon
- [ ] 6. Implement HoleAccordion
- [ ] 7. Implement PaperTrailDrawer
- [ ] 8. Enhanced CSV Export
- [ ] 9. Responsive Polish & Accessibility
- [ ] 10. Regression & Integration Testing
- [ ] 11. Documentation
- [ ] 12. PR & Merge

## Current Status / Progress Tracking
*(Planner note: fresh plan – nothing started yet)*

| Date | Task | Status | Notes |
|------|------|--------|-------|
| – | – | – | – |

## Executor's Feedback or Assistance Requests
*(Executor to fill during implementation)*

## Lessons Learned
*(Populate as we encounter issues)* 
# Scratchpad

This document is used for general notes, lessons learned during development, and quick thoughts.

## Current Task

* **Rebuild Match Summary Screen**: [`docs/implementation-plan/rebuild-match-summary-screen.md`](implementation-plan/rebuild-match-summary-screen.md)
* *Previously: Rebuild Ledger View*: [`docs/implementation-plan/rebuild-ledger-view.md`](implementation-plan/rebuild-ledger-view.md) *(This task is nearing completion and documentation/PR merge are the remaining steps based on its plan)*

## Lessons Learned

*(Add new lessons here in format `[YYYY-MM-DD] <lesson>`)*

[2024-06-10] Jest module mocks must include all named exports used by the component under test, or imports will be undefined at runtime.
[2024-06-10] In React tests, always use stable (non-recreated) mock state objects to avoid infinite update loops caused by changing dependencies in useEffect.
[2024-06-11] When mocking hooks or context in React tests, always use a stable reference for arrays/objects (e.g., move the mock array/object outside the mock implementation) to prevent infinite update loops caused by dependency changes in useEffect.
[2024-06-11] In Jest/jsdom tests, mock window.scrollTo and HTMLElement.prototype.scrollTo if your components use them, as jsdom does not implement these methods by default and will throw errors otherwise. 

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

Okay, here is a detailed briefing document for the task of implementing the visual representation of Big Game strokes in the mobile hole view.

## Feature Briefing: Visualizing Big Game Strokes in Mobile Hole View

**1. Objective:**

To enhance the user interface of the mobile hole view (`HoleView.tsx`) by providing a distinct visual representation for handicap strokes allocated specifically for the "Big Game," in addition to the existing indicators for "Millbrook Game" strokes. This will offer players immediate clarity on their stroke situation for both game formats on each hole.

**2. Background:**

The application supports two primary game formats: the "Millbrook Game" and the "Big Game."

*   **Millbrook Game Strokes:** Calculated based on the lowest handicap index *within the player's current foursome*. Each player receives strokes against this lowest index.
*   **Big Game Strokes:** Calculated based on the *single lowest handicap index across the entire field* of all competing foursomes.

Previously, a feature was implemented to allow users to input this "field-wide low index" on the tee-selection/course-selection page via a text input field. This value is stored as `bigGameSpecificIndex` in the game's setup and match state. The stroke calculation logic in `src/calcEngine/strokeAllocator.ts` (`allocateStrokes` and `allocateStrokesMultiTee` functions) was updated to accept this `bigGameSpecificIndex` and use it as the baseline for determining the number of strokes each player receives when it's provided and the Big Game is active.

**3. Problem Statement:**

Currently, while the underlying logic for calculating Big Game strokes using `bigGameSpecificIndex` is in place, the mobile hole view does not visually differentiate these strokes from the Millbrook Game strokes. Players lack a clear, at-a-glance understanding of how their strokes differ between the two game formats on any given hole, which is crucial for strategic play and score tracking in the Big Game.

**4. Proposed Solution:**

*   **Visual Representation:** Introduce dark green dots (●) or stars (★) to represent Big Game strokes. This color will distinguish them from the existing red/blue team-colored stars used for Millbrook strokes.
*   **Display Logic:**
    *   The dark green Big Game stroke indicators will appear *in addition to* the Millbrook Game stroke indicators.
    *   They will only be displayed if:
        1.  The "Big Game" is active for the current match (`match.bigGame === true`).
        2.  The `match.bigGameSpecificIndex` has been set by the user.
    *   If Big Game is active but `bigGameSpecificIndex` is *not* set, the stroke calculation for Big Game effectively defaults to the foursome's low index (same as Millbrook). In this scenario, to avoid redundancy, the separate green indicators might not be strictly necessary, or the system should ensure it only shows them if the `bigGameSpecificIndex` is explicitly used and different. *For this phase, the primary goal is to show them if `bigGameSpecificIndex` is set and used.*

**5. Affected Components & Files:**

*   **Primary UI Component:** `src/components/hole/HoleView.tsx` - This is where the UI changes will be implemented.
*   **Data Source (Store):** `src/store/gameStore.ts` - Provides `match` data (including `bigGame`, `bigGameSpecificIndex`, `courseId`, `playerTeeIds`), `players` data (including individual `index`), and the `getPlayerStrokeIndexes` utility.
*   **Calculation Engine:** `src/calcEngine/strokeAllocator.ts` - Contains `allocateStrokesMultiTee` and `allocateStrokes` which are already updated but will be called by `HoleView.tsx`.
*   **Styling:** Relevant CSS files (e.g., `HoleView.css` or global stylesheets) for the new dark green indicators.

**6. Detailed Implementation Plan for `HoleView.tsx`:**

*   **A. Data Acquisition and Preparation:**
    1.  **Access State:** Retrieve `match`, `players`, `playerTeams` from the `useGameStore()` hook.
    2.  **Access Current Hole:** Obtain the current `holeNumber` (1-indexed) being viewed (likely from route parameters or component props). Convert to `currentHoleIndex` (0-indexed).
    3.  **Fetch Player-Specific Stroke Indexes (SIs):**
        *   Use a `useState` and `useEffect` combination to call `getPlayerStrokeIndexes(match.courseId, match.playerTeeIds)` from `gameStore.ts`. Store the result (e.g., in `playerSIs: number[][] | null`). Handle loading/null states.
        *   This provides the SI for each hole for each player, based on their selected tee.

*   **B. Stroke Calculation (Memoized):**
    1.  **Player Indexes:** Extract `const playerIndexes = players.map(p => p.index);`
    2.  **Millbrook Stroke Map:**
        ```typescript
        const millbrookStrokeMap = useMemo(() => {
          if (!playerSIs || !players.length) return null;
          return allocateStrokesMultiTee(playerIndexes, playerSIs); // No bigGameBaseIndex
        }, [playerIndexes, playerSIs]);
        ```
    3.  **Big Game Stroke Map (Conditional):**
        ```typescript
        const bigGameStrokeMap = useMemo(() => {
          if (
            !match.bigGame ||
            typeof match.bigGameSpecificIndex !== 'number' ||
            !playerSIs ||
            !players.length
          ) {
            return null;
          }
          return allocateStrokesMultiTee(playerIndexes, playerSIs, match.bigGameSpecificIndex);
        }, [match.bigGame, match.bigGameSpecificIndex, playerIndexes, playerSIs]);
        ```
        *   *Fallback:* If `playerSIs` are not available (e.g., course data issue), a fallback to `allocateStrokes` (using `match.holeSI`) could be considered, ensuring it also receives `match.bigGameSpecificIndex` when appropriate.

*   **C. Rendering Logic (JSX within the player loop):**
    *   Inside the loop that iterates over `players` (e.g., `players.map((player, playerIdx) => { ... })`):
        1.  **Calculate Millbrook Strokes for Current Hole:**
            ```typescript
            const millbrookStrokesOnHole = millbrookStrokeMap ? millbrookStrokeMap[playerIdx][currentHoleIndex] || 0 : 0;
            ```
        2.  **Render Millbrook Stroke Indicator (Existing Logic):**
            *   Likely a `<span>` with a class like `stroke-indicator` and team-specific color (e.g., red/blue). Content would be `N★` or `★`.
            ```jsx
            {millbrookStrokesOnHole > 0 && (
              <span className={`stroke-indicator ${playerTeams[playerIdx]?.toLowerCase()}`}>
                {millbrookStrokesOnHole > 1 ? `${millbrookStrokesOnHole}★` : '★'}
              </span>
            )}
            ```
        3.  **Calculate Big Game Strokes for Current Hole:**
            ```typescript
            const bigGameStrokesOnHole = bigGameStrokeMap ? bigGameStrokeMap[playerIdx][currentHoleIndex] || 0 : 0;
            ```
        4.  **Render Big Game Stroke Indicator (New Logic):**
            *   Conditionally render only if `bigGameStrokeMap` is not null (meaning Big Game is active and `bigGameSpecificIndex` is set) AND `bigGameStrokesOnHole > 0`.
            *   Use a new `<span>` with a class like `big-game-stroke-indicator`.
            *   Content could be `N●` or `N★` (using a different symbol like a dot ● could improve distinction).
            *   Add slight margin/padding for visual separation from the Millbrook indicator.
            ```jsx
            {bigGameStrokeMap && bigGameStrokesOnHole > 0 && (
              <span className="stroke-indicator big-game-stroke-indicator" style={{ marginLeft: '4px' }}>
                {bigGameStrokesOnHole > 1 ? `${bigGameStrokesOnHole}●` : '●'}
              </span>
            )}
            ```

*   **D. Styling (CSS):**
    1.  In a relevant CSS file, define the style for the new indicator:
        ```css
        .big-game-stroke-indicator {
          color: darkgreen; /* Or a specific hex code for dark green */
          /* Potentially slightly different font-size or weight if desired */
        }
        ```

**7. Key Considerations/Edge Cases:**

*   **`bigGameSpecificIndex` Not Set:** If `match.bigGame` is true but `match.bigGameSpecificIndex` is `undefined`, `bigGameStrokeMap` will be `null`, and the Big Game indicators will not render. This is correct, as strokes would be identical to Millbrook.
*   **Identical Stroke Counts:** If `bigGameSpecificIndex` *is* set, but it results in the same number of strokes for a player on a hole as the Millbrook calculation, both indicators (e.g., one red star, one green dot) will appear. This is acceptable as per the "in addition to" requirement.
*   **Performance:** The use of `useMemo` for `millbrookStrokeMap` and `bigGameStrokeMap` is crucial to prevent recalculations on every render, ensuring they only update when their dependencies change.
*   **Asynchronous Data:** `getPlayerStrokeIndexes` is async. Ensure `playerSIs` is loaded and available before stroke map calculations are attempted, or handle the loading state gracefully (e.g., by not rendering stroke indicators until `playerSIs` is populated).

**8. Acceptance Criteria:**

1.  When the Big Game is active (`match.bigGame === true`) AND a `match.bigGameSpecificIndex` is set:
    *   Dark green stroke indicators (dots/stars) appear in `HoleView.tsx` for players receiving strokes under this Big Game specific index.
    *   These green indicators are displayed *in addition to* the standard red/blue Millbrook stroke indicators.
    *   The number of green indicators accurately reflects the strokes calculated using `match.bigGameSpecificIndex`.
2.  The standard red/blue Millbrook stroke indicators continue to accurately reflect strokes calculated based on the lowest index within the foursome.
3.  If the Big Game is *not* active, OR if `match.bigGameSpecificIndex` is *not* set, only the standard Millbrook stroke indicators are visible.
4.  The UI remains clear, readable, and the new indicators are well-integrated visually (e.g., appropriate spacing).
5.  No degradation in component performance.

This document should provide a comprehensive guide for the developer undertaking this UI enhancement.

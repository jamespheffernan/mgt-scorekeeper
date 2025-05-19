# LedgerView Mobile Wireframe (ASCII)

```
+---------------------------------------------------+
| [Back to Hole]                                    |
+---------------------------------------------------+
|  TotalsRibbon (sticky)                            |
|  +---------------------------------------------+  |
|  | Red +$12   Blue -$12   Big Game: $8         |  |
|  +---------------------------------------------+  |
+---------------------------------------------------+
|  HoleAccordion (scrollable)                       |
|  +-----------------------------------------------------------------------------------+  |
|  | Hole | Base | Carry | Dbl | Win | $ | Jk |BG| B1 | B2 | R1 | R2 | Junk            |  |
|  +-----------------------------------------------------------------------------------+  |
|  |  1   |  $2  |  $0   |    |Red  | 6 | 1  | 1|  6/6| 5/4| 5/4| 4/3| B1:Birdie       |  |
|  |  2   |  $2  |  $0   |✓   |Blue | 6 | 0  | 2|  5/4| 6/5| 5/4| 6/6| B2:Sandie       |  |
|  | ...                                                                         |  |
|  +-----------------------------------------------------------------------------------+  |
|  [Tap a row to expand]                                                                  |
+---------------------------------------------------+
|  [Export CSV]                                                                              |
+---------------------------------------------------+

[When a hole row is tapped:]

+---------------------------------------------------+
| PaperTrailDrawer (bottom sheet/modal)             |
| +-----------------------------------------------+ |
| | Hole 2 - Calculation Paper Trail              | |
| |-----------------------------------------------| |
| | Before: Red $0, Blue $0                      | |
| | Carry in: $0                                 | |
| | Base: $2                                     | |
| | Winner: Blue                                 | |
| | Payout: $6 (Carry $0 + Base $2 + Win Bonus $2| | 
| |+ Junk $2)                                    | |
| | Junk Events:                                 | |
| |   B2 (Blue): Sandie +$2                      | |
| | Player Scores:                               | |
| |   B1: Gross 5 / Net 4                        | |
| |   B2: Gross 6 / Net 5                        | |
| |   R1: Gross 5 / Net 4                        | |
| |   R2: Gross 6 / Net 6                        | |
| | Final: Blue +$6                              | |
| +----------------------------------------------+ |
| [Close]                                          |
+--------------------------------------------------+
```

**Annotations:**
- TotalsRibbon: Always visible at top, shows running team totals and Big Game.
- HoleAccordion: Scrollable list, each row = 1 hole, tap to expand for details.
- Player Scores: Each row now shows gross/net for each player as "Gross/Net" (e.g., 5/4), always ordered: blue, blue, red, red.
- Junk: Column shows which player(s) got what type of junk (e.g., B1:Birdie, B2:Sandie).
- Export CSV: Button below the list.
- PaperTrailDrawer: Modal/bottom sheet with full calculation breakdown for the selected hole, including player gross/net scores and a detailed list of junk events by player and type. Payout now includes win bonus (base value) and junk.
- Final: Always zero-sum, matches the payout for the winning team and negative for the losing team.
- **Player columns and breakdowns are always ordered: blue player, blue player, red player, red player.**

*This wireframe is for a 390px wide mobile screen. All elements are touch-friendly and readable at a glance.* 
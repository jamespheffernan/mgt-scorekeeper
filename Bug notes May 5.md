# Bug notes May 5

| **Current Behavior** | **Desired Behavior** | **Status** |
| --- | --- | --- |
in the ledger, it says win $ and that number doesn't seem to include jUnk money| it should.| Fixed - Win $ amount now includes junk money in both the ledger view and CSV exports
|detailed view includes callouts for birdies but not greenies or other junk events| it should| Fixed - Added distinct styling and icons for each junk event type (birdie, greenie, sandie, penalty, LD10)
|greenies arent working -- i greenied and birdied a hole to win and only received $6 at a $2 base. That should be $8 (2 for hole, 2 for win, 2 for birdie, 2 for greenie)| all junk events should be properly tallied including greenies | Fixed - Simplified the greenie logic by removing the redundant "Closest to Pin" checkbox
|closest to pin checkbox is duplicative with greenie flag| remove closest to pin checkbox since greenies inherently mean closest to pin| Fixed - Removed the "Closest to Pin" checkbox and simplified the greenie logic
|auto-selecting greenie when a birdie is scored on a par 3| don't automatically assume a greenie when a player birdies a par 3| Fixed - Removed auto-selection of greenie flag based on score
|displaying confusing "Team Junk Share" and "Side" metrics in the ledger view| remove these confusing metrics and show only the player's final total| Fixed - Removed "Team Junk Share" and "Side" metrics from the ledger view and SettlementView
|button text says "Team Calls Double!"| Change to "Team Doubles" for simpler wording| Fixed - Updated button text and related messages to use "Team Doubles" terminology
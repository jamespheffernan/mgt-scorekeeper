# Millbrook Game & Big Game Rulebooks

# Millbrook Game – Official Rulebook

Version 1.2 (Updated 29 Apr 2025)

---

## 1. Overview

The Millbrook Game is a wagering format played by one foursome (two‑person teams **Red** vs **Blue**) over 18 holes.

---

## 2. Handicaps

- Identify the **low index** in the foursome.
- Each other player receives strokes equal to *(their index – low index)*, applied on the course’s stroke‑index holes.

---

## 3. Match Formats

| Format | What counts | Result |
| --- | --- | --- |
| **Internal match (mandatory)** | Lower **net** score from each two‑person team on every hole (net better‑ball). | Determines hole winners, pushes, and junk bets. |
| **Big Game (optional)** | **Two** best net scores from the foursome on each hole. | 18‑hole total compared against other foursomes; junk **does not** apply. |

### 3A. Concessions & Pick‑Ups

- **Side match:** Teams may concede putts of **any** length. A player may pick up at any time and record a (net) **double‑bogey** to keep play moving.
- **Big Game:** Only putts inside the mutually agreed **“gimme” distance** may be conceded; longer putts must be holed for Big Game scoring.

---

## 4. Base Wager & Doubling

1. **Hole 1** base = **$1**.
2. **Hole 2** base = **$2**.
3. From Hole 3 onward the base remains $2 **until** the trailing team calls **“double”**.
4. A double must be declared **before any player tees off** on that hole. Only the trailing side may call it.
5. Each valid double multiplies the base for that hole **and all following holes**; the base never decreases.

---

## 5. Hole Payout

If a hole is **halved** the current base **carries** to the next hole.

```
Hole won → payout = carry‑over + current base + win‑bonus
win‑bonus  = current base  (never carries)

```

---

## 6. Junk (extra wagers — side match only)

All junk, except LD10, is paid **at the hole’s current base** and is independent of hole‑win money.

| Junk | Condition | Notes |
| --- | --- | --- |
| **Birdie** | Any gross birdie | Pays **once per player**. |
| **Sandie** | Par or better **after** playing from a bunker | Cannot also earn a Greenie (ball not on green). |
| **Greenie** | Par‑3 tee ball finishes on the **green**, is closest in regulation, and the player makes par or better | Cannot stack with a Sandie; if two balls are exactly tied, the greenie **carries**. |
| **Greenie penalty** | Greenie candidate takes **three or more putts** | Player pays the base; greenie carries. |
| **LD10** | *Optional.* On the **17th tee** either team may propose LD10; the other team may accept or reject. If accepted, the team with the **longest drive** that ends **in the upper fairway, collar, or green** wins **$10 added to the running total**. Drives in the valley, any rough, or the bunker are ineligible. |  |

### 6A. Greenie carry & grandé

- Six par‑3 holes: **2, 7, 9, 11, 16, 18**.
- Unclaimed greenies roll to the next par‑3 and accumulate.
- Capturing **all six** produces a **greenie grandé**; capturing fewer is simply that number of greenies.

---

## 7. Recording & Settlement

- Maintain a running ledger for: carry‑over, current base, doubles, hole‑win payouts, and junk (including LD10).
- **Settlement:** After 18 holes compute the final running total. **Each player on the losing team pays that full amount to one winner**; which opponent is paid is decided by the teams.

---

## 8. Governance & Etiquette

- The **seniormost knower of the Millbrook Game** present makes final rulings.
- USGA Rules of Golf apply unless modified above.

---

*End of Rulebook*

# Millbrook **Big Game** – Official Rulebook

Version 1.2 (Restored 29 Apr 2025)

> This document governs the foursome‑versus‑foursome Big Game that runs in parallel with the two‑person Millbrook Game. Section numbers from the Millbrook Game – Official Rulebook are referenced where a rule is shared.
> 

---

## 1. Concept & Eligibility

- Each **foursome** (four players) is one Big Game team.
- Any number of foursomes may participate on the same day.
- Every player must also be playing a Millbrook Game side match within their foursome.

---

## 2. Handicaps

- Handicaps are calculated exactly as in the Millbrook Game **except** that the **single lowest handicap index in the entire field** is the base for *everyone* (see Millbrook §2).

### 2A. Three‑Person Groups (Blind Draw)

If a group has only **three players**:

1. Draw one player at random from the four‑player groups (group number, then player number).
2. Copy that blind‑draw player’s **net score on every hole** to each three‑player scorecard. The score counts exactly as if the player were each trio’s fourth player.

---

## 3. Scoring Method

1. On every hole record the foursome’s **two best net scores**.
2. Add those two numbers → **hole subtotal**.
3. Sum all 18 subtotals → **Big Game Total** (typical winning totals 120‑150).
4. Lowest Big Game Total wins (ties – see §7).

---

## 4. Concessions & Pick‑Ups (shared with Millbrook §3A)

- Putts inside the mutually agreed **“gimme” distance** may be conceded for Big Game purposes.
- Longer putts must be holed; otherwise record the **actual** strokes taken.
- A player may pick up and enter a **net double‑bogey** at any time for pace of play; that score *can* be one of the two best nets.

---

## 5. Recording & Verification

- Keep one Big Game card per foursome showing:
    - Gross, strokes, and net for each player.
    - Hole subtotal column.
- At round’s end the card is signed by one member of each two‑person team and initialled by the scorer.

---

## 6. Entry Fee & Settlement

- **Entry fee: $20 per player**, collected before tee‑off; the pool is the Big Game purse.
- The entire purse is paid to the winning foursome.

---

## 7. Ties

If two or more teams finish with identical Big Game Totals, the **entire purse rolls over** to the next scheduled Big Game.

---

## 8. Governance & Disputes

All rulings, disputes, scheduling, and membership decisions are **solely at the discretion of the Big Game Commissioner, Fred Stillman III**, and are **final and not reviewable**.

---

*End of Big Game Rulebook*

JSON of Millbrook Scorecard:

```jsx
{
"course": "Millbrook Golf & Tennis Club",
"holes": [
{
"number": 1,
"tees": {
"White/Blue":  {"distance": 497, "par": 5, "handicap": 7},
"Blue/Green":  {"distance": 485, "par": 5, "handicap": 7},
"Green/Silver":{"distance": 455, "par": 5, "handicap": 7},
"Red/Gold":    {"distance": 455, "par": 5, "handicap": 3}
}
},
{
"number": 2,
"tees": {
"White/Blue":  {"distance": 190, "par": 3, "handicap": 9},
"Blue/Green":  {"distance": 190, "par": 3, "handicap": 9},
"Green/Silver":{"distance": 177, "par": 3, "handicap": 9},
"Red/Gold":    {"distance": 139, "par": 3, "handicap": 15}
}
},
{
"number": 3,
"tees": {
"White/Blue":  {"distance": 518, "par": 5, "handicap": 5},
"Blue/Green":  {"distance": 498, "par": 5, "handicap": 5},
"Green/Silver":{"distance": 473, "par": 5, "handicap": 5},
"Red/Gold":    {"distance": 414, "par": 5, "handicap": 5}
}
},
{
"number": 4,
"tees": {
"White/Blue":  {"distance": 289, "par": 4, "handicap": 13},
"Blue/Green":  {"distance": 320, "par": 4, "handicap": 13},
"Green/Silver":{"distance": 218, "par": 4, "handicap": 13},
"Red/Gold":    {"distance": 218, "par": 4, "handicap": 13}
}
},
{
"number": 5,
"tees": {
"White/Blue":  {"distance": 379, "par": 4, "handicap": 3},
"Blue/Green":  {"distance": 328, "par": 4, "handicap": 3},
"Green/Silver":{"distance": 328, "par": 4, "handicap": 3},
"Red/Gold":    {"distance": 232, "par": 4, "handicap": 11}
}
},
{
"number": 6,
"tees": {
				"White/Blue":  {"distance": 441, "par": 5, "handicap": 11},
"Blue/Green":  {"distance": 389, "par": 4, "handicap": 11},
"Green/Silver":{"distance": 325, "par": 4, "handicap": 11},
"Red/Gold":    {"distance": 389, "par": 5, "handicap": 7}
}
},
{
"number": 7,
"tees": {
"White/Blue":  {"distance": 163, "par": 3, "handicap": 17},
"Blue/Green":  {"distance": 150, "par": 3, "handicap": 17},
"Green/Silver":{"distance": 140, "par": 3, "handicap": 17},
"Red/Gold":    {"distance": 109, "par": 3, "handicap": 17}
}
},
{
"number": 8,
"tees": {
"White/Blue":  {"distance": 386, "par": 4, "handicap": 1},
"Blue/Green":  {"distance": 343, "par": 4, "handicap": 1},
"Green/Silver":{"distance": 291, "par": 4, "handicap": 1},
"Red/Gold":    {"distance": 291, "par": 4, "handicap": 1}
}
},
{
"number": 9,
"tees": {
"White/Blue":  {"distance": 151, "par": 3, "handicap": 15},
"Blue/Green":  {"distance": 207, "par": 3, "handicap": 15},
"Green/Silver":{"distance": 151, "par": 3, "handicap": 15},
"Red/Gold":    {"distance": 140, "par": 3, "handicap": 9}
}
},
{
"number": 10,
"tees": {
"White/Blue":  {"distance": 485, "par": 5, "handicap": 6},
"Blue/Green":  {"distance": 455, "par": 5, "handicap": 6},
"Green/Silver":{"distance": 455, "par": 5, "handicap": 6},
"Red/Gold":    {"distance": 485, "par": 5, "handicap": 2}
}
},
{
"number": 11,
"tees": {
"White/Blue":  {"distance": 190, "par": 3, "handicap": 12},
"Blue/Green":  {"distance": 177, "par": 3, "handicap": 12},
"Green/Silver":{"distance": 140, "par": 3, "handicap": 12},
"Red/Gold":    {"distance": 177, "par": 3, "handicap": 10}
}
},
{
"number": 12,
"tees": {
"White/Blue":  {"distance": 498, "par": 5, "handicap": 8},
"Blue/Green":  {"distance": 473, "par": 5, "handicap": 8},
"Green/Silver":{"distance": 414, "par": 5, "handicap": 8},
"Red/Gold":    {"distance": 296, "par": 4, "handicap": 16}
}
},
{
"number": 13,
"tees": {
"White/Blue":  {"distance": 320, "par": 4, "handicap": 4},
"Blue/Green":  {"distance": 218, "par": 4, "handicap": 4},
"Green/Silver":{"distance": 218, "par": 4, "handicap": 4},
"Red/Gold":    {"distance": 145, "par": 3, "handicap": 18}
}
},
{
"number": 14,
"tees": {
"White/Blue":  {"distance": 328, "par": 4, "handicap": 16},
"Blue/Green":  {"distance": 328, "par": 4, "handicap": 16},
"Green/Silver":{"distance": 228, "par": 4, "handicap": 16},
"Red/Gold":    {"distance": 328, "par": 4, "handicap": 6}
}
},
{
"number": 15,
"tees": {
"White/Blue":  {"distance": 389, "par": 4, "handicap": 2},
"Blue/Green":  {"distance": 325, "par": 4, "handicap": 2},
"Green/Silver":{"distance": 325, "par": 4, "handicap": 2},
"Red/Gold":    {"distance": 325, "par": 5, "handicap": 4}
}
},
{
"number": 16,
"tees": {
"White/Blue":  {"distance": 150, "par": 3, "handicap": 18},
"Blue/Green":  {"distance": 140, "par": 3, "handicap": 18},
"Green/Silver":{"distance": 125, "par": 3, "handicap": 18},
"Red/Gold":    {"distance": 140, "par": 3, "handicap": 8}
}
},
{
"number": 17,
"tees": {
"White/Blue":  {"distance": 343, "par": 4, "handicap": 14},
"Blue/Green":  {"distance": 291, "par": 4, "handicap": 14},
"Green/Silver":{"distance": 295, "par": 4, "handicap": 14},
"Red/Gold":    {"distance": 343, "par": 5, "handicap": 14}
}
},
{
"number": 18,
"tees": {
"White/Blue":  {"distance": 207, "par": 3, "handicap": 10},
"Blue/Green":  {"distance": 151, "par": 3, "handicap": 10},
"Green/Silver":{"distance": 190, "par": 3, "handicap": 10},
"Red/Gold":    {"distance": 207, "par": 4, "handicap": 12}
}
}
]
}
```

[App Plan](https://www.notion.so/App-Plan-1e4398cf705c8019a261f1608ab01219?pvs=21)
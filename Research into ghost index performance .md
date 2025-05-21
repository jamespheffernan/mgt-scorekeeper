# Research into ghost index performance:

**Ghost Player Score & Junk Simulation Guide**

## **1. Summary Table of μ & σ Functions**

Below is a summary of how to compute the **mean (μ)** and **standard deviation (σ)** for a ghost player’s gross score on each hole, as functions of the player’s handicap index (H) and the hole’s stroke index (difficulty rank 1–18). These functions ensure the ghost’s hole-by-hole scores reflect realistic performance:

| **Hole Difficulty** | **Mean Score μ (gross)** | **Std. Dev. σ** |
| --- | --- | --- |
| Easy hole (high stroke idx) | ≈ Par + *b*easy(H) – *(for plus H)* | ~σbase(H) × 0.9 |
| Average hole (mid idx) | ≈ Par + H/18 + δ(H) | ~σbase(H) × 1.0 |
| Hard hole (low stroke idx) | ≈ Par + 1 + *b*hard(H) *(+2 if H>18)* | ~σbase(H) × 1.1 |
- **μ function:** Start with **Par**. Add approximately **H/18** strokes (the handicap spread per hole) and then adjust for hole difficulty. Harder holes (stroke index 1 being hardest) get a larger share of handicap strokes. For a handicap *H ≤ 18*, assume mean ≈ Par + 1 on the H hardest holes (stroke index ≤ H) and Par on easier holes . For *H > 18*, add **2 strokes** on a few hardest holes: e.g. a 20-index ghost gets +2 on stroke index 1–2 and +1 on 3–18 on average. For plus handicaps (H < 0), *subtract* strokes on the easiest holes (e.g. a +2 handicap might average birdie on two holes). The small terms *b*easy(H), *b*hard(H), and δ(H) are bias adjustments (fractions of a stroke) to calibrate realistic scoring (e.g. higher handicaps may exceed net bogey on some holes). These ensure the total 18-hole mean aligns with expected scores (often a few strokes above the course handicap ).
- **σ function:** Use a base standard deviation that grows with handicap: **σbase(H)** ≈ *0.5 + 0.03·H* (in strokes). A scratch player (H≈0) has σ0.5 (scores tightly around par per hole), while H=20 yields σ1.1 (more variance). Then adjust by hole difficulty: ±10% for easiest/hardest holes. Hard holes tend to produce slightly more score variability (more chances for doubles or others), while easy holes yield more consistent scores.

This model yields, for example, a **10-handicap** ghost with mean per-hole ≈ *Par + 0.6–0.7* strokes (about +12–13 over per round on average) and σ≈0.8; a **20-handicap** ghost with mean ≈ *Par + 1.2* and σ≈1.0 (about +20–22 over per round on average, see §3)  . These μ and σ estimates will be refined per hole in the detailed model below.

## **2. Detailed Statistical Model**

**Distribution Choice:** We model each hole’s score as a random variable following an **approximately normal distribution** centered at μhole with standard deviation σhole. A normal (Gaussian) model is convenient and aligns with USGA assumptions that golfer scores follow a roughly normal distribution around an expected value . However, because golf scores are discrete and skewed (there’s a lower bound at birdie/eagle but potential for high outliers), we truncate and adjust the distribution for realism:

- **Lower bound:** We cap the lowest score at *birdie* (or occasionally eagle on par-5s) – the ghost shouldn’t unrealistically make more than an eagle on a hole. We ensure $P(\text{birdie or better})$ matches historical rates (see junk probabilities in §4).
- **Upper tail:** We allow higher-than-μ scores (doubles, triples) with appropriate probability. If a normal draw exceeds μ + 3σ (an extremely bad hole), we may cap it (e.g. at triple bogey or double-par) to avoid implausible blow-ups unless the hole is known for hazards (see Edge Cases).

**Mean μ per Hole:** We derive μhole from the player’s handicap and hole difficulty:

- **Base Mean from Handicap:** Distribute the player’s expected over-par strokes (approximately equal to their course handicap plus a small buffer ) across 18 holes. In an ideal “play to handicap” round, a golfer with course handicap *H* would shoot about *H* over par, typically by bogeying *H* holes (and parring the rest). Thus, a first approximation is **Par +1** on the *H* hardest holes and **Par** on the others (for H ≤ 18). For example, a 10-index ghost would average bogey on the 10 lowest stroke-index holes and par on the other 8 if playing exactly to handicap.
- **Hole Difficulty Adjustment:** To add nuance, we treat stroke index as a difficulty weight. Harder holes get a bit more than one stroke for high handicaps (they’re more likely to produce doubles), while easier holes might be less than a full stroke over par even for high H. We can allocate fractions of the handicap to each hole proportional to the hole’s difficulty ranking. One method is assigning each hole *i* a weight *wi* (e.g. inverse of stroke index rank) such that $\sum_{i=1}^{18} w_i = 18$. Then μhole = Pari + *(H/18)* · *wi*. This ensures the total expected strokes over par sums to H. We then add a small constant adjustment so that higher handicaps have slightly more than H strokes over par on average (since handicap index is based on best rounds, average score is ~3–5 strokes above index for low-mid handicaps and ~6–8 above for high handicaps ). That buffer δ(H) can be spread evenly or weighted to hardest holes.
    - **Example:** If H=20, base allocation gives 20 strokes over par total. But realistically, a 20-handicap averages closer to 92–95 on a par-72 (around +20 to +23) . We add ~3 extra strokes over par across the round. We might assign a +0.2 tweak to the 5 hardest holes and +0.1 to the next 8 hardest, totaling +3.0 extra. Thus a stroke-index-1 hole for H=20 might have μ ≈ Par + 1.2 (instead of exactly +1), and an easy stroke-index-18 hole might be Par + 0.1. The net effect is a mean around 92–95 for the round, aligning with real scoring data.
- **Par Differences:** Incorporate the insight that performance varies by hole par. Better players excel on par-5s (often scoring under par), but may average slightly over par on long par-3s, whereas higher handicaps struggle on par-5s (often double-bogeying them) but find short par-3s more manageable . We reflect this by:
    - For low handicaps (H ~0 or plus): On par-5 holes, μ may be *below* par (e.g. a scratch might average 4.8 on par-5s, implying some birdies) – effectively a negative adjustment for those easier scoring opportunities. On par-3 holes, μ might be slightly above par (long par-3s are tough even for scratch).
    - For high handicaps: On par-5s, μ can be higher (they often need 3+ shots to reach the green, so a 20-handicap might average 6+ on par-5s). On par-3s, μ might be closer to bogey but not as high as their overall average over-par (since they only need to hit one good tee shot to have a chance at par).
    - These par-based tweaks are layered on top of the stroke index model. For instance, a 15-handicap might allocate ~1 stroke over par on most holes, but for a stroke-index-5 par-5 (hard but long), μ could be Par + 1.3; for a stroke-index-5 par-3 (hard but shorter hole), μ might be Par + 0.8.
- **Plus-Handicap (H < 0) Handling:** For a plus-index ghost (a very skilled player), we interpret the “negative handicap” as an expectation to score under par. We subtract strokes on the easiest holes: e.g. a +2 handicap might have **μ ≈ Par – 1** on the two easiest holes (stroke index 18 and 17), and Par on others, leading to an expected round of 2-under. The distribution should still allow some over-par holes, but overall more birdies than bogeys. Essentially, treat H = –2 as H = 2 for allocation but subtract the strokes instead of adding, on the *highest* stroke indices.

**Standard Deviation σ per Hole:** We model σhole as a function of player skill and hole difficulty:

- **Skill factor:** Better players are more consistent, so σ increases with handicap. As noted earlier, we use σbase(H) ≈ 0.5 + 0.025·H (roughly 0.5 for scratch, ~1.0 for H=20). This reflects that high handicappers have a wider score distribution. Empirical data shows a scratch golfer’s total score varies only ~2-3 strokes from round to round, whereas a 20-handicap’s can vary by 5-6 strokes or more (hole-level variation similarly scales up) .
- **Hole factor:** Harder holes introduce more ways to go wrong (water, OB, difficult greens), so we give a slight σ boost on low-index holes (+10% on the hardest holes). Conversely, the easiest holes yield less variance (a high-handicap might still occasionally par them even if bogey is average, but they rarely implode on an easy short par-4), so we reduce σ by ~10% on stroke-index 18. For example, if σbase=0.9 for a 15-handicap, σ on hole SI=1 might be ~0.99, and on SI=18 ~0.81.
- **Bounding σ:** Ensure σ is not unrealistically high on any hole. We might cap σ at around 1.2–1.3 (even a 20+ handicap will not *routinely* shoot ±3 or 4 from their mean on a single hole; extremely bad outliers are handled by our score capping). Also, σ shouldn’t be below ~0.3 even for plus handicaps – even elite players occasionally bogey a simple hole or birdie a tough one, adding some variance.

**Discrete Outcome Approach (Alternative):** Instead of a continuous model, we can explicitly define probabilities for discrete outcomes (birdie, par, bogey, double, etc.) that align with μ and σ. This often improves realism. For each hole and handicap, specify:

- $P(\text{birdie})$, $P(\text{par})$, $P(\text{bogey})$, $P(\text{double})$, $P(\text{>= triple})$ such that the expected value = μ and the distribution’s standard deviation ≈ σ. We can use known scoring frequencies as a guide. For instance, a 10-handicap averages ~0.7 birdies, ~7 pars, ~7 bogeys, ~3 doubles per round . That translates to roughly 4% birdie, 40% par, 40% bogey, 16% double per hole for H=10, before adjusting for hole difficulty. On an easy hole, par and birdie probabilities would be higher; on a hard hole, bogey/double probabilities higher. This discrete method inherently prevents impossible scores and can be tuned to produce the desired μ and σ. In practice, we might implement the discrete probabilities behind the scenes but still generate a random score via those weights.

Using the above statistical model, we ensure the ghost’s hole-by-hole scores mimic real-world patterns: low handicaps mostly make pars with a few birdies and few doubles, while high handicaps make more bogeys and some doubles/triples  , with means and variability scaling appropriately.

## **3. Distribution Properties & Data Sources**

It’s important that the **total 18-hole scores** produced by our model match observed distributions for golfers of various handicaps. We use data from the USGA and aggregate studies (TheGrint, ShotScope, etc.) to validate these properties:

- **Expected Total Score vs. Handicap:** A player’s handicap index is *not* their average score – it represents potential (best 8 of 20 rounds). On average, players shoot a few strokes higher. *Low handicappers* (e.g. H=5) tend to average about 4–5 strokes over their index, while *high handicappers* (H=20) average about 6–8 strokes over index . For example, a 10-index golfer on a course rated 72 might average around 82–88 (10–16 over par). Our ghost model reflects this by slightly biasing the hole means upward as discussed. A quick check: for H=10, summing μ per hole might give ~85 (+13); for H=20, sum of μ maybe ~94 (+22). These align with known averages (a 20-handicap “bogey golfer” often shoots in the low-to-mid 90s) .
- **Standard Deviation of Round Scores:** Real golfers’ round-to-round scoring variability is also well-documented. A scratch player might typically score in a narrow range (say 70–75 on a par-72), whereas a 18-handicap could range from mid-80s on a great day to 100+ on a bad day. The **68% confidence interval** (approximately mean ±1σ) for total score tends to be about ±2–3 strokes for low handicaps and ±4–6 strokes for high handicaps, based on handicap research . For instance, if our 10-handicap ghost’s mean score is ~85, we’d expect about 68% of rounds to fall roughly between 81 and 89. For a 20-handicap with mean ~94, 68% of rounds might be in the high-80s to around 100. Our per-hole σ aggregation supports this: the total score standard deviation can be approximated by $\sqrt{\sum \sigma_{hole}^2}$ (assuming independence), which for H=20 might be $\sqrt{18*(1.0^2)} ≈ 4.2$ strokes, and for H=5 might be $\sqrt{18*(0.625^2)}≈2.65$ strokes. These are in line with observed round variability.
- **Score Distribution Shape:** Golf scores are not perfectly normal – they are skewed right (more high scores in bad rounds). Our model accounts for this by capping low scores (few eagles) but allowing occasional high numbers. The distribution of net differentials from USGA data shows that exceeding your handicap by many strokes is more common than beating it by many . In simulation, the ghost should rarely beat its handicap by a large margin (e.g. a 15-handicap ghost shooting par should be extremely rare), but occasionally have very rough rounds. We can validate by checking the **odds of outlier rounds**: e.g. USGA tables show the probability of a net differential 3 strokes better than your handicap is on the order of 1 in a few hundred rounds . Our ghost’s random generator can be tuned so that exceptionally low gross scores happen with appropriate rarity, while high gross scores (poor rounds) happen a bit more frequently. If needed, we skew the random draws for total score to match these odds (for example by using a slightly higher σ for bad-luck events or a truncated left tail).
- **External Data for Validation:** We cross-check our ghost’s generated stats against real data:
    - **Fairways, GIR, Putts:** While not directly generated, our ghost’s scoring patterns imply certain performance metrics. For example, a 10-handicap ghost should hit roughly 35% of greens in regulation and have a few 3-putts (around 7% of holes) , whereas a scratch ghost would hit ~50–60% GIR and almost never 3-putt . Our junk event modeling (next section) further enforces consistency with these stats.
    - **Birdie/Bogey Counts:** The model yields realistic counts of birdies, pars, bogeys, etc. For instance, over many simulated rounds a 10-handicap ghost should average about 0–1 birdie, ~7–8 pars, ~7–8 bogeys, ~2–4 doubles per round . A 20-handicap ghost will have fewer pars and around 6–7 doubles or worse on average . We ensure our per-hole outcome probabilities produce these averages (see table in §4).
    - **Consistency with Handicap System:** If we compute “score differentials” from the ghost’s simulated rounds, the ghost’s index (which would be the average of best 8 differentials) should converge to the intended handicap index we set. This is a good self-check: e.g. if our 15-index ghost is consistently averaging 93 (differential ~21 on a CR72, SR113 course), but occasionally shoots 87–88 (differential ~15, which would be among best rounds), the calculated index from 20 rounds of such data should be near 15. This confirms the distribution aligns with handicap expectations.

In summary, the ghost’s total score distribution will be centered on a realistic average for its index and have a plausible spread. Approximately 68% of rounds will lie in a range of ±(2–5) strokes, depending on the handicap, and extreme scores will occur with frequency similar to real golfers of that level. We’ve used data from USGA and statistical studies   to calibrate these expectations.

## **4. Junk Event Probabilities**

The Millbrook side games (“junk”) events – **Birdies, Sandies, Greenies, Greenie Penalties,** and **LD10** – are simulated by assigning conditional probabilities for each event per hole, scaled by the ghost’s handicap. Below we define each event and provide typical probabilities or triggers:

- **Birdie:** Scoring one stroke under par on a hole. In simulation, a birdie occurs when the random gross score falls to Par – 1 (or better). We ensure the likelihood of birdie matches the player’s skill. Real data: a scratch golfer averages ~2.3 birdies per round, a 10-handicap ~0.7, and a 20-handicap ~0.36 . This corresponds to roughly:
    - Scratch (H~0): ~13% chance per hole.
    - H=10: ~4% chance per hole.
    - H=20: ~2% chance per hole.
    
    We can formalize $P(\text{birdie on hole } i) = B(H) \times d_i$, where $B(H)$ is the base birdie rate for handicap H and $d_i$ is a difficulty modifier (hard holes yield fewer birdies). For example, a 10-handicap might have $B(10)=0.04$ (4%). On an easy par-5 (stroke idx 15), $d_i$ could be 1.3 (birdie more likely) giving ~5.2%, whereas on a tough par-4 (idx 2) $d_i$ might be 0.5, giving ~2%. We calibrate $B(H)$ so that over 18 holes the expected birdie count matches the stats above. When a birdie is recorded, we mark a **“dot”** or point for Birdie in the junk tally.
    
- **Sandie:** Earning a “sandie” typically means making par (or better) on a hole **after** being in a sand bunker. According to the Millbrook rules, it may count for any up-and-down from a bunker (even if the score is bogey) but traditionally it’s Par save from sand . We will define it as: *Ghost was in a greenside bunker and still made par or better*. To simulate a sandie:
    - First, we need a chance the ghost enters a bunker. This depends on GIR and accuracy: higher handicaps miss more greens (and often by wider margins, possibly finding sand). As an estimate, a scratch hits ~11 greens, so ~7 misses; a 20-handicap hits ~3 greens, so 15 misses . Not every miss lands in a bunker – assume maybe 1 in 4 misses finds a greenside bunker for an average player. So approximate bunker visits per round: scratch ~2, 10-hand ~4, 20-hand ~6.
    - Next, given in bunker, chance to **save par**: This equals the sand save percentage. Data: Scratch players save from sand ~37%, 10-handicappers ~20%, 20-handicappers ~15% . So we set conditional probabilities accordingly.
    - Combining these: a 10-handicap ghost might have ~4 bunker trips * 20% = 0.8 sand saves per round. That’s roughly one Sandie every 1–2 rounds, which sounds reasonable. A 20-handicap with more bunker visits but lower save rate might net ~0.9 sandies per round, and a scratch ~0.7.
    - **Per-hole modeling:** For each hole, if the ghost’s score result is Par or better, we randomly decide if a bunker was involved (with probability proportional to miss-GIR chance). If yes and score == Par, that triggers a **Sandie** event. (If the rules allow “sandie” for making bogey from a bunker up-and-down, you could relax the score condition to “made the next stroke after sand,” but we’ll assume par for standard definition). For simplicity, we can also pre-simulate: on each hole, determine if a bunker was hit (chance depends on hole hazard layout and player accuracy), then if score <= par, award Sandie.
    - **Scaling by handicap:** Lower handicap → fewer bunker chances but higher conversion; higher handicap → more chances but poor conversion. Our model inherently handles this via GIR and sand-save stats.
- **Greenie:** In Millbrook junk, a “Greenie” is usually awarded on par-3 holes. It traditionally means the player whose tee shot lands on the green **closest to the pin** and who then makes par or better gets the greenie . In a single-player context, we interpret a Greenie as: *hitting the par-3 green in regulation (i.e. on the tee shot) and making par or better*. We will track Greenies only for par-3 holes:
    - **Probability of hitting a par-3 green (GIR on par-3):** This depends on handicap. Better players hit more greens even on par-3. A scratch might hit ~50% of par-3 greens (especially if tees are back), a 10-handicap perhaps ~30%, and a 20-handicap maybe ~15–20%. This aligns with overall GIR tendencies (35% overall GIR for H=10, likely a bit lower on par-3, and 16% overall for H=20, possibly slightly higher on short tees) . We’ll use: $P(\text{GIR on par3}) \approx 0.5 - 0.01*H$ (so ~0.50 for H=0, 0.40 for H=10, 0.30 for H=20) as a rough model, adjusting if needed.
    - **Probability of par given GIR:** If the ghost hits the green, the chances of making par or better are high (since they have two putts to make par). The main failure mode is a 3-putt (or worse). Using putting stats: a scratch 3-putts only ~3% of the time , a 10-handicap ~7%, a 20-handicap ~13% . So conditional on hitting the green, we’ll say:
        - Scratch: ~97% chance to make at least par (birdie or par).
        - 10-handicap: ~93% chance (7% they 3-putt for bogey).
        - 20-handicap: ~87% chance (13% 3-putt).
    - **Greenie event:** So for a given par-3: *Greenie* occurs if (Hit Green) AND (Score ≤ Par). Using the above numbers, for H=10: P(Greenie) ≈ 0.30 * 0.93 ≈ 0.28 (28% per par-3). For H=20: ~0.18 * 0.87 ≈ 0.16 (16%). For scratch: 0.50 * 0.97 = 0.485 (≈49%). Over 4 par-3s, that yields roughly 1.1 greenies/round for a 10-handicap, 0.6 for a 20-handicap, and ~2 for scratch – plausible values.
    - We will implement this by explicitly checking par-3 holes: simulate whether the ghost hit the green (random yes/no with P = GIR%), then if the ghost’s score ended up par or birdie. If both true, mark a **Greenie**. (If multiple players, you’d also check “closest” but for ghost alone it’s automatically theirs if criteria met.)
- **Greenie Penalty:** This is the flip side of Greenie. The Millbrook rule likely penalizes a player who hits a par-3 green in regulation but **fails to make par** (probably pays a penalty or loses a point). In other words, a “greenie but three-putt” situation. We simulate this on par-3s as well:
    - A **Greenie Penalty** occurs if (Hit Green) AND (Score > Par, i.e. bogey or worse). In our model, that essentially means the ghost hit the green but 3-putted (or worse). We can directly use the complement of the above: if ghost hits the green but does **not** make par. Probability-wise, for H=10 this is ~0.30 * 0.07 = 0.021 (2.1% per par-3), which is about 0.08 per round (~1 in 12 rounds). For H=20: ~0.18 * 0.13 = 2.3% per par-3, ~0.09 per round. Even scratch has a small chance (~0.5 * 0.03 ≈1.5% per par-3). These are rare, as expected.
    - In implementation, on each par-3, if we flagged that the ghost hit the green, and the final score came out as a bogey, we mark a **Greenie Penalty** event. (If the ghost somehow makes double+ after hitting green, that also counts as a penalty – essentially any time they hit GIR but don’t make par.)
- **LD10 (Long Drive on 10):** Many groups designate a particular hole (often #10) for a Long Drive competition – the player with the longest drive in the fairway on that hole wins the “LD” junk. For the ghost player, we simulate a **drive distance** on hole 10 and determine if they win:
    - **Drive Distance Model:** We assign the ghost a driving distance distribution based on handicap. Better players generally hit it farther . For example, Arccos data shows <10 handicaps average ~250 yards, teens ~218 yards, 20+ handicaps around 200 yards . We can model the ghost’s drive as Normal(μ_drive(H), σ_drive) where μ_drive might be:
        - Scratch/low H: ~260–280 yards (we can use 270 for H=0 as a baseline),
        - H=10: ~240–250 yards,
        - H=20: ~200–210 yards.
            
            And σ_drive ~ 10 yards (typical variation). We also ensure a fairway hit probability (there’s no LD reward if drive is in the rough/trees). Fairway hit % might be ~50% for amateur men on average, higher for shorter hitters . We could say scratch ~60% fairway, 10-hand ~50%, 20-hand ~40%.
            
    - **Determining Winner:** If the ghost is competing with real players, we can’t know their drives. But we can simulate ghost’s result: For hole 10, generate ghost’s drive distance and check if it’s a “valid” long drive (hit fairway). To decide a win probabilistically, assume an evenly matched field: if 4 players are competing and ghost hits fairway, ghost has roughly a 25% chance to be longest *if* distances are similar distribution. However, if ghost’s handicap is significantly lower (better) than others, ghost might have an edge in distance. We can simplify:
        - If ghost hits a good drive (e.g. above their average) and in fairway, award LD10. Or,
        - Explicitly compare: generate random drives for ghost’s notional competitors as well (using similar handicap-based means for each) and see if ghost’s is longest.
    - For implementation, we could do: ghost_distance = randNormal(μ_drive(H), 10). If ghost_distance is in fairway (random check vs fairway %), then for simplicity flag LD10 win (the user could adjust to match actual opponent data if available). This gives ghost an LD10 roughly in line with expectation – e.g. a 10-handicap ghost will hit fairway ~50% on #10; when they do, we might just give it to ghost half the time (~25% overall chance), mimicking a competitive scenario.
    - **Scaling:** Lower handicap ghost has higher μ_drive, so if others are higher handicap, ghost should win more often. You can incorporate that by biasing the win chance upward for low H ghost vs a field of higher H players. In general, if ghost’s distance is, say, 30 yards farther than another player on average, ghost will almost always win LD if both hit fairway. These nuances can be coded if needed (e.g. compare ghost’s drive to each competitor’s simulated drive).

**Junk Probability Summary Table:** (Illustrative values)

| **Junk Event** | **Trigger Condition** | **Probabilities (for H=0, 10, 20)** |
| --- | --- | --- |
| Birdie | Score = Par – 1 (or better) | ~13% (H0), 4% (H10), 2% (H20) per hole |
| Sandie | In bunker + score ≤ Par (Par save) | ~0.7 (H0) to ~0.9 (H20) per round (see above) (E.g. ~5% chance on a given hole for H10) |
| Greenie (par-3 only) | Hit green + par or birdie | ~50% (H0), 25% (H10), 15% (H20) per par-3 |
| Greenie Penalty | Hit green + **bogey or worse** | ~1–2% per par-3 (higher for high H) |
| Long Drive #10 (LD10) | Longest drive on hole 10 in fairway | If fairway: ~25% vs equal field (higher if ghost is longest hitter)Ghost fairway chance ~60% (H0) to 40% (H20) |

When generating a round, we attach these junk events to the scorecard:

- A **Birdie** event is automatically recorded if the gross score for a hole is one (or more) under par. (If it’s two under par, that’s an eagle – which might count as two birdies in some junk scoring or be its own “double junk” – at minimum we’d mark a birdie for any under-par hole).
- A **Sandie** event is checked post-hole: if the ghost made par or better *and* our simulation noted a bunker was hit during the hole, mark a Sandie. We might simulate bunker presence by random chance as described, or integrate it with how the score was achieved (e.g. if score = par but we know the ghost didn’t hit GIR, assume one of the misses was bunker and roll a chance).
- A **Greenie** is only possible on par-3 holes. After generating the score, if score ≤ par, check if the tee shot was on the green. We can simulate that as a random outcome independent of score (though highly correlated). A simplified approach is: if the result was par or birdie on a par-3, there’s a good chance the green was hit. We can explicitly roll the probability P(hit green|H) to decide if it was a Greenie event.
- **Greenie Penalty** is likewise only on par-3s. If the ghost’s score is bogey or worse on a par-3, we check if the green was hit in regulation. If yes, that means they 3-putted or worse, so mark a penalty (negative point).
- **LD10** is resolved on the 10th hole after tee shot. We generate ghost’s drive and determine if they win. If ghost wins (and presumably the group recognizes it), mark LD10 on the 10th hole’s junk line.

These junk events will be stored alongside the hole score in the simulation output, enabling the ghost to participate in side bets. For example, one could tally Birdies, Sandies, etc., and compare with human players’ junk totals to settle bets.

## **5. Implementation Steps & Pseudocode**

Below are implementation guidelines for generating a ghost player’s scores and junk events in a JavaScript/TypeScript environment. The approach is stochastic, using a seedable random number generator for repeatability (so ghost performance can be consistent across simulations if desired):

**Step 0: Setup** – Define data structures and helper functions:

- Hole info: an array of 18 objects, each with par and strokeIndex.
- Ghost profile: { handicapIndex, (optional: drivingDistanceMean) }. You might derive drivingDistanceMean from handicap or keep a table.
- Random number generator: use a seedable library or custom PRNG (e.g. a linear congruential or Xorshift). Ensure all random draws use this for reproducibility.

**Step 1: Precompute per-hole parameters** (μ and σ):

```
const ghost = { index: 10 };  // example handicap 10
const course = [
  // e.g. { par: 4, strokeIndex: 7 }, ... for each hole 1-18
];
let mu = [], sigma = [];
// compute base distribution of strokes
const H = ghost.index;
const extraStrokes = (H > 0 ? H + (H >= 15 ? 5 : 3) : H);
// H plus an empirical buffer: +3 for mid, +5 for high handicaps, 0 or - for plus
// (adjust these constants as needed based on data)
for (let i = 0; i < 18; i++) {
  let par = course[i].par;
  let si = course[i].strokeIndex;
  // base strokes over par distributed:
  let base_over = H / 18;
  // difficulty weight: harder holes get slightly more
  // e.g. linear weight from 1.3 for SI=1 to 0.7 for SI=18 (normalize to sum=18)
  let diffWeight = (1.3 - 0.7) * ((19 - si) / 18) + 0.7;
  // normalized weight
  let weightFactor = diffWeight;  // (Normalization would involve dividing by average weight, ~1.0)
  let mean_over = base_over * weightFactor;
  // If H is an integer > 0, allocate full strokes for top H stroke indices:
  if (H >= si) mean_over = Math.max(mean_over, 1);
  if (H > 18 && si <= H - 18) {
    // allocate second strokes for handicap > 18
    mean_over = Math.max(mean_over, 2);
  }
  // Buffer distribution: distribute (extraStrokes - H) across holes proportionally
  let totalBase = base_over * 18;
  let buffer = (extraStrokes - H);
  if (buffer > 0) {
    // e.g. add extra fraction to hard holes proportional to diffWeight
    mean_over += buffer * (diffWeight / /*sum of all diffWeight*/ 18);
  }
  mu[i] = par + mean_over;
  // Standard deviation:
  let baseSigma = 0.5 + 0.025 * Math.abs(H);
  sigma[i] = baseSigma * (si <= 6 ? 1.1 : si >= 13 ? 0.9 : 1.0);
}
```

*(This pseudocode calculates a mean and sigma for each hole. In practice, you might refine the weight distribution or use a lookup table for μ and σ based on empirical data.)*

**Step 2: Simulate hole-by-hole score and events:**

```
let scorecard = [];
let rng = seedrandom('ghost-seed');  // assume a seedable RNG is available
for (let i = 0; i < 18; i++) {
  const par = course[i].par;
  // Draw a score from normal distribution N(mu[i], sigma[i])
  let strokeScore = Math.round(rng.normal(mu[i], sigma[i]));
  // Ensure score is at least (par - 2) and at most (par + 4) or some realistic bound
  strokeScore = Math.max(strokeScore, par - 2);
  strokeScore = Math.min(strokeScore, par + 4);
  // Re-adjust if needed to maintain realistic distribution (optional)

  // Junk events flags
  let birdie = false, sandie = false, greenie = false, greeniePen = false, ld10 = false;

  // Birdie or better
  if (strokeScore <= par - 1) {
    birdie = true;
    // if strokeScore <= par-2, it’s an eagle: could count as birdie for junk (or separate if defined)
  }

  // Sandie: simulate bunker scenario
  if (strokeScore <= par) {
    // Only consider sandie if made par or better
    // Probability ghost was in bunker:
    let missGIR = 1 - (ghost_GIR_overall);  // ghost_GIR_overall ~ 0.35 for H=10, etc.
    // Assume about 25% of missed greens involve a bunker
    let bunkerChance = missGIR * 0.25;
    if (rng() < bunkerChance) {
      // ghost was in bunker
      // Now, did they save par? strokeScore == par in this branch (birdie implies up-and-down for birdie from bunker, which could still count as sandie by some rules)
      if (strokeScore == par) {
        // chance to actually save par from bunker depends on skill
        let sandSaveRate = (H <= 0 ? 0.37 : H <= 10 ? 0.20 : 0.15);
        if (rng() < sandSaveRate) {
          sandie = true;
        }
      } else if (strokeScore < par) {
        // Birdie from bunker (fairway bunker eagle putt? or hole-out from bunker) – count as sandie as well
        sandie = true;
      }
    }
  }

  // Greenie / Greenie penalty on par-3
  if (par == 3) {
    // Determine if tee shot hit green
    let girPar3Rate = (H <= 0 ? 0.5 : H == 10 ? 0.3 : H == 20 ? 0.18 : (0.5 - 0.01*H));
    let hitGreen = rng() < girPar3Rate;
    if (hitGreen) {
      if (strokeScore <= par) {
        greenie = true;
      } else if (strokeScore >= par + 1) {
        greeniePen = true;
      }
    }
  }

  // Long Drive on 10
  if (i == 9) {  // hole 10 (index 9 if 0-based array)
    // Simulate drive distance
    let muDrive = (H <= 0 ? 270 : H <= 10 ? 250 : 210);
    let drive = rng.normal(muDrive, 10);
    // fairway check
    let fairwayProb = (H <= 0 ? 0.55 : H <= 10 ? 0.50 : 0.45);
    let fairway = rng() < fairwayProb;
    if (fairway) {
      // Simplified: 50% chance ghost wins if fairway (or compare with field distribution)
      if (rng() < 0.5) {
        ld10 = true;
      }
    }
    // (In a full simulation with multiple players, compare drive distances to determine actual winner)
  }

  scorecard.push({
    hole: i+1,
    par: par,
    strokes: strokeScore,
    birdie, sandie, greenie, greeniePen, ld10
  });
}
```

**Step 3: Output and checks:** The scorecard array now contains the gross score for each hole and flags for any junk events won on that hole. We sum up the strokes for a total score and also tally the junk points (each birdie, sandie, greenie, LD10 typically counts as one point, greenie penalties might count as -1 or just for monetary bets). We can output the scorecard in a formatted way or use it to compare with other players.

**Ensuring Plausibility:** We include a few safeguards in the code:

- We rounded and bounded the random score (Math.round and clamping between par-2 and par+4). This prevents extremely rare unrealistic outcomes (like an 8 on a par-3 for a scratch, or a hole-in-one for a 30-handicap every other round). You may adjust these bounds: for a high handicap, allow up to par+5 or 6 on tough holes (some 20-handicaps do make the occasional quad bogey). Conversely, you might allow par-3 hole-in-one as a very rare event (could treat an ace as a special case if rng() is below a tiny threshold).
- Use of a **seed** ('ghost-seed' in example) ensures that given the same seed and parameters, the ghost will produce the same round – useful for consistency in testing or competitions against the ghost. You can change the seed to get a different sequence of results.
- The probabilities for junk events are tied to the actual score outcomes (e.g. greenie only if par-3 and score outcome + hitGreen simulation). This keeps them consistent: e.g. ghost won’t get a “sandie” on a hole they shot double bogey – the logic naturally prevents that.
- For simplicity, some probabilities were treated as constants or piecewise by handicap (like sand save rate, fairway %, etc.). These can be refined or even made functions of H for smoother scaling. They were chosen based on stats (sand save 37%→15% from scratch to high cap , fairway ~50% average , etc.).

**Pseudocode summary:** The above code is a conceptual template. In production, you might structure it into functions (e.g. simulateHole(holeIndex, ghost) returning the score and events, and a loop to build the round). Also consider using a proper normal distribution function or library (as JavaScript doesn’t have one by default; one can use Box-Muller transform or a library like randomjs). Ensure to test the output distribution by simulating many rounds and verifying the averages match expectations (e.g. does a 15-handicap ghost average in the 90s? Does it get ~1 birdie every other round? etc.). Adjust the model parameters as needed based on those tests.

## **6. Edge Cases & Accessibility**

In developing this model, we need to handle various edge cases to keep the ghost’s performance **realistic and fair** across all scenarios:

- **Very Low Handicap (Plus or Scratch) Ghosts:** A plus-handicap ghost (e.g. +2) should occasionally shoot under par and rarely blow up. Our model handles this by effectively giving negative handicap strokes on the easiest holes. Edge consideration: a +2 handicap might realistically average around 70 on a par-72 (2 under) on a normal day. We must ensure the random variation doesn’t produce scores that are too high – a scratch or plus golfer will almost never shoot 90, for instance. In implementation, we might cap the upper end of scores more tightly for low H (e.g. scratch ghost maybe max +10 in a truly awful round). Also, allow for exceptional low rounds: a +2 might shoot -6 (66) on a hot day – our model can accommodate that via the random distribution, but we should verify the probability of such an outlier is low (maybe a few percent chance).
- **High Handicap Ghosts:** While our scope is H up to 20, some might attempt to use the ghost model for higher handicaps. The model should still function (the linear scaling of μ and σ can extend, though performance becomes increasingly inconsistent). One edge case is extremely high scores on a single hole – for example, a 30-handicap in real life might occasionally take an 8 or 9 on a par-4 (quad or quint bogey). If we were to simulate H=30, we’d allow a bit broader score bounds. Additionally, very high handicaps might have handicap strokes > 18 (two strokes on some holes). Our μ allocation logic already accounts for H > 18 by adding 2 strokes on the hardest holes.
- **Holes with Hazards or Extreme Difficulty:** If a particular hole at Millbrook is known for a water hazard or OB (say a island green par-3 or a narrow OB-lined par-5), real players of all levels sometimes take a big number there. Our generic model might underestimate the variance on such a hole. To handle this, we can include **hole-specific adjustments**:
    - For a hazard-heavy hole, increase σ and the probability of a double or worse. We could manually set a minimum bogey probability. For example, if hole 17 has water guarding the green, even a scratch might have 10% chance of a double (if they find water). You can incorporate a fixed chance of a penalty stroke: e.g. for hole17, before generating score, roll a 10% chance that ghost incurs a water hazard penalty (if so, add 1 to whatever score is rolled).
    - Conversely, if a hole is very short or straightforward (e.g. a driveable par-4 for long hitters, or a wide-open par-5), you might cap the worst-case score lower (ghost will likely make at worst bogey there, unless extremely unlucky). So you can adjust the distribution to produce fewer doubles on the easiest hole.
- **Par-3 vs Par-5 Special Cases:** As noted, performance differs on these. Our model gives a baseline but consider extremes: A high-handicap on a long par-5 might **always** make at least bogey or worse (they simply can’t reach in regulation and will likely have at least one poor shot). So for a hole like a 550-yard par-5 for a short-hitting 20-handicap, you might enforce a floor of bogey (they won’t birdie it without miraculous luck) and a higher chance of double. Similarly, a 120-yard par-3 is an equalizer hole: even a 20-handicap could hit the green and par it, so give them a nontrivial par chance there. These nuances can be tuned by hole. If known, you can input a custom difficulty parameter per hole (perhaps derived from the course’s **bogey rating** or stroke index).
- **Net Double Bogey / ESC Considerations:** The World Handicap System uses net double bogey as a max score for handicap purposes. If simulating rounds for handicap calculation, you might want to cap the ghost’s hole score at net double bogey (par + 2 + any handicap strokes) for realism and to not overly skew averages. However, for match play or junk, you might want the actual occasional “blow-up” score to occur (since junk bets like “training (polies)” for triple bogeys could exist, though not mentioned here). We leave extreme scores in but at low probability.
- **Multi-Player Interaction:** The ghost is intended to participate in side games. Ensure that for contested events like Greenies and LD10, the ghost’s simulation aligns with how you’ll compare it to real players:
    - If multiple players hit a green, typically the **closest to pin** who makes par gets the greenie. We haven’t modeled proximity, only whether ghost hit green. In a group scenario, you might need to decide if ghost was CTP. As an AI ghost, you might simply assume if ghost hit the green and made par, it gets a greenie dot (perhaps multiple players can get greenies in a casual interpretation). If strict, you could randomly choose one of the players who hit the green to award it, but that requires simulation of others.
    - For LD10, if you have other players’ drives, you’ll compare distance. We gave ghost a chance to win based on random distance draws. To integrate with live data, you would instead take the actual players’ long drive and simply compare ghost’s simulated drive to that. For fairness, maybe only give ghost the LD if its drive exceeds the known longest of real players.
- **Accessibility & Configuration:** The model should be accessible for tweaking:
    - We provided many constants (like 0.025*H for σ growth, 0.5 base σ, etc.). Those can be exposed as config variables or tuned based on feedback.
    - If the ghost is consistently beating players by too much or too easy to beat, adjust the calibration. E.g., if ghost’s junk count is too high, dial down birdie probabilities or sand save rates.
    - The random generator should allow a **seed input** so users can replay scenarios. This is important if, say, players want to “re-run” the ghost with the same conditions to see if they can do better, or to ensure consistency in a tournament setting.
    - Also consider an **“easy mode” or “hard mode”** for the ghost: perhaps allow slight handicapping of the ghost beyond index. For example, an option to make ghost perform at the high end (bad end) of its distribution more often if beginners want a forgiving opponent.
- **Output Interpretation:** We should ensure the ghost’s output is easy to read: e.g., for each hole, show score and annotate with junk: “Hole 3: 4 (Bogey)” – and maybe icons or letters for junk like [G] for greenie, [S] for sandie, etc., including penalties like [GP] for greenie penalty. Accessibility here means presenting the data in the scorekeeping app clearly, so players know when the ghost got a dot or owes a dot.
- **Unusual Junk Scenarios:**
    - If ghost eagles a hole (score 2 under par), how does that count? Likely still just a birdie for junk (unless your group counts it as two birdies or a special “double eagle” junk). Define this according to Millbrook’s conventions.
    - If ghost hits the green on a par-3 and makes birdie, that’s definitely a greenie (and possibly extra credit, some play double points for birdie greenie ). Our model would mark it as Greenie (and Birdie) – you might handle the combination scoring in the app logic.
    - Sandie on a hole where ghost birdies out of a bunker (yes, that’s a thing sometimes) – by our logic, we’d mark both Birdie and Sandie. Typically that’s fine (the ghost gets both a birdie dot and a sandie dot).
    - Long drive ties: if ghost and another player both crush it, typically first to appear or a measuring decides. Our simulation doesn’t cover tie-breaks; you might choose to not award anyone or always award one (probably not needed unless implementing very fine detail).

In summary, the model is designed to **“play well” across different handicaps and hole types**, but careful consideration of the above cases will make the ghost feel more natural. By adjusting parameters for extreme holes and ensuring the ghost’s best/worst case performances stay within plausible limits, we avoid situations like a ghost double-digit handicap shooting a 72 (too good) or a scratch ghost shooting 100 (far too bad). The ghost’s junk events are likewise scaled so that it can compete in side bets without dominating unrealistically – e.g. a 15-handicap ghost might get a couple of junk points in a round (birdie, maybe a sandy) which is on par with a human of similar skill, making the side game competitive.

## **7. References**

1. **Golf Monthly – Handicap Stats Comparison (2023):** Provided data on birdies per round and scoring breakdowns for scratch vs 10 vs 20 handicaps , as well as short-game stats like sand save and 3-putt percentages by handicap . These statistics informed the birdie probabilities and sand save rates in our model.
2. **MyGolfSpy – Golfer Performance by Handicap (2025):** Study showing average pars, birdies, bogeys per round for various handicap ranges and insights that better players avoid “big numbers” while higher handicaps rack up more double bogeys . Also noted how low handicaps excel on par-5s vs high handicaps on par-3s , which guided our par-specific adjustments.
3. **MyGolfSpy – Handicap vs Average Score (2021):** Analysis confirming that **average scores** are several strokes above handicap index (4–5 strokes for low H, 6–8 for high H) . We used this to add a scoring buffer so the ghost’s average total aligns with expectations.
4. **Shot Scope Data – Greens in Regulation (2022):** Statistics on GIR% by handicap (e.g. ~35% for 10 handicap, ~16% for 20) . We used this to estimate par-3 green-hit probabilities for Greenies and to infer bunker chances (since missed greens correlate with bunkers).
5. **Golf Digest/Arccos – Driving Distances by Handicap (2023):** Revealed average driver distances: ~250 yards for <10 handicaps, ~218 yards for teens, ~205 yards for 20+ , and fairway hit trends . We incorporated these figures for the LD10 simulation, scaling ghost’s driving ability with handicap.
6. **Millbrook Junk Rules (Discussion & Definitions):** Community descriptions of junk terms and MyScorecard glossary were referenced to clarify event definitions (Sandie = par from sand, Greenie = par on par-3 green, etc.) and scoring conventions. These ensured our simulation triggers junk events in line with common usage.
7. **USGA & WHS Guidelines:** The USGA’s statements on score distributions and score probability tables underpinned our assumption of quasi-normal distribution and guided the handling of rare exceptional scores in our model. These official insights helped fine-tune the ghost to perform like a real golfer in terms of variability and odds of low/high rounds.
# Millbrook Scorekeeper — Design Directions

Three distinct visual languages for the iOS app, mocked at iPhone width (390pt). Nothing in the Swift project has been touched. Open `index.html` for the side-by-side comparison.

## Why we're doing this

The current build is correct and quiet. White cards on grey, system font, soft shadows, forest-green accent — it reads like a settings screen, not a private money game played at a 100-year-old club. The data model is good; the **wardrobe** is the problem. Each direction below dresses the same screen in a different costume.

## The hero screen

All three mocks show the active scoring screen (`RoundView.swift`), since that is the screen players stare at on the tee box and the green. Header (hole + side balance), action chips (saved / call double), four player rows with stepper + net + junk flags, footer with Big Game total and Submit. Same content, three personalities.

---

## Direction A — Pro Shop Ledger

**Mood.** Wood-paneled grill room. Cordovan, brass, foxed paper. The app feels like the leather scorecard the caddie hands you on the first tee.

**Typography.**
- Display & numerals: **Fraunces** (italic, optical size 96+). Free, Google-hosted.
- Body & UI: **Inter Tight**.
- Tabular figures & micro-labels: **JetBrains Mono** in small caps with wide tracking.

**Palette.**
- Deep loden `#1F3A2A` (evolves the current `#1A5E46`)
- Parchment `#FBF6E7` page, ivory cards `#FFFDF5`
- Brass `#A0823F` rules and stamps
- Cordovan `#6B2118` for Red team, faded navy `#1B3147` for Blue
- Subtle multiply-blended paper grain

**Signature moves.**
- Hairline + brass double-rule under the wordmark.
- Hole number set huge in italic Fraunces — feels engraved.
- Junk flags are wax-seal stamps with dashed brass borders.
- Cards have an inset border so they read as engraved plates, not chat bubbles.
- Final settlement could render as a printed receipt with serial number.

**Risk: Low.** Closest to today; preserves brand equity. Easiest to translate to SwiftUI — most of it is colours, custom fonts, and `RoundedRectangle` with `.inset(by:)` strokes.

---

## Direction B — Twilight Broadcast

**Mood.** Premium sports HUD. ESPN/Sky Sports if the broadcast were of *your* foursome. Evening rounds, phosphor on dark glass.

**Typography.**
- Everything: **Geist** + **Geist Mono** (free, Vercel). Condensed numerics for the big scoreboard.
- Italic accents from **Instrument Serif** if you want a humanising note.

**Palette.**
- Base graphite `#07090d` with a soft phosphor halo at the top.
- Phosphor green `#19E26E` for the brand and the live indicator (with `0 0 24px glow`).
- Crimson `#FF3E5A` / Cyan `#41C8FF` for Red / Blue teams, both with soft glow.
- Amber `#FFB020` reserved for **carry** — the only "danger / attention" colour.
- Glass-morphic surfaces (`backdrop-filter: blur(20px)` + 1px white-at-8% border).

**Signature moves.**
- Pulsing "LIVE · H7" pill in the top-right — quietly tells you the round is in progress.
- Massive 84pt tabular hole number next to a glowing standing total.
- Each player row has a team-coloured vertical bar on the left edge that glows. Status colour without a single coloured chip.
- Submit button is the only saturated green block on the screen — impossible to miss in low light.
- Looks fantastic at twilight on a phone, which is when most of these rounds get scored.

**Risk: Medium.** Dark by default. Light mode would be a port, not a tweak. Glows and blurs add GPU cost; SwiftUI handles this fine on A14+ but worth checking on older devices.

---

## Direction C — Editorial Cut

**Mood.** Stripe Press chapter opener. A magazine spread of your foursome. The most designed silence of the three.

**Typography.**
- Display: **Instrument Serif** italic — free, gorgeous, used for hole numbers and headlines.
- Body: **Inter Tight**.
- Tabular figures and "page furniture": **JetBrains Mono** at 9-11pt with wide tracking.

**Palette.**
- Bone `#F4F1EA` page, near-black ink `#0E0E10`.
- Rust `#B7351C` for Red, Cobalt `#1731D6` for Blue — both used as flat blocks, no opacity tints.
- Two-toned: 95% of the screen is bone and ink; colour appears only where it earns its keep.

**Signature moves.**
- Masthead reads "MILLBROOK · VOL XII / the *game* / 27 V 26" — the app frames itself as an issue, not a tool.
- Giant decorative hole numeral as a watermark behind the headline.
- The standing total is treated as a **pull quote** in italic serif: "Red leads, Blue chasing the carry."
- Player rows are a **table** with thin rules, not cards. The whole screen reads as one page.
- Sharp corners. Zero rounded buttons. Chips and Submit are pure rectangles.
- A small page number ("Pg. 07 of 18") in the colophon — a delightful subtle joke for an 18-hole round.

**Risk: Highest.** Furthest from today; players have to *learn* this language. Tabbed grids and tight typography are easier to break with Dynamic Type — needs careful accessibility passes.

---

## Recommendation

If we want the **lowest-risk path to "no longer boring"**: **Direction A**. It honours the existing brand and the country-club subject matter, and is the smallest distance from the current SwiftUI code.

If we want the app to feel **alive on the tee box** and we don't mind being dark-first: **Direction B**. This is the one that will get the most "whoa, that's *yours*?" from other foursomes.

If we want a piece of design that looks like nothing else on the App Store and don't mind doing more work on accessibility / Dynamic Type: **Direction C**.

Personal pick: **A** for v1 with a deliberate option to evolve toward **B** for a "night mode" if dark-first proves popular. C is the boldest swing but the smallest audience for a 4-person money game.

## Open questions before we cut code

1. Custom fonts — happy to ship `Fraunces` / `Geist` / `Instrument Serif` in the bundle, or do we want to stick with SF Pro?
2. Dark mode — do you want all three to support both light and dark, or is each direction allowed to be one-mode-only?
3. Settlement screen — none of these mocks show the final settlement. If the chosen direction has a signature "money shot" moment, the Settle tab is where it lives. Worth a follow-up mock once a direction is picked.
4. Junk flags — there are up to 6 flags per player (sand, greenie, 3-putt, pickup, LD10, on-green). Today they live in a tight grid. Worth confirming we keep them in-row vs. behind a "+" disclosure.

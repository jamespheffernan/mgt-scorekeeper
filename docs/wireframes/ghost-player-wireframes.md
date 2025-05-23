# Ghost Player Feature Wireframes

## Overview
This document outlines the user interface flow and wireframes for the Ghost Player feature in the Millbrook Golf Tournament app. The feature allows users to add synthetic players when fewer than 4 real golfers are available.

## User Flow Summary
1. **Setup Screen**: User adds ghost players via ghost mode toggle
2. **Team Assignment**: Ghosts are assigned to teams like real players
3. **Tee Selection**: Ghosts appear in tee selection with team colors
4. **During Play**: Ghost scores are hidden by default, revealed on demand
5. **Score Reveal**: Animated reveal with narrative for engagement
6. **History**: Matches with ghosts are marked and filterable

---

## Wireframe 1: Players Setup Screen - Ghost Mode

```
┌─────────────────────────────────────┐
│ ⬅ Millbrook Game        [👻] Ghost │ <- Ghost FAB (top right)
├─────────────────────────────────────┤
│                                     │
│ Select 4 Players                    │
│ (2 selected, 2 needed)             │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Alice Johnson        Red ✓   │ │ <- Real player selected
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Bob Smith           Blue ✓   │ │ <- Real player selected  
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👻 Carol Lee (Ghost)    Red     │ │ <- Ghost player row
│ │    Based on: Carol Lee          │ │    (faded, ghost emoji)
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ + Add Ghost Player...           │ │ <- Add ghost option
│ └─────────────────────────────────┘ │
│                                     │
│              [Continue]             │
└─────────────────────────────────────┘
```

**Key Elements:**
- Ghost FAB toggles ghost mode
- Ghost players visually distinct (👻, faded)
- Shows source player name
- Team assignment works same as real players
- Clear visual hierarchy

---

## Wireframe 2: Ghost Mode Selection

```
┌─────────────────────────────────────┐
│ ⬅ Ghost Mode            [✓] Done   │ <- Exit ghost mode
├─────────────────────────────────────┤
│                                     │
│ Select Players as Ghosts            │
│ (Choose from available roster)      │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Carol Lee            [Add]   │ │ <- Available for ghost
│ │    Index: 12, Last: 2 days ago  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Dan Wilson           [Add]   │ │ <- Available for ghost
│ │    Index: 8, Last: 1 week ago   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Eve Brown            [Add]   │ │ <- Available for ghost
│ │    Index: 15, Last: 3 weeks ago │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Currently Selected Ghosts:          │
│ • Carol Lee (Red)                   │
│                                     │
└─────────────────────────────────────┘
```

**Key Elements:**
- Modal-free design, roster becomes ghost selection
- Shows player stats (handicap, last used)
- Clear selection state
- Can't select players already in match

---

## Wireframe 3: Tee Selection with Ghosts

```
┌─────────────────────────────────────┐
│ ⬅ Select Tees                      │
├─────────────────────────────────────┤
│                                     │
│ Choose Tee for Each Player          │
│                                     │
│ Red Team                            │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Alice                        │ │
│ │ Championship [v] Blue [v]       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👻 Carol (Ghost)               │ │ <- Ghost in red team
│ │ Championship [v] Red [v]        │ │    (slightly faded)
│ └─────────────────────────────────┘ │
│                                     │
│ Blue Team                           │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Bob                          │ │
│ │ Men's [v] Blue [v]              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👻 Dan (Ghost)                 │ │ <- Ghost in blue team
│ │ Men's [v] Blue [v]              │ │    (slightly faded)
│ └─────────────────────────────────┘ │
│                                     │
│              [Start Game]           │
└─────────────────────────────────────┘
```

**Key Elements:**
- Ghosts appear with team colors
- Maintain visual distinction (👻, faded)
- Same tee selection mechanics as real players

---

## Wireframe 4: During Play - Hidden Ghost Scores

```
┌─────────────────────────────────────┐
│ Hole 3 • Par 4 • 387 yds          │
├─────────────────────────────────────┤
│                                     │
│ Red Team                            │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Alice                    4   │ │ <- Real player score
│ │ Net: 3 (+1)                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👻 Carol (Ghost)        [?]    │ │ <- Hidden ghost score
│ │ Tap to reveal score             │ │
│ │              [👁 Reveal]        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Blue Team                           │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Bob                      5   │ │ <- Real player score
│ │ Net: 4 (+1)                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👻 Dan (Ghost)          [?]    │ │ <- Hidden ghost score
│ │ Tap to reveal score             │ │
│ │              [👁 Reveal]        │ │
│ └─────────────────────────────────┘ │
│                                     │
│          [Enter Hole Scores]        │
└─────────────────────────────────────┘
```

**Key Elements:**
- Ghost scores hidden by default
- Clear reveal button with eye icon
- Instructional text "Tap to reveal score"
- Visual suspense maintained

---

## Wireframe 5: Ghost Score Reveal Modal

```
┌─────────────────────────────────────┐
│                                     │
│              👻                     │ <- Large ghost icon
│                                     │
│         Carol's Score               │
│                                     │
│            ⭐ 3 ⭐                  │ <- Animated score reveal
│                                     │
│     "Carol sinks a 15-footer       │ <- Dynamic narrative
│      for a clutch birdie!"         │
│                                     │
│         Par 4, Net: 2              │ <- Additional context
│                                     │
│                                     │
│          [✓ Got it!]               │ <- Dismiss button
│                                     │
└─────────────────────────────────────┘
```

**Key Elements:**
- Celebration animation with stars/confetti
- Dynamic narrative based on score type
- Context information (par, net score)
- Single action to dismiss

---

## Wireframe 6: Revealed Ghost Score in FourBox

```
┌─────────────────────────────────────┐
│ Hole 3 • Par 4 • 387 yds          │
├─────────────────────────────────────┤
│                                     │
│ Red Team                            │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Alice                    4   │ │
│ │ Net: 3 (+1)                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👻 Carol (Ghost)            3   │ │ <- Revealed ghost score
│ │ Net: 2 (-1) ⭐ BIRDIE!         │ │    (with celebration)
│ │              [👁 Hide]          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Blue Team                           │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Bob                      5   │ │
│ │ Net: 4 (+1)                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👻 Dan (Ghost)          [?]    │ │ <- Still hidden
│ │ Tap to reveal score             │ │
│ │              [👁 Reveal]        │ │
│ └─────────────────────────────────┘ │
│                                     │
│          [Enter Hole Scores]        │
└─────────────────────────────────────┘
```

**Key Elements:**
- Score revealed with celebration indicator
- Option to hide score again
- Mixed state (some revealed, some hidden)
- Clear differentiation between states

---

## Wireframe 7: History with Ghost Indicator

```
┌─────────────────────────────────────┐
│ ⬅ Game History            [Filter] │
├─────────────────────────────────────┤
│                                     │
│ Recent Games                        │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👻 Dec 27, 2024                │ │ <- Ghost indicator
│ │ Millbrook GC                    │ │
│ │ Red $45 • Blue $22              │ │
│ │ Alice, Bob, Carol(G), Dan(G)    │ │ <- (G) = Ghost
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Dec 26, 2024                    │ │ <- No ghost icon
│ │ Millbrook GC                    │ │
│ │ Red $33 • Blue $28              │ │
│ │ Alice, Bob, Eve, Frank          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👻 Dec 25, 2024                │ │ <- Another ghost game
│ │ Pine Valley                     │ │
│ │ Red $67 • Blue $15              │ │
│ │ Alice, Bob(G), Carol, Dan       │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Key Elements:**
- Clear ghost indicator (👻) for rounds with ghosts
- Ghost players marked with (G) in player list
- Filterable by ghost/non-ghost rounds
- Consistent visual hierarchy

---

## Interactive States

### Ghost FAB States
- **Available**: Bright ghost icon, enabled
- **Disabled**: Faded when 4 players already selected
- **Active**: Different color when ghost mode is on

### Ghost Player Row States
- **Selection**: Checkboxes for team assignment
- **Display**: Read-only with ghost indicator
- **Hover**: Subtle highlight with ghost animation

### Score Reveal States
- **Hidden**: Question mark placeholder
- **Revealing**: Animation in progress
- **Revealed**: Score visible with celebration
- **Re-hidden**: Back to question mark

## Accessibility Considerations

1. **Screen Reader Support**
   - Proper ARIA labels for ghost elements
   - Alternative text for ghost icons
   - Status announcements for score reveals

2. **Keyboard Navigation**
   - Tab order includes ghost controls
   - Enter/Space activates reveal buttons
   - Escape closes reveal modal

3. **Visual Indicators**
   - High contrast for ghost/real player distinction
   - Icon + text labels (not just icons)
   - Color-blind friendly team indicators

4. **Reduced Motion**
   - Respect prefers-reduced-motion
   - Alternative static reveals for animations
   - Skip animation options

## Technical Implementation Notes

1. **Performance**
   - Lazy load ghost narratives
   - Efficient re-renders on reveal state changes
   - Minimize animation overhead

2. **State Management**
   - Persist reveal state in game store
   - Handle page refresh gracefully
   - Sync state across components

3. **Error Handling**
   - Graceful fallbacks for missing ghost data
   - Retry mechanisms for failed reveals
   - Clear error messages

This wireframe specification ensures a consistent, accessible, and engaging ghost player experience throughout the application. 
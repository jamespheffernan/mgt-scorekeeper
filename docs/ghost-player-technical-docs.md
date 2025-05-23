# Ghost Player Technical Documentation

## Architecture Overview

The Ghost Player feature is implemented as a distributed system across multiple layers of the application, maintaining separation of concerns while ensuring seamless integration with existing Millbrook game logic.

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Ghost Player System                      │
├─────────────────────────────────────────────────────────────┤
│  UI Layer                                                   │
│  ├── PlayersScreen (Setup & Ghost Mode)                     │
│  ├── PlayersFourBox (Score Display & Reveal)               │
│  ├── GhostRevealModal (Animated Reveals)                   │
│  └── GameHistory (Ghost Indicators)                        │
├─────────────────────────────────────────────────────────────┤
│  State Management                                           │
│  ├── setupFlowStore (Ghost Selection)                      │
│  ├── gameStore (Match State & Reveals)                     │
│  └── rosterStore (Available Players)                       │
├─────────────────────────────────────────────────────────────┤
│  Business Logic                                             │
│  ├── ghostScoreGenerator (Statistical Modeling)            │
│  ├── ghostNarrativeGenerator (Dynamic Stories)             │
│  └── calcEngine Integration (Score Processing)             │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── API-GameState (Type Definitions)                      │
│  ├── millbrookDb (Persistence)                             │
│  └── localStorage (Reveal State)                           │
└─────────────────────────────────────────────────────────────┘
```

## Type System

### Core Types

```typescript
// Player Extension
interface Player {
  id: string;
  name: string;
  index: number;
  first?: string;
  last?: string;
  isGhost?: boolean;           // Ghost player flag
  sourcePlayerId?: string;     // Original player reference
  lastUsed?: string;           // ISO timestamp
}

// Match Extension  
interface Match {
  // ... existing fields
  hasGhost?: boolean;          // Ghost presence flag
}

// Ghost-Specific Types
interface GhostJunkEvents {
  [hole: number]: JunkFlags;   // Pre-generated junk events
}

interface GhostRevealState {
  [ghostPlayerId: string]: Set<number>; // Revealed holes per ghost
}

interface GameState {
  // ... existing fields
  ghostJunkEvents: { [playerId: string]: GhostJunkEvents };
  ghostRevealState: GhostRevealState;
}
```

### Store Actions

```typescript
// Ghost Reveal Management
revealGhostScore: (ghostPlayerId: string, hole: number) => void;
hideGhostScore: (ghostPlayerId: string, hole: number) => void;
isGhostScoreRevealed: (ghostPlayerId: string, hole: number) => boolean;
revealAllGhostScores: (ghostPlayerId: string) => void;

// Utility
getPlayerById: (id: string) => Player | undefined;
```

## Score Generation System

### Statistical Model

The ghost score generator uses a sophisticated statistical model based on USGA handicap system research:

```typescript
function generateGhostScores(
  ghostIndex: number,        // Player handicap index
  course: { holes: HoleInfo[] }, // Course data
  seed: number               // Random seed for reproducibility
): number[]
```

#### Mathematical Foundation

**Expected Score Calculation:**
```
E(score) = par + (ghostIndex × SI) / 18
```

**Standard Deviation Model:**
```
σ = max(1.2, min(2.8, 1.2 + 0.1 × ghostIndex))
```

**Distribution Properties:**
- **Score Range**: [1, 12] (bounded for realism)
- **Distribution**: Modified normal distribution with realistic bounds
- **Frequency Validation**: Birdie rates, bogey rates match empirical data

### Junk Event Generation

Pre-generated junk events ensure consistency and realism:

```typescript
function generateGhostJunkEvents(
  ghostIndex: number,
  grossScores: number[],
  course: { holes: HoleInfo[] },
  seed: number
): GhostJunkEvents
```

#### Probability Tables

| Event Type | Handicap 0-9 | Handicap 10-18 | Handicap 19+ |
|------------|---------------|-----------------|--------------|
| Birdie     | 15%           | 8%              | 4%           |
| Sandie     | 45%           | 35%             | 25%          |
| Greenie    | 25% (Par 3)   | 18% (Par 3)     | 12% (Par 3)  |
| Long Drive | 30% (Par 4+)  | 25% (Par 4+)    | 20% (Par 4+) |
| 3-Putt     | 8%            | 12%             | 18%          |

## State Management

### Setup Flow Integration

```typescript
// setupFlowStore.ts
interface SetupFlowState {
  ghostPlayers: Player[];     // Currently selected ghosts
  isGhostMode: boolean;       // Ghost selection mode active
}

// Actions
toggleGhostMode: () => void;
addGhostPlayer: (sourcePlayer: Player) => void;
removeGhostPlayer: (ghostId: string) => void;
```

### Game State Management

```typescript
// gameStore.ts - Ghost Integration
createMatch: async (
  players: Player[],          // Mixed real/ghost players
  teams: Team[],
  matchOptions: MatchOptions
) => void;

// Ghost score reveal state is persisted via zustand persist middleware
```

### Persistence Strategy

**localStorage (via zustand):**
- Reveal state persistence
- Setup flow state
- User preferences

**IndexedDB (via millbrookDb):**
- Complete game states
- Match history with ghost flags
- Player roster data

```typescript
// Serialization handling for Sets
function serializeGhostRevealState(state: GhostRevealState): any {
  const serialized: any = {};
  for (const [ghostId, revealedSet] of Object.entries(state)) {
    serialized[ghostId] = Array.from(revealedSet);
  }
  return serialized;
}
```

## UI Components

### PlayersScreen (Setup)

**Responsibilities:**
- Ghost mode toggle
- Real player selection
- Ghost player creation and configuration
- Team assignment for mixed player types

**Key Implementation Details:**
```typescript
// Ghost mode state management
const [isGhostMode, setIsGhostMode] = useState(false);
const eligibleGhostPlayers = roster.filter(player => 
  !selectedPlayers.some(sp => sp.id === player.id) &&
  !ghostPlayers.some(gp => gp.sourcePlayerId === player.id)
);

// Visual distinction
<PlayerRow 
  player={ghostPlayer}
  isGhostDisplay={true}
  team={assignedTeam}
/>
```

### PlayersFourBox (Score Display)

**Responsibilities:**
- Hide/show ghost scores based on reveal state
- Reveal/hide button management
- Integration with score display logic

**Score Display Logic:**
```typescript
function getDisplayScore(player: Player, hole: number): string | number {
  if (player.isGhost) {
    const isRevealed = isGhostScoreRevealed(player.id, hole);
    return isRevealed ? actualScore : '?';
  }
  return realPlayerScore || '--';
}
```

### GhostRevealModal (Engagement)

**Responsibilities:**
- Animated score reveals
- Dynamic narrative generation
- Celebration effects

**Animation System:**
```typescript
// CSS animations with React Spring or Framer Motion
const revealAnimation = useSpring({
  scale: revealed ? 1 : 0,
  opacity: revealed ? 1 : 0,
  config: { tension: 300, friction: 30 }
});
```

## Integration Points

### Calculation Engine Integration

Ghost players integrate seamlessly with existing calculation systems:

```typescript
// Big Game Exclusion
function calculateBigGameRow(hole: number, netScores: number[]): BigGameRow {
  // Filter out ghost players before calculation
  const nonGhostScores = players
    .map((p, idx) => p.isGhost ? null : netScores[idx])
    .filter(score => score !== null);
    
  return calculateBigGame(nonGhostScores);
}

// Junk Event Processing
function evaluateJunkEvents(/* ... */) {
  if (player.isGhost) {
    // Use pre-generated junk events
    const ghostJunk = ghostJunkEvents[player.id][hole];
    return processGhostJunk(ghostJunk);
  }
  // Normal junk evaluation for real players
}
```

### History Integration

```typescript
interface GameHistory {
  // ... existing fields
  hasGhost?: boolean;         // Ghost indicator
}

// UI rendering
function HistoryRow({ gameHistory }: Props) {
  return (
    <div className="history-row">
      {gameHistory.hasGhost && <span className="ghost-indicator">👻</span>}
      {/* ... rest of row */}
    </div>
  );
}
```

## Testing Strategy

### Unit Tests

**Score Generation:**
```typescript
describe('Ghost Score Generator', () => {
  it('produces scores within expected range', () => {
    const scores = generateGhostScores(10, mockCourse, 12345);
    expect(scores.every(s => s >= 1 && s <= 12)).toBe(true);
  });

  it('respects statistical distribution', () => {
    // Run multiple iterations, validate mean/stddev
  });
});
```

**Junk Event Generation:**
```typescript
describe('Ghost Junk Events', () => {
  it('generates appropriate birdie frequency', () => {
    const junkEvents = generateGhostJunkEvents(8, scores, course, 12345);
    const birdieCount = Object.values(junkEvents)
      .filter(flags => flags.isBirdie).length;
    expect(birdieCount).toBeWithinRange(1, 4); // ~8% of 18 holes
  });
});
```

### Integration Tests

**Complete Round Simulation:**
```typescript
describe('Ghost Integration', () => {
  it('completes 18-hole round with mixed players', async () => {
    const players = [realPlayer1, realPlayer2, ghostPlayer1, ghostPlayer2];
    await createMatch(players, teams, options);
    
    // Play all 18 holes
    for (let hole = 1; hole <= 18; hole++) {
      await enterHoleScores(hole, scores, junkFlags);
    }
    
    // Validate final state
    expect(ledger).toHaveLength(18);
    expect(match.hasGhost).toBe(true);
  });
});
```

### Statistical Validation

**Distribution Tests:**
```typescript
describe('Statistical Properties', () => {
  it('maintains proper score distribution across handicap levels', () => {
    // Generate 1000 rounds, validate statistical properties
    const results = runStatisticalValidation();
    expect(results.meanScore).toBeCloseTo(expectedMean, 1);
    expect(results.birdieRate).toBeWithinRange(0.06, 0.10);
  });
});
```

## Performance Considerations

### Optimization Strategies

**Score Pre-generation:**
- All ghost scores generated at match creation
- No runtime calculation delays
- Deterministic results for testing

**Efficient State Updates:**
```typescript
// Batch reveal state updates
const revealMultipleHoles = useCallback((ghostId: string, holes: number[]) => {
  setGhostRevealState(prev => {
    const updated = { ...prev };
    holes.forEach(hole => updated[ghostId].add(hole));
    return updated;
  });
}, []);
```

**Memory Management:**
- Clean up ghost data when resetting games
- Efficient serialization for persistence
- Lazy loading of narrative content

### Render Optimization

```typescript
// Memoized components for ghost displays
const GhostScoreDisplay = memo(({ player, hole, revealed }) => {
  return revealed ? <ScoreRevealed /> : <ScoreHidden />;
});

// Prevent unnecessary re-renders
const ghostRevealHandler = useCallback((ghostId, hole) => {
  revealGhostScore(ghostId, hole);
}, [revealGhostScore]);
```

## Error Handling

### Graceful Degradation

```typescript
// Missing ghost data fallback
function getGhostScore(ghostId: string, hole: number): number {
  try {
    return ghostScoreMap[ghostId][hole - 1];
  } catch (error) {
    console.warn(`Ghost score missing for ${ghostId}, hole ${hole}`);
    return courseHoles[hole - 1]?.par || 4; // Fallback to par
  }
}

// Course data failures
async function createMatch(/* ... */) {
  try {
    const courseData = await millbrookDb.getCourse(courseId);
    // Use real course data
  } catch (error) {
    console.warn('Course data unavailable, using defaults');
    // Fallback to default course structure
  }
}
```

### Error Recovery

**Invalid Ghost Configuration:**
```typescript
function validateGhostPlayers(players: Player[]): ValidationResult {
  const errors: string[] = [];
  
  players.forEach(player => {
    if (player.isGhost) {
      if (!player.sourcePlayerId) {
        errors.push(`Ghost player ${player.name} missing source player`);
      }
      if (player.index < 0 || player.index > 36) {
        errors.push(`Invalid handicap for ghost ${player.name}`);
      }
    }
  });
  
  return { isValid: errors.length === 0, errors };
}
```

## Security Considerations

### Data Validation

```typescript
// Sanitize ghost player input
function createGhostPlayer(sourcePlayer: Player): Player {
  return {
    id: crypto.randomUUID(),
    name: `Ghost (${sanitize(sourcePlayer.name)})`,
    index: Math.max(0, Math.min(36, sourcePlayer.index)),
    isGhost: true,
    sourcePlayerId: sourcePlayer.id,
    first: sanitize(sourcePlayer.first),
    last: sanitize(sourcePlayer.last)
  };
}
```

### State Integrity

```typescript
// Validate reveal state integrity
function validateRevealState(state: GhostRevealState): boolean {
  return Object.entries(state).every(([ghostId, holes]) => {
    return Array.from(holes).every(hole => hole >= 1 && hole <= 18);
  });
}
```

## Deployment Considerations

### Feature Flags

```typescript
// Progressive rollout capability
const GHOST_PLAYER_ENABLED = process.env.FEATURE_GHOST_PLAYERS === 'true';

function GhostFAB() {
  if (!GHOST_PLAYER_ENABLED) return null;
  return <GhostToggleButton />;
}
```

### Migration Strategy

```typescript
// Backward compatibility for existing data
function migrateGameState(oldState: any): GameState {
  return {
    ...oldState,
    ghostJunkEvents: oldState.ghostJunkEvents || {},
    ghostRevealState: oldState.ghostRevealState || {},
    match: {
      ...oldState.match,
      hasGhost: oldState.players?.some((p: Player) => p.isGhost) || false
    }
  };
}
```

### Monitoring

```typescript
// Analytics for ghost feature usage
function trackGhostPlayerUsage(eventType: string, data: any) {
  analytics.track('Ghost Player Event', {
    eventType,
    ghostCount: data.ghostCount,
    totalPlayers: data.totalPlayers,
    timestamp: new Date().toISOString()
  });
}
```

This technical documentation provides a comprehensive guide for developers working with the ghost player system, covering architecture, implementation details, testing strategies, and operational considerations. 
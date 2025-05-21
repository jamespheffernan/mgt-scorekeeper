/*********************************************************
 * Core domain types for Millbrook + Big Game PWA.
 * Persisted in IndexedDB ('millbrook') via Dexie.
 *********************************************************/

export type Team = 'Red' | 'Blue';

/* ––––– 1. Player & Match ––––– */

export interface Player {
  id: string;          // uuid
  
  // Name fields
  first: string;       // First name (required)
  last: string;        // Last name (required)
  name?: string;       // Legacy field for backward compatibility 
  
  index: number;       // GHIN / WHS handicap index (e.g. 8.4)
  ghin?: string;
  defaultTeam?: Team;
  // Added player preferences
  preferredTee?: string;
  lastUsed?: string;   // ISO date string
  notes?: string;
  // Ghost player support
  isGhost?: boolean;         // True if this is a ghost player
  sourcePlayerId?: string;   // If ghost, the real player this ghost is based on
}

export interface Match {
  id: string;                  // uuid
  date: string;                // ISO (YYYY-MM-DD)
  bigGame: boolean;
  playerIds: [string, string, string, string];
  holePar: readonly number[];  // length 18
  holeSI:  readonly number[];  // length 18
  state: 'active' | 'finished';
  currentHole: number;         // 1-18
  carry: number;               // dollars
  base: number;                // dollars for *next* hole
  doubles: number;             // count of doubles so far
  bigGameTotal: number;        // sum of BigGameRow.subtotal
  
  // Course and tee information
  courseId?: string;           // Reference to selected course
  playerTeeIds?: [string, string, string, string]; // Which tee each player is using
  
  // Timestamps for tracking game duration
  startTime?: string;          // ISO timestamp when game started
  endTime?: string;            // ISO timestamp when game ended
  // Ghost player support
  hasGhost?: boolean;          // True if this match includes a ghost player
}

/* ––––– 2. Per-hole Snapshots ––––– */

export interface HoleScore {
  hole: number;                                   // 1-18
  gross: [number, number, number, number];
  net:   [number, number, number, number];
  teamNet: [number, number];                      // lower net per team
}

export interface LedgerRow {
  hole: number;
  base: number;
  carryAfter: number;
  doubles: number;
  payout: number;
  runningTotals: [number, number, number, number];
}

export type JunkType =
  | 'Birdie'
  | 'Sandie'
  | 'Greenie'
  | 'Penalty'
  | 'LD10';

export interface JunkEvent {
  hole: number;
  playerId: string;
  teamId: Team;
  type: JunkType;
  value: number;            // dollars
}

export interface BigGameRow {
  hole: number;
  bestNet: [number, number];
  subtotal: number;
}

/* ––––– 3. Aggregate GameState ––––– */

export interface GameState {
  match: Match;
  players: Player[];       // The 4 players in the match
  playerTeams: Team[];     // Team assignments
  holeScores: HoleScore[]; // index = hole-1
  ledger: LedgerRow[];
  junkEvents: JunkEvent[];
  bigGameRows: BigGameRow[];
}

/* ––––– 5. Game History ––––– */

export interface GameHistory {
  id: string;                  // Same as match.id for reference
  date: string;                // ISO date when match was played
  courseName: string;          // Name of the course
  
  // New structure for player information
  playerInfo: Array<{
    id: string;
    first: string;
    last: string;
    team: Team;
  }>;
 
  // For backward compatibility
  playerNames?: string[];             // Legacy: List of player names
  teamAssignments?: Team[];           // Legacy: List of team assignments
  finalScores?: number[];             // Legacy: Final scores for each player
  
  teamTotals: [number, number];       // Final team totals [Red, Blue]
  bigGameTotal: number;               // Final Big Game total if applicable
  startTime: string;                  // ISO timestamp when game started
  endTime: string;                    // ISO timestamp when game ended
  duration: number;                   // Game duration in minutes
  holesPlayed: number;                // Total number of holes completed
  isComplete: boolean;                // Whether the game was completed or cancelled
  bigGameEnabled: boolean;            // Whether Big Game was enabled
  hasGhost?: boolean;                // True if this match included a ghost player
}

/* ––––– 4. Dexie Schema ––––– */

export interface DbSchema {
  matches: Match;
  gameStates: GameState;     // key = match.id
  players: Player;           // key = player.id
  courses: any;              // Course schema defined separately
  gameHistory: GameHistory;  // key = match.id (same as the original match)
} 
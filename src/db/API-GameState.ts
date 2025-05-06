/*********************************************************
 * Core domain types for Millbrook + Big Game PWA.
 * Persisted in IndexedDB ('millbrook') via Dexie.
 *********************************************************/

export type Team = 'Red' | 'Blue';

/* ––––– 1. Player & Match ––––– */

export interface Player {
  id: string;          // uuid
  name: string;
  index: number;       // GHIN / WHS handicap index (e.g. 8.4)
  ghin?: string;
  defaultTeam?: Team;
  // Added player preferences
  preferredTee?: string;
  lastUsed?: string;   // ISO date string
  notes?: string;
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

/* ––––– 4. Dexie Schema ––––– */

export interface DbSchema {
  matches: Match;
  gameStates: GameState;     // key = match.id
  players: Player;           // key = player.id
  courses: any;              // Course schema defined separately
} 
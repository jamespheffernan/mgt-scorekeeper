import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { allocateStrokes, allocateStrokesMultiTee } from '../calcEngine/strokeAllocator';
import { callDouble as callMatchDouble, calculateBase, DoublingState } from '../calcEngine/baseCalculator';
import { calculateHolePayout, calculatePlayerPayouts, updateRunningTotals } from '../calcEngine/payoutCalculator';
import { evaluateJunkEvents, JunkEvent, JunkFlags as JF } from '../calcEngine/junkCalculator';
import { calculateBigGameRow, calculateBigGameTotal, BigGameRow } from '../calcEngine/bigGameCalculator';
import { millbrookDb } from '../db/millbrookDb';
import { Player, Team, GameHistory } from '../db/API-GameState';
import { TeeOption, HoleInfo } from '../db/courseModel';

// Re-export types
export type JunkFlags = JF;
export type { JunkEvent, BigGameRow };
export type { Player, Team } from '../db/API-GameState';

// Type definitions matching our API-GameState.ts
export interface Match {
  id: string;                  // uuid
  date: string;                // ISO (YYYY-MM-DD)
  bigGame: boolean;
  playerIds: [string, string, string, string];
  holePar: number[];  // length 18
  holeSI:  number[];  // length 18
  state: 'active' | 'finished';
  currentHole: number;         // 1-18
  carry: number;               // dollars
  base: number;                // dollars for *next* hole
  doubles: number;             // count of doubles so far
  bigGameTotal: number;        // sum of BigGameRow.subtotal
  courseId?: string;           // Reference to selected course
  playerTeeIds?: [string, string, string, string]; // Which tee each player is using
  doubleUsedThisHole?: boolean; // Flag to track double usage on current hole
  startTime?: string;          // ISO date string
  endTime?: string;            // ISO date string
}

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

export interface GameState {
  match: Match;
  players: Player[];      // The 4 players in the match
  playerTeams: Team[];    // Team assignments
  holeScores: HoleScore[];   // index = hole-1
  ledger: LedgerRow[];
  junkEvents: JunkEvent[];
  bigGameRows: BigGameRow[];
  // UI state
  isDoubleAvailable: boolean;
  trailingTeam?: Team;
}

// Helper function to determine the winning team or push
function determineWinner(teamNet: [number, number]): 'Red' | 'Blue' | 'Push' {
  if (teamNet[0] < teamNet[1]) return 'Red';
  if (teamNet[1] < teamNet[0]) return 'Blue';
  return 'Push';
}

// Helper function to find the trailing team
function findTrailingTeam(ledger: LedgerRow[], playerTeams: Team[]): Team | undefined {
  if (ledger.length === 0) return undefined;
  
  const lastLedgerRow = ledger[ledger.length - 1];
  
  // Count the number of players on each team
  const redCount = playerTeams.filter(team => team === 'Red').length;
  const blueCount = playerTeams.filter(team => team === 'Blue').length;
  
  // Calculate team totals by dividing by team size to get the correct team total
  // This ensures we're not double counting by just summing player values
  const redTotal = playerTeams.reduce((sum, team, index) => 
    team === 'Red' ? sum + lastLedgerRow.runningTotals[index] : sum, 0) / redCount;
  
  const blueTotal = playerTeams.reduce((sum, team, index) => 
    team === 'Blue' ? sum + lastLedgerRow.runningTotals[index] : sum, 0) / blueCount;
  
  console.log(`[DEBUG] Team totals: Red=${redTotal}, Blue=${blueTotal}`);
  
  if (redTotal < blueTotal) return 'Red';
  if (blueTotal < redTotal) return 'Blue';
  return undefined; // Tie
}

// MatchOptions interface for createMatch
interface MatchOptions {
  bigGame: boolean;
  courseId?: string;
  playerTeeIds?: [string, string, string, string];
}

// Utility function to get player-specific stroke indexes
export const getPlayerStrokeIndexes = async (
  courseId: string | undefined,
  playerTeeIds: string[] | undefined
): Promise<number[][] | null> => {
  if (!courseId || !playerTeeIds) {
    return null;
  }
  
  try {
    const course = await millbrookDb.getCourse(courseId);
    if (!course) {
      return null;
    }
    
    // Create a map of all tee options by ID
    const teeMap: Record<string, TeeOption> = {};
    course.teeOptions.forEach(tee => {
      teeMap[tee.id] = tee;
    });
    
    // Create an array of SI arrays for each player
    const playerSIs: number[][] = [];
    
    for (let i = 0; i < playerTeeIds.length; i++) {
      const teeId = playerTeeIds[i];
      const tee = teeMap[teeId];
      
      if (tee && tee.holes) {
        // Extract hole SI values in order (1-18)
        const holeSIs = new Array(18).fill(0);
        tee.holes.forEach((holeInfo: HoleInfo) => {
          if (holeInfo.number >= 1 && holeInfo.number <= 18) {
            holeSIs[holeInfo.number - 1] = holeInfo.strokeIndex;
          }
        });
        
        playerSIs.push(holeSIs);
      } else {
        // Default SI if tee not found
        playerSIs.push(Array(18).fill(0).map((_, i) => i + 1));
      }
    }
    
    return playerSIs;
  } catch (error) {
    console.error('Error loading player stroke indexes:', error);
    return null;
  }
};

// Calculate the number of minutes between two ISO timestamps
function calculateDurationInMinutes(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return Math.round((end - start) / (1000 * 60));
}

// Create the store
export const useGameStore = create(
  persist<GameState & {
    // Actions
    createMatch: (players: Player[], teams: Team[], matchOptions: MatchOptions) => void;
    enterHoleScores: (hole: number, grossScores: [number, number, number, number], junkFlags: JunkFlags[]) => Promise<void>;
    callDouble: () => void;
    finishRound: () => Promise<void>;
    cancelMatch: () => Promise<void>;
    resetGame: () => void;
    // Utility
    getPlayerById: (id: string) => Player | undefined;
  }>(
    (set, get) => ({
      // Initial state
      match: {
        id: '',
        date: '',
        bigGame: false,
        playerIds: ['', '', '', ''],
        holePar: Array(18).fill(4),  // Default all holes to par 4
        holeSI: Array(18).fill(1),   // Default stroke indexes
        state: 'active',
        currentHole: 1,
        carry: 0,
        base: 1,
        doubles: 0,
        bigGameTotal: 0
      },
      players: [],
      playerTeams: ['Red', 'Blue', 'Red', 'Blue'],
      holeScores: [],
      ledger: [],
      junkEvents: [],
      bigGameRows: [],
      isDoubleAvailable: false,
      trailingTeam: undefined,

      // Create a new match
      createMatch: (players, teams, matchOptions: MatchOptions) => {
        const today = new Date().toISOString().split('T')[0];
        const playerIds = players.map(p => p.id) as [string, string, string, string];
        const startTime = new Date().toISOString();
        
        set({
          match: {
            id: crypto.randomUUID(),
            date: today,
            bigGame: matchOptions.bigGame,
            playerIds,
            holePar: Array(18).fill(4),  // Default all holes to par 4
            holeSI: Array(18).fill(0).map((_, i) => i + 1),   // Default stroke indexes 1-18
            state: 'active',
            currentHole: 1,
            carry: 0,
            base: 1,  // First hole starts with $1
            doubles: 0,
            bigGameTotal: 0,
            courseId: matchOptions.courseId,
            playerTeeIds: matchOptions.playerTeeIds,
            doubleUsedThisHole: false,  // Initialize to false
            startTime: startTime        // Record when the game started
          },
          players,
          playerTeams: teams,
          holeScores: [],
          ledger: [],
          junkEvents: [],
          bigGameRows: [],
          isDoubleAvailable: false,
          trailingTeam: undefined
        });
        
        // Also save the initial game state to IndexedDB
        const fullGameState = get();
        const gameStateToSave: GameState = {
          match: fullGameState.match,
          players: fullGameState.players,
          playerTeams: fullGameState.playerTeams,
          holeScores: fullGameState.holeScores,
          ledger: fullGameState.ledger,
          junkEvents: fullGameState.junkEvents,
          bigGameRows: fullGameState.bigGameRows,
          isDoubleAvailable: fullGameState.isDoubleAvailable,
          trailingTeam: fullGameState.trailingTeam,
        };
        millbrookDb.saveGameState(gameStateToSave).catch(err => {
          console.error('Error saving initial game state:', err);
        });
        
        // Update player lastUsed timestamps
        players.forEach(player => {
          const updatedPlayer = {
            ...player,
            lastUsed: startTime
          };
          millbrookDb.savePlayer(updatedPlayer).catch(err => {
            console.error('Error updating player last used time:', err);
          });
        });
      },

      // Enter scores for a hole
      enterHoleScores: async (hole, grossScores, junkFlags) => {
        const { match, players, playerTeams, holeScores, ledger, junkEvents, bigGameRows } = get();
        
        // DEBUG LOGS - Initial state
        console.log(`[DEBUG] Hole ${hole}: Starting calculation with base=${match.base}, carry=${match.carry}`);
        
        // 1. Calculate net scores using stroke allocation
        const indexes = players.map(p => p.index);
        
        // Try to get player-specific stroke indexes if course data is available
        const playerSIs = await getPlayerStrokeIndexes(match.courseId, match.playerTeeIds);
        
        // Update match.holePar if we have course data
        let updatedMatch = { ...match };
        if (playerSIs && match.courseId && match.playerTeeIds) {
          try {
            const courseData = await millbrookDb.getCourse(match.courseId);
            if (courseData) {
              // Get the hole par from the first player's tee
              const teeId = match.playerTeeIds[0];
              const tee = courseData.teeOptions.find(t => t.id === teeId);
              if (tee && tee.holes) {
                const holeInfo = tee.holes.find(h => h.number === hole);
                if (holeInfo) {
                  // Update the holePar array with accurate course data
                  const updatedHolePar = [...match.holePar];
                  updatedHolePar[hole - 1] = holeInfo.par;
                  updatedMatch = { ...updatedMatch, holePar: updatedHolePar };
                  console.log(`[DEBUG] Updated hole ${hole} par to ${holeInfo.par} based on course data`);
                }
              }
            }
          } catch (error) {
            console.error('Error updating hole par:', error);
          }
        }
        
        let strokeMap;
        if (playerSIs) {
          // Use multi-tee stroke allocation
          strokeMap = allocateStrokesMultiTee(indexes, playerSIs);
        } else {
          // Fall back to standard stroke allocation
          strokeMap = allocateStrokes(indexes, [...match.holeSI]);
        }
        
        // Get strokes for this hole
        const holeStrokes = strokeMap.map(playerStrokes => playerStrokes[hole - 1] || 0);
        
        // Calculate net scores
        const netScores = grossScores.map((gross, i) => gross - holeStrokes[i]) as [number, number, number, number];
        
        // 2. Calculate team nets (lower score from each team)
        const redScores = netScores.filter((_, i) => playerTeams[i] === 'Red');
        const blueScores = netScores.filter((_, i) => playerTeams[i] === 'Blue');
        
        const teamNet: [number, number] = [
          Math.min(...redScores),
          Math.min(...blueScores)
        ];
        
        // 3. Create hole score record
        const holeScore: HoleScore = {
          hole,
          gross: grossScores,
          net: netScores,
          teamNet
        };
        
        // 4. Determine winner and calculate payout
        const winner = determineWinner(teamNet);
        const holePayout = calculateHolePayout(winner, updatedMatch.base, updatedMatch.carry);
        console.log(`[DEBUG] Hole winner: ${winner}, Payout calculated: ${JSON.stringify(holePayout)}`);
        console.log(`[DEBUG] Payout breakdown: base=${updatedMatch.base}, carry=${updatedMatch.carry}, win bonus=${updatedMatch.base}`);
        const { payout, newCarry } = holePayout;
        
        // 5. Calculate individual player payouts
        const playerPayouts = calculatePlayerPayouts(winner, payout, playerTeams);
        console.log(`[DEBUG] Player payouts: ${JSON.stringify(playerPayouts)}`);
        
        // 6. Update running totals
        const previousRow = ledger.length > 0 ? ledger[ledger.length - 1] : null;
        const previousTotals = previousRow ? previousRow.runningTotals : [0, 0, 0, 0];
        const runningTotals = updateRunningTotals(previousTotals, playerPayouts) as [number, number, number, number];
        console.log(`[DEBUG] Previous totals: ${JSON.stringify(previousTotals)}`);
        console.log(`[DEBUG] New running totals after team payout: ${JSON.stringify(runningTotals)}`);
        
        // 7. Create ledger row
        const ledgerRow: LedgerRow = {
          hole,
          base: updatedMatch.base,
          carryAfter: newCarry,
          doubles: updatedMatch.doubles,
          payout,
          runningTotals
        };
        console.log(`[DEBUG] Ledger row created: ${JSON.stringify(ledgerRow)}`);
        
        // 8. Evaluate junk events
        const newJunkEvents: JunkEvent[] = [];
        
        players.forEach((_, idx) => {
          // Get the correct par value for this player
          const par = updatedMatch.holePar[hole - 1];
          console.log(`[DEBUG] Using par=${par} for player ${players[idx].name} on hole ${hole}`);
          
          const events = evaluateJunkEvents(
            hole,
            players[idx].id,
            playerTeams[idx],
            grossScores[idx],
            par,
            junkFlags[idx],
            updatedMatch.base
          );
          console.log(`[DEBUG] Junk events for player ${players[idx].name}: ${JSON.stringify(events)}`);
          newJunkEvents.push(...events);
        });
        
        console.log(`[DEBUG] Total junk events: ${newJunkEvents.length}, total value: ${newJunkEvents.reduce((sum, event) => sum + event.value, 0)}`);
        
        // Calculate final totals including junk, but now by team
        const finalTotals = [...runningTotals];
        const junkTotalsByTeam = { Red: 0, Blue: 0 };
        
        // Sum junk by team
        newJunkEvents.forEach(event => {
          junkTotalsByTeam[event.teamId] += event.value;
        });
        
        // Calculate the net junk difference for proper zero-sum accounting
        const redJunk = junkTotalsByTeam.Red;
        const blueJunk = junkTotalsByTeam.Blue;
        
        console.log(`[DEBUG] Initial junk by team: Red=${redJunk}, Blue=${blueJunk}`);
        
        // Add team junk totals to all team members
        // When one team earns junk, the other team should lose that amount to keep the game balanced
        players.forEach((_, idx) => {
          const team = playerTeams[idx];
          if (team === 'Red') {
            // Red team gets their junk earnings and loses Blue's junk earnings
            finalTotals[idx] += redJunk - blueJunk;
          } else {
            // Blue team gets their junk earnings and loses Red's junk earnings
            finalTotals[idx] += blueJunk - redJunk;
          }
        });
        
        console.log(`[DEBUG] Final totals after junk (zero-sum adjusted): ${JSON.stringify(finalTotals)}`);
        console.log(`[DEBUG] Balanced junk: Red=${redJunk-blueJunk}, Blue=${blueJunk-redJunk}`);
        
        // Create a modified ledger row with junk included
        const finalLedgerRow = {
          ...ledgerRow,
          runningTotals: finalTotals as [number, number, number, number]
        };
        
        // 9. Create Big Game row if enabled
        let bigGameRow: BigGameRow | undefined;
        let bigGameTotal = updatedMatch.bigGameTotal;
        
        if (updatedMatch.bigGame) {
          bigGameRow = calculateBigGameRow(hole, netScores);
          if (bigGameRow) {
            bigGameTotal = calculateBigGameTotal([...bigGameRows, bigGameRow]);
          }
        }
        
        // 10. Update match state
        const updatedMatchState = {
          ...updatedMatch,
          currentHole: hole < 18 ? hole + 1 : 18,
          carry: newCarry,
          base: hole < 18 ? (hole === 1 ? 2 : calculateBase(hole + 1, updatedMatch.doubles)) : updatedMatch.base,
          bigGameTotal: updatedMatch.bigGame ? bigGameTotal : 0,
          doubleUsedThisHole: false // Reset for the next hole
        };
        
        // 11. Update store
        set({
          match: updatedMatchState,
          holeScores: [...holeScores, holeScore],
          ledger: [...ledger, finalLedgerRow],
          junkEvents: [...junkEvents, ...newJunkEvents],
          bigGameRows: updatedMatch.bigGame && bigGameRow ? [...bigGameRows, bigGameRow] : bigGameRows,
          isDoubleAvailable: hole < 18 && findTrailingTeam([...ledger, finalLedgerRow], playerTeams) !== undefined,
          trailingTeam: findTrailingTeam([...ledger, finalLedgerRow], playerTeams)
        });
      },

      // Update the callDouble action in the store
      callDouble: () => {
        set(state => {
          const { match, trailingTeam } = state;
          
          if (!trailingTeam) {
            return state;
          }
          
          // Create a DoublingState from the match for use with callMatchDouble
          const doublingState: DoublingState = {
            currentHole: match.currentHole,
            base: match.base,
            carry: match.carry,
            doubles: match.doubles,
            leadingTeam: trailingTeam === 'Red' ? 'Blue' : 'Red',
            doubleUsedThisHole: false
          };
          
          // Call the double
          const updatedState = callMatchDouble(doublingState, trailingTeam);
          
          // Check if double was successfully called (base would change if it was)
          const doubleWasUsed = updatedState.base !== doublingState.base;
          
          // Update the match with the new state values
          return {
            ...state,
            match: {
              ...match,
              base: updatedState.base,
              carry: updatedState.carry,
              doubles: updatedState.doubles,
              // Store the doubleUsedThisHole flag in the match state
              doubleUsedThisHole: doubleWasUsed
            },
            // Only disable double button if double was actually used
            isDoubleAvailable: doubleWasUsed ? false : state.isDoubleAvailable
          };
        });
      },

      // Finish the round
      finishRound: async () => {
        const state = get();
        const { match, players, playerTeams, ledger } = state;
        
        // Record end time and update match state
        const endTime = new Date().toISOString();
        const updatedMatch = {
          ...match,
          state: 'finished' as const,  // Explicitly type as 'finished'
          endTime
        };
        
        // Update store with finished state
        set({
          match: updatedMatch
        });
        
        try {
          // Save updated match data to database
          await millbrookDb.saveMatch(updatedMatch);
          
          // Save final game state
          await millbrookDb.saveGameState({
            ...state,
            match: updatedMatch
          });
          
          // Calculate final scores and team totals
          const finalScores = ledger.length > 0 
            ? ledger[ledger.length - 1].runningTotals
            : [0, 0, 0, 0];
          
          // Calculate team totals
          const redTotal = playerTeams.reduce((sum, team, idx) => {
            return team === 'Red' ? sum + finalScores[idx] : sum;
          }, 0);
          
          const blueTotal = playerTeams.reduce((sum, team, idx) => {
            return team === 'Blue' ? sum + finalScores[idx] : sum;
          }, 0);
          
          // Get course name
          let courseName = "Unknown Course";
          if (match.courseId) {
            const course = await millbrookDb.getCourse(match.courseId);
            if (course) {
              courseName = course.name;
            }
          }
          
          // Create game history record
          const gameHistory: GameHistory = {
            id: match.id,
            date: match.date,
            courseName,
            playerInfo: players.map((p, idx) => ({
              id: p.id,
              first: p.first || '',
              last: p.last || '',
              team: playerTeams[idx]
            })),
            teamTotals: [redTotal, blueTotal] as [number, number],
            bigGameTotal: match.bigGameTotal,
            startTime: match.startTime || endTime, // Fallback if no start time
            endTime,
            duration: match.startTime 
              ? calculateDurationInMinutes(match.startTime, endTime)
              : 0,
            holesPlayed: match.currentHole,
            isComplete: true,
            bigGameEnabled: match.bigGame
          };
          
          // Save game history to database
          await millbrookDb.saveGameHistory(gameHistory);
          
          console.log('Game successfully finished and history saved');
        } catch (err) {
          console.error('Error finishing game:', err);
        }
      },
      
      // Cancel match (without saving history)
      cancelMatch: async () => {
        const state = get();
        const { match, players, playerTeams } = state;
        
        // Record end time
        const endTime = new Date().toISOString();
        
        // Mark match as finished but save minimal history
        const updatedMatch = {
          ...match,
          state: 'finished' as const,  // Explicitly type as 'finished'
          endTime
        };
        
        // Update store
        set({
          match: updatedMatch
        });
        
        try {
          // Save updated match data to database
          await millbrookDb.saveMatch(updatedMatch);
          
          // Create game history record for cancelled game
          const gameHistory: GameHistory = {
            id: match.id,
            date: match.date,
            courseName: "Unknown Course", // We could look this up like in finishRound
            playerInfo: players.map((p, idx) => ({
              id: p.id,
              first: p.first || '',
              last: p.last || '',
              team: playerTeams[idx]
            })),
            teamTotals: [0, 0],
            bigGameTotal: 0,
            startTime: match.startTime || endTime, // Fallback if no start time
            endTime,
            duration: match.startTime 
              ? calculateDurationInMinutes(match.startTime, endTime)
              : 0,
            holesPlayed: match.currentHole,
            isComplete: false, // Mark as incomplete
            bigGameEnabled: match.bigGame
          };
          
          // Save cancelled game history
          await millbrookDb.saveGameHistory(gameHistory);
          
          console.log('Game cancelled and minimal history saved');
        } catch (err) {
          console.error('Error cancelling game:', err);
        }
      },
      
      // Reset game state completely
      resetGame: () => {
        set({
          match: {
            id: '',
            date: '',
            bigGame: false,
            playerIds: ['', '', '', ''],
            holePar: Array(18).fill(4), 
            holeSI: Array(18).fill(1),
            state: 'active',
            currentHole: 1,
            carry: 0,
            base: 1,
            doubles: 0,
            bigGameTotal: 0
          },
          players: [],
          playerTeams: ['Red', 'Blue', 'Red', 'Blue'],
          holeScores: [],
          ledger: [],
          junkEvents: [],
          bigGameRows: [],
          isDoubleAvailable: false,
          trailingTeam: undefined
        });
      },

      // Get player by ID
      getPlayerById: (id) => {
        const { players } = get();
        return players.find(p => p.id === id);
      }
    }),
    {
      name: 'millbrook-game-state',
      storage: createJSONStorage(() => localStorage),
    }
  )
); 
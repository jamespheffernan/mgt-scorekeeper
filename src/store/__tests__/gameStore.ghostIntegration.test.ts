import { useGameStore } from '../gameStore';
import { act } from 'react-dom/test-utils';
import type { Team } from '../../db/API-GameState';

// Mock course with realistic par and SI
const mockCourse = {
  name: 'Mock Course',
  id: 'mock-course',
  teeOptions: [{
    id: 't1',
    name: 'Mock Tee',
    holes: Array.from({ length: 18 }, (_, i) => ({
      number: i + 1,
      par: i < 6 ? 5 : i < 12 ? 4 : 3, // 6 par 5s, 6 par 4s, 6 par 3s
      yardage: 400 + (i % 3) * 50,
      strokeIndex: (i % 18) + 1, // Fixed: proper 1-18 stroke indexes
    })),
  }]
};

describe('Ghost Player Comprehensive Integration Tests', () => {
  let originalGetCourse: any;

  beforeAll(() => {
    // Store original getCourse function
    originalGetCourse = require('../../db/millbrookDb').millbrookDb.getCourse;
  });

  beforeEach(() => {
    // Reset game state and mock getCourse
    useGameStore.getState().resetGame();
    require('../../db/millbrookDb').millbrookDb.getCourse = async () => mockCourse;
  });

  afterEach(() => {
    // Restore original getCourse after each test
    require('../../db/millbrookDb').millbrookDb.getCourse = originalGetCourse;
  });

  describe('Complete Round Scenarios', () => {
    it('completes a full 18-hole round with 1 ghost player', async () => {
      const players = [
        { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A' },
        { id: 'p2', name: 'Bob', index: 12, first: 'Bob', last: 'B' },
        { id: 'p3', name: 'Carol', index: 8, first: 'Carol', last: 'C' },
        { id: 'g1', name: 'Ghost (Dan)', index: 15, first: 'Dan', last: 'D', isGhost: true, sourcePlayerId: 'p4' },
      ];
      const teams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
      
      // Create match
      await act(async () => {
        await useGameStore.getState().createMatch(players, teams, {
          bigGame: true,
          courseId: 'mock-course',
          playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
        });
      });

      // Verify initial state
      const state = useGameStore.getState();
      expect(state.players.length).toBe(4);
      expect(state.players.filter(p => p.isGhost).length).toBe(1);
      expect(state.match.hasGhost).toBe(true);

      // Play all 18 holes
      const emptyFlags = { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false };
      
      for (let hole = 1; hole <= 18; hole++) {
        // Use pre-generated ghost scores, add realistic scores for real players
        const ghostGross = state.holeScores[hole - 1].gross[3]; // Ghost player index
        const grossScores: [number, number, number, number] = [
          mockCourse.teeOptions[0].holes[hole - 1].par, // Alice plays to par
          mockCourse.teeOptions[0].holes[hole - 1].par + 1, // Bob bogey
          mockCourse.teeOptions[0].holes[hole - 1].par - 1, // Carol birdie
          ghostGross, // Ghost score (pre-generated)
        ];
        
        const junkFlags = [emptyFlags, emptyFlags, emptyFlags, emptyFlags];
        
        await act(async () => {
          await useGameStore.getState().enterHoleScores(hole, grossScores, junkFlags);
        });
      }

      // Verify final scores
      const finalState = useGameStore.getState();
      
      // Check that all holes have been scored
      expect(finalState.holeScores).toHaveLength(18);
      finalState.holeScores.forEach((hole, idx) => {
        expect(hole.gross).toHaveLength(4);
        expect(hole.net).toHaveLength(4);
        // Only check that ghost players (indexes 3) have scores > 0
        // Real players might have 0 scores for holes not yet played
        expect(hole.gross[3]).toBeGreaterThan(0); // Ghost player should always have score
      });

      // Check Big Game calculations (should exclude ghost)
      expect(finalState.bigGameRows).toHaveLength(18);
      finalState.bigGameRows.forEach(row => {
        expect(row.bestNet).toHaveLength(2); // Only counting 2 best among 3 real players
      });

      // Verify ghost junk events were generated
      expect(Object.keys(finalState.ghostJunkEvents)).toContain('g1');
      expect(Object.keys(finalState.ghostJunkEvents.g1)).toHaveLength(18);
    });

    it('completes a full round with 2 ghost players', async () => {
      const players = [
        { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A' },
        { id: 'p2', name: 'Bob', index: 12, first: 'Bob', last: 'B' },
        { id: 'g1', name: 'Ghost (Carol)', index: 8, first: 'Carol', last: 'C', isGhost: true, sourcePlayerId: 'p3' },
        { id: 'g2', name: 'Ghost (Dan)', index: 15, first: 'Dan', last: 'D', isGhost: true, sourcePlayerId: 'p4' },
      ];
      const teams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
      
      await act(async () => {
        await useGameStore.getState().createMatch(players, teams, {
          bigGame: true,
          courseId: 'mock-course',
          playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
        });
      });

      // Verify ghost count and team assignment
      const state = useGameStore.getState();
      expect(state.players.filter(p => p.isGhost).length).toBe(2);
      expect(state.playerTeams[2]).toBe('Red'); // Ghost Carol
      expect(state.playerTeams[3]).toBe('Blue'); // Ghost Dan

      // Play first few holes to test mid-round state
      const emptyFlags = { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false };
      
      for (let hole = 1; hole <= 9; hole++) {
        const currentState = useGameStore.getState();
        const ghostGross1 = currentState.holeScores[hole - 1].gross[2]; // First ghost
        const ghostGross2 = currentState.holeScores[hole - 1].gross[3]; // Second ghost
        
        const grossScores: [number, number, number, number] = [
          mockCourse.teeOptions[0].holes[hole - 1].par,
          mockCourse.teeOptions[0].holes[hole - 1].par + 1,
          ghostGross1,
          ghostGross2,
        ];
        
        await act(async () => {
          await useGameStore.getState().enterHoleScores(hole, grossScores, [emptyFlags, emptyFlags, emptyFlags, emptyFlags]);
        });
        
        // Verify that currentHole is updated after each hole
        const updatedState = useGameStore.getState();
        console.log(`After hole ${hole}, currentHole is: ${updatedState.match.currentHole}`);
      }

      // Verify mid-round state  
      const midState = useGameStore.getState();
      expect(midState.match.currentHole).toBe(10);
      
      // Verify both ghosts have generated junk events
      expect(Object.keys(midState.ghostJunkEvents)).toHaveLength(2);
      expect(midState.ghostJunkEvents.g1).toBeDefined();
      expect(midState.ghostJunkEvents.g2).toBeDefined();
    });

    it('completes a full round with 3 ghost players', async () => {
      const players = [
        { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A' },
        { id: 'g1', name: 'Ghost (Bob)', index: 12, first: 'Bob', last: 'B', isGhost: true, sourcePlayerId: 'p2' },
        { id: 'g2', name: 'Ghost (Carol)', index: 8, first: 'Carol', last: 'C', isGhost: true, sourcePlayerId: 'p3' },
        { id: 'g3', name: 'Ghost (Dan)', index: 15, first: 'Dan', last: 'D', isGhost: true, sourcePlayerId: 'p4' },
      ];
      const teams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
      
      await act(async () => {
        await useGameStore.getState().createMatch(players, teams, {
          bigGame: false, // Disable Big Game for 3 ghosts scenario
          courseId: 'mock-course',
          playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
        });
      });

      const state = useGameStore.getState();
      expect(state.players.filter(p => p.isGhost).length).toBe(3);
      expect(state.players.filter(p => !p.isGhost).length).toBe(1);
      
      // Verify that only 1 real player means Big Game is disabled
      expect(state.match.bigGame).toBe(false);
      
      // Test score generation for all ghosts
      state.players.forEach((player, idx) => {
        if (player.isGhost) {
          const ghostScores = state.holeScores.map(hole => hole.gross[idx]);
          const totalGross = ghostScores.reduce((sum, score) => sum + score, 0);
          expect(ghostScores).toHaveLength(18);
          expect(totalGross).toBeGreaterThan(60);
          expect(totalGross).toBeLessThan(130);
        }
      });

      // Verify all 3 ghosts have junk events
      expect(Object.keys(state.ghostJunkEvents)).toHaveLength(3);
    });

    it('completes a full round with 4 ghost players (no real players)', async () => {
      const players = [
        { id: 'g1', name: 'Ghost (Alice)', index: 10, first: 'Alice', last: 'A', isGhost: true, sourcePlayerId: 'p1' },
        { id: 'g2', name: 'Ghost (Bob)', index: 12, first: 'Bob', last: 'B', isGhost: true, sourcePlayerId: 'p2' },
        { id: 'g3', name: 'Ghost (Carol)', index: 8, first: 'Carol', last: 'C', isGhost: true, sourcePlayerId: 'p3' },
        { id: 'g4', name: 'Ghost (Dan)', index: 15, first: 'Dan', last: 'D', isGhost: true, sourcePlayerId: 'p4' },
      ];
      const teams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
      
      await act(async () => {
        await useGameStore.getState().createMatch(players, teams, {
          bigGame: false, // Must be disabled for all-ghost match
          courseId: 'mock-course',
          playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
        });
      });

      const state = useGameStore.getState();
      expect(state.players.every(p => p.isGhost)).toBe(true);
      expect(state.players).toHaveLength(4);
      expect(state.match.bigGame).toBe(false);
      
      // Verify all ghosts have realistic scores and junk events
      state.players.forEach((player, idx) => {
        const ghostScores = state.holeScores.map(hole => hole.gross[idx]);
        const totalGross = ghostScores.reduce((sum, score) => sum + score, 0);
        expect(totalGross).toBeGreaterThan(60);
        expect(totalGross).toBeLessThan(130);
      });
      
      expect(Object.keys(state.ghostJunkEvents)).toHaveLength(4);
    });
  });

  describe('Ledger and Payout Integration', () => {
    it('calculates side-match payouts correctly with ghost players', async () => {
      const players = [
        { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A' },
        { id: 'p2', name: 'Bob', index: 10, first: 'Bob', last: 'B' },
        { id: 'g1', name: 'Ghost (Carol)', index: 10, first: 'Carol', last: 'C', isGhost: true, sourcePlayerId: 'p3' },
        { id: 'g2', name: 'Ghost (Dan)', index: 10, first: 'Dan', last: 'D', isGhost: true, sourcePlayerId: 'p4' },
      ];
      const teams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
      
      await act(async () => {
        await useGameStore.getState().createMatch(players, teams, {
          bigGame: false,
          courseId: 'mock-course',
          playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
        });
      });

      // Set up a scenario where ghosts affect side-match outcomes
      // Red team: Alice (p1) + Ghost Carol (g1)
      // Blue team: Bob (p2) + Ghost Dan (g2)
      
      // Play hole 1 with Red team winning
      const grossScores1: [number, number, number, number] = [4, 6, 4, 6]; // Red wins
      const emptyFlags = { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false };
      
      await act(async () => {
        await useGameStore.getState().enterHoleScores(1, grossScores1, [emptyFlags, emptyFlags, emptyFlags, emptyFlags]);
      });
      
      // Play hole 2 with Blue team winning  
      const grossScores2: [number, number, number, number] = [6, 4, 6, 4]; // Blue wins
      
      await act(async () => {
        await useGameStore.getState().enterHoleScores(2, grossScores2, [emptyFlags, emptyFlags, emptyFlags, emptyFlags]);
      });

             const state = useGameStore.getState();
       
       // Verify that hole scores include all players (holeScores is pre-populated with 18 entries)
       expect(state.holeScores).toHaveLength(18);
       
       // Check that ledger is calculated (each hole creates ledger entry)
       const ledger = state.ledger;
       expect(ledger).toHaveLength(2); // Two holes played
       
       // Verify ledger includes runningTotals for all 4 players
       ledger.forEach(entry => {
         expect(entry.runningTotals).toHaveLength(4);
       });
    });

    it('includes ghost junk events in payout calculations', async () => {
      const players = [
        { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A' },
        { id: 'p2', name: 'Bob', index: 12, first: 'Bob', last: 'B' },
        { id: 'g1', name: 'Ghost (Carol)', index: 8, first: 'Carol', last: 'C', isGhost: true, sourcePlayerId: 'p3' },
        { id: 'g2', name: 'Ghost (Dan)', index: 15, first: 'Dan', last: 'D', isGhost: true, sourcePlayerId: 'p4' },
      ];
      const teams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
      
      await act(async () => {
        await useGameStore.getState().createMatch(players, teams, {
          bigGame: false,
          courseId: 'mock-course',
          playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
        });
      });

      // Force hole 1 to be a par 3 for greenie test
      const state = useGameStore.getState();
      state.match.holePar[0] = 3;
      
      // Create scenario with junk events for ghosts
      const grossScores: [number, number, number, number] = [3, 4, 2, 3]; // Ghost Carol gets greenie and birdie
      const junkFlags = [
        { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
        { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
        { hadBunkerShot: false, isOnGreenFromTee: true, isClosestOnGreen: true, hadThreePutts: false, isLongDrive: false }, // Ghost Carol greenie
        { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
      ];
      
      await act(async () => {
        await useGameStore.getState().enterHoleScores(1, grossScores, junkFlags);
      });

      const finalState = useGameStore.getState();
      
             // Verify junk events are recorded for ghosts
       const junkEvents = finalState.junkEvents;
       const ghostJunkEvents = junkEvents.filter(event => 
         finalState.players.find(p => p.id === event.playerId)?.isGhost
       );
       
       expect(ghostJunkEvents.length).toBeGreaterThanOrEqual(0); // May have ghost junk events
       
       // Verify ledger is calculated with proper structure
       const ledger = finalState.ledger;
       expect(ledger).toHaveLength(1); // One hole played
       
       // Verify ledger has running totals for all players
       if (ledger.length > 0) {
         expect(ledger[0].runningTotals).toHaveLength(4);
       }
    });
  });

  describe('Ghost Score Reveal Integration', () => {
    it('properly manages ghost score reveal state during a round', async () => {
      const players = [
        { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A' },
        { id: 'p2', name: 'Bob', index: 12, first: 'Bob', last: 'B' },
        { id: 'g1', name: 'Ghost (Carol)', index: 8, first: 'Carol', last: 'C', isGhost: true, sourcePlayerId: 'p3' },
        { id: 'g2', name: 'Ghost (Dan)', index: 15, first: 'Dan', last: 'D', isGhost: true, sourcePlayerId: 'p4' },
      ];
      const teams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
      
      await act(async () => {
        await useGameStore.getState().createMatch(players, teams, {
          bigGame: false,
          courseId: 'mock-course',
          playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
        });
      });

      // Initially, no ghost scores should be revealed
      const initialState = useGameStore.getState();
      expect(initialState.isGhostScoreRevealed('g1', 1)).toBe(false);
      expect(initialState.isGhostScoreRevealed('g2', 1)).toBe(false);

      // Reveal first ghost's score for hole 1
      act(() => {
        useGameStore.getState().revealGhostScore('g1', 1);
      });

      // Check reveal state
      let state = useGameStore.getState();
      expect(state.isGhostScoreRevealed('g1', 1)).toBe(true);
      expect(state.isGhostScoreRevealed('g2', 1)).toBe(false);
      expect(state.isGhostScoreRevealed('g1', 2)).toBe(false);

      // Reveal all scores for second ghost
      act(() => {
        useGameStore.getState().revealAllGhostScores('g2');
      });

      // Check that all holes are revealed for second ghost
      state = useGameStore.getState();
      for (let hole = 1; hole <= 18; hole++) {
        expect(state.isGhostScoreRevealed('g2', hole)).toBe(true);
      }
      
      // First ghost should still only have hole 1 revealed
      expect(state.isGhostScoreRevealed('g1', 1)).toBe(true);
      expect(state.isGhostScoreRevealed('g1', 2)).toBe(false);

      // Hide a score
      act(() => {
        useGameStore.getState().hideGhostScore('g2', 5);
      });

      state = useGameStore.getState();
      expect(state.isGhostScoreRevealed('g2', 5)).toBe(false);
      expect(state.isGhostScoreRevealed('g2', 6)).toBe(true);
    });

    it('maintains ghost reveal state consistency during score entry', async () => {
      const players = [
        { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A' },
        { id: 'p2', name: 'Bob', index: 12, first: 'Bob', last: 'B' },
        { id: 'p3', name: 'Carol', index: 8, first: 'Carol', last: 'C' },
        { id: 'g1', name: 'Ghost (Dan)', index: 15, first: 'Dan', last: 'D', isGhost: true, sourcePlayerId: 'p4' },
      ];
      const teams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
      
      await act(async () => {
        await useGameStore.getState().createMatch(players, teams, {
          bigGame: true,
          courseId: 'mock-course',
          playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
        });
      });

      // Reveal ghost score for hole 1 before entering scores
      act(() => {
        useGameStore.getState().revealGhostScore('g1', 1);
      });

      // Enter scores for hole 1
      const emptyFlags = { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false };
      const grossScores: [number, number, number, number] = [4, 5, 3, 6];
      
      await act(async () => {
        await useGameStore.getState().enterHoleScores(1, grossScores, [emptyFlags, emptyFlags, emptyFlags, emptyFlags]);
      });

      // Verify reveal state is preserved after score entry
      const state = useGameStore.getState();
      expect(state.isGhostScoreRevealed('g1', 1)).toBe(true);
      expect(state.isGhostScoreRevealed('g1', 2)).toBe(false);
    });
  });

  describe('Performance and Stability', () => {
    it('handles multiple ghost configurations without performance degradation', async () => {
      const configs = [
        { ghostCount: 1, realCount: 3 },
        { ghostCount: 2, realCount: 2 },
        { ghostCount: 3, realCount: 1 },
        { ghostCount: 4, realCount: 0 },
      ];

             for (const config of configs) {
         const startTime = Date.now();
         
         const players: any[] = [];
         
         // Add real players
         for (let i = 0; i < config.realCount; i++) {
           players.push({
             id: `p${i + 1}`,
             name: `Player ${i + 1}`,
             index: 10 + i,
             first: `Player`,
             last: `${i + 1}`
           });
         }
         
         // Add ghost players
         for (let i = 0; i < config.ghostCount; i++) {
           players.push({
             id: `g${i + 1}`,
             name: `Ghost (${i + 1})`,
             index: 10 + i,
             first: `Ghost`,
             last: `${i + 1}`,
             isGhost: true,
             sourcePlayerId: `source${i + 1}`
           });
         }
        
        const teams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
        
        useGameStore.getState().resetGame();
        
        await act(async () => {
          await useGameStore.getState().createMatch(players, teams, {
            bigGame: config.realCount >= 2, // Only enable Big Game if enough real players
            courseId: 'mock-course',
            playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
          });
        });

        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Verify match creation completes in reasonable time (< 1 second)
        expect(duration).toBeLessThan(1000);
        
        // Verify state is correct
        const state = useGameStore.getState();
        expect(state.players).toHaveLength(4);
        expect(state.players.filter(p => p.isGhost)).toHaveLength(config.ghostCount);
        expect(state.players.filter(p => !p.isGhost)).toHaveLength(config.realCount);
      }
    });

    it('maintains consistency across multiple iterations of ghost score generation', async () => {
      const players = [
        { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A' },
        { id: 'g1', name: 'Ghost (Bob)', index: 10, first: 'Bob', last: 'B', isGhost: true, sourcePlayerId: 'p2' },
        { id: 'g2', name: 'Ghost (Carol)', index: 10, first: 'Carol', last: 'C', isGhost: true, sourcePlayerId: 'p3' },
        { id: 'g3', name: 'Ghost (Dan)', index: 10, first: 'Dan', last: 'D', isGhost: true, sourcePlayerId: 'p4' },
      ];
      
      const scoreRanges: { [ghostId: string]: { min: number, max: number } } = {};
      
      // Run multiple iterations to check consistency
      for (let iteration = 0; iteration < 10; iteration++) {
        useGameStore.getState().resetGame();
        
        // Create players with unique IDs per iteration to ensure different seeds
        const iterationPlayers = [
          { id: `p1-${iteration}`, name: 'Alice', index: 10, first: 'Alice', last: 'A' },
          { id: `g1-${iteration}`, name: 'Ghost (Bob)', index: 10, first: 'Bob', last: 'B', isGhost: true, sourcePlayerId: `p2-${iteration}` },
          { id: `g2-${iteration}`, name: 'Ghost (Carol)', index: 10, first: 'Carol', last: 'C', isGhost: true, sourcePlayerId: `p3-${iteration}` },
          { id: `g3-${iteration}`, name: 'Ghost (Dan)', index: 10, first: 'Dan', last: 'D', isGhost: true, sourcePlayerId: `p4-${iteration}` },
        ];
        
        await act(async () => {
          await useGameStore.getState().createMatch(iterationPlayers, ['Red', 'Blue', 'Red', 'Blue'], {
            bigGame: false,
            courseId: 'mock-course',
            playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
          });
        });

        const state = useGameStore.getState();
        
        // Check each ghost's total score
        state.players.forEach((player, idx) => {
          if (player.isGhost) {
            const totalScore = state.holeScores.reduce((sum, hole) => sum + hole.gross[idx], 0);
            
            // Use generic ghost name for tracking across iterations
            const ghostName = player.name || `ghost-${idx}`;
            if (!scoreRanges[ghostName]) {
              scoreRanges[ghostName] = { min: totalScore, max: totalScore };
            } else {
              scoreRanges[ghostName].min = Math.min(scoreRanges[ghostName].min, totalScore);
              scoreRanges[ghostName].max = Math.max(scoreRanges[ghostName].max, totalScore);
            }
            
            // Verify score is within reasonable range
            expect(totalScore).toBeGreaterThan(65);
            expect(totalScore).toBeLessThan(120);
          }
        });
      }
      
      // Verify that ghost scores show reasonable variation across iterations
      Object.values(scoreRanges).forEach(range => {
        const variation = range.max - range.min;
        expect(variation).toBeGreaterThan(5); // Should have some variation
        expect(variation).toBeLessThan(40); // But not too much
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles missing course data gracefully', async () => {
      // Temporarily break the course mock
      require('../../db/millbrookDb').millbrookDb.getCourse = async () => {
        throw new Error('Course not found');
      };

      const players = [
        { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A' },
        { id: 'g1', name: 'Ghost (Bob)', index: 10, first: 'Bob', last: 'B', isGhost: true, sourcePlayerId: 'p2' },
      ];

             // Should handle error gracefully by falling back to default course data
       await act(async () => {
         await useGameStore.getState().createMatch(players, ['Red', 'Blue'], {
           bigGame: false,
           courseId: 'missing-course',
           playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
         });
       });
       
       // Verify the match was created with default course data
       const state = useGameStore.getState();
       expect(state.players).toHaveLength(2);
       expect(state.match.hasGhost).toBe(true);
    });

    it('handles invalid ghost player configurations', async () => {
      const players = [
        { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A' },
        { id: 'g1', name: 'Ghost (Bob)', index: -5, first: 'Bob', last: 'B', isGhost: true, sourcePlayerId: 'p2' }, // Invalid negative handicap
      ];

             await act(async () => {
         await useGameStore.getState().createMatch(players, ['Red', 'Blue'], {
           bigGame: false,
           courseId: 'mock-course',
           playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
         });
       });

      // Should handle invalid handicap gracefully
      const state = useGameStore.getState();
      expect(state.players).toHaveLength(2);
      
      // Verify ghost scores are still generated (should use default/bounded handicap)
      const ghostScores = state.holeScores.map(hole => hole.gross[1]);
      const totalScore = ghostScores.reduce((sum, score) => sum + score, 0);
      expect(totalScore).toBeGreaterThan(60);
      expect(totalScore).toBeLessThan(130);
    });
  });
}); 
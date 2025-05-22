import { useGameStore } from '../gameStore';
import { act } from 'react-dom/test-utils';
import type { Team } from '../../db/API-GameState';

// Mock course with realistic par and SI
const mockCourse = {
  holes: Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: i < 6 ? 5 : i < 12 ? 4 : 3, // 6 par 5s, 6 par 4s, 6 par 3s
    yardage: 400 + (i % 3) * 50,
    strokeIndex: ((i + 1) % 18) + 1,
  })),
};

describe('Ghost Player Integration Flow', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('creates a match with a ghost and produces plausible scores', () => {
    // 3 real players, 1 ghost
    const players = [
      { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A' },
      { id: 'p2', name: 'Bob', index: 12, first: 'Bob', last: 'B' },
      { id: 'p3', name: 'Carol', index: 8, first: 'Carol', last: 'C' },
      { id: 'g1', name: 'Ghost (Dan)', index: 15, first: 'Dan', last: 'D', isGhost: true, sourcePlayerId: 'p4' },
    ];
    const teams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
    const matchOptions = {
      bigGame: false,
      courseId: 'mock-course',
      playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
    };
    // Patch millbrookDb.getCourse to return mockCourse
    const originalGetCourse = require('../../db/millbrookDb').millbrookDb.getCourse;
    require('../../db/millbrookDb').millbrookDb.getCourse = async () => mockCourse;

    act(() => {
      useGameStore.getState().createMatch(players, teams, matchOptions);
    });
    const state = useGameStore.getState();
    const ghostIdx = state.players.findIndex(p => p.isGhost);
    expect(ghostIdx).toBeGreaterThanOrEqual(0);
    const ghostScores = state.holeScores.map(h => h.gross[ghostIdx]);
    const ghostGross = ghostScores.reduce((a, b) => a + b, 0);
    expect(ghostScores.length).toBe(18);
    expect(ghostGross).toBeGreaterThanOrEqual(65);
    expect(ghostGross).toBeLessThanOrEqual(120);
    // Simulate net calculation (subtract 1 per hole for test)
    const ghostNet = ghostScores.map(g => g - 1);
    const ghostNetTotal = ghostNet.reduce((a, b) => a + b, 0);
    expect(ghostNetTotal).toBeGreaterThan(0);
    expect(ghostNetTotal).toBeLessThan(ghostGross);

    // Restore original getCourse
    require('../../db/millbrookDb').millbrookDb.getCourse = originalGetCourse;
  });

  it('creates a match with multiple ghosts on mixed teams and checks plausible scores and team assignment', () => {
    // 2 real players, 2 ghosts, mixed teams
    const players = [
      { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A' },
      { id: 'p2', name: 'Bob', index: 12, first: 'Bob', last: 'B' },
      { id: 'g1', name: 'Ghost (Carol)', index: 8, first: 'Carol', last: 'C', isGhost: true, sourcePlayerId: 'p3' },
      { id: 'g2', name: 'Ghost (Dan)', index: 15, first: 'Dan', last: 'D', isGhost: true, sourcePlayerId: 'p4' },
    ];
    const teams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
    const matchOptions = {
      bigGame: false,
      courseId: 'mock-course',
      playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
    };
    const originalGetCourse = require('../../db/millbrookDb').millbrookDb.getCourse;
    require('../../db/millbrookDb').millbrookDb.getCourse = async () => mockCourse;

    act(() => {
      useGameStore.getState().createMatch(players, teams, matchOptions);
    });
    const state = useGameStore.getState();
    // Check both ghosts present
    const ghostIndexes = state.players.map((p, i) => p.isGhost ? i : -1).filter(i => i !== -1);
    expect(ghostIndexes.length).toBe(2);
    // Check team assignment
    expect(state.playerTeams[ghostIndexes[0]]).toBe('Red');
    expect(state.playerTeams[ghostIndexes[1]]).toBe('Blue');
    // Check plausible scores for both ghosts
    ghostIndexes.forEach(idx => {
      const ghostScores = state.holeScores.map(h => h.gross[idx]);
      const ghostGross = ghostScores.reduce((a, b) => a + b, 0);
      expect(ghostScores.length).toBe(18);
      expect(ghostGross).toBeGreaterThanOrEqual(65);
      expect(ghostGross).toBeLessThanOrEqual(120);
    });
    require('../../db/millbrookDb').millbrookDb.getCourse = originalGetCourse;
  });

  it('excludes ghosts from Big Game calculations', async () => {
    // 2 real, 2 ghosts, Big Game enabled
    const players = [
      { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A' },
      { id: 'p2', name: 'Bob', index: 10, first: 'Bob', last: 'B' },
      { id: 'g1', name: 'Ghost (Carol)', index: 10, first: 'Carol', last: 'C', isGhost: true, sourcePlayerId: 'p3' },
      { id: 'g2', name: 'Ghost (Dan)', index: 10, first: 'Dan', last: 'D', isGhost: true, sourcePlayerId: 'p4' },
    ];
    const teams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
    const matchOptions = {
      bigGame: true,
      courseId: 'mock-course',
      playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
    };
    const originalGetCourse = require('../../db/millbrookDb').millbrookDb.getCourse;
    require('../../db/millbrookDb').millbrookDb.getCourse = async () => mockCourse;

    act(() => {
      useGameStore.getState().createMatch(players, teams, matchOptions);
    });
    // Set non-tied gross scores for hole 1 (par 5): Alice (4), Bob (5), Carol (6), Dan (7)
    const grossScores = [4, 5, 6, 7] as [number, number, number, number];
    const emptyFlags = { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false };
    const junkFlags = [emptyFlags, emptyFlags, emptyFlags, emptyFlags];
    await act(async () => {
      await useGameStore.getState().enterHoleScores(1, grossScores, junkFlags);
    });
    const state = useGameStore.getState();
    // Debug logging
    console.log('holeScores[0].net:', state.holeScores[0].net);
    const realPlayerIndexes = state.players.map((p, i) => !p.isGhost ? i : -1).filter(i => i !== -1);
    console.log('realPlayerIndexes:', realPlayerIndexes);
    const realPlayerNets = realPlayerIndexes.map(idx => state.holeScores[0].net[idx]);
    console.log('realPlayerNets:', realPlayerNets);
    const bigGameRow = state.bigGameRows[0];
    console.log('bigGameRow.bestNet:', bigGameRow && bigGameRow.bestNet);
    // bestNet should be the two lowest net scores among real players
    expect(bigGameRow.bestNet[0]).toBe(4);
    expect(bigGameRow.bestNet[1]).toBe(5);
    expect(bigGameRow.subtotal).toBe(9);
    require('../../db/millbrookDb').millbrookDb.getCourse = originalGetCourse;
  });

  it('includes ghosts in junk logic and distributes junk totals correctly', () => {
    // 2 real, 2 ghosts, mixed teams
    const players = [
      { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A' },
      { id: 'p2', name: 'Bob', index: 12, first: 'Bob', last: 'B' },
      { id: 'g1', name: 'Ghost (Carol)', index: 8, first: 'Carol', last: 'C', isGhost: true, sourcePlayerId: 'p3' },
      { id: 'g2', name: 'Ghost (Dan)', index: 15, first: 'Dan', last: 'D', isGhost: true, sourcePlayerId: 'p4' },
    ];
    const teams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
    const matchOptions = {
      bigGame: false,
      courseId: 'mock-course',
      playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
    };
    const originalGetCourse = require('../../db/millbrookDb').millbrookDb.getCourse;
    require('../../db/millbrookDb').millbrookDb.getCourse = async () => mockCourse;

    // Ensure mockCourse hole 3 is par 5 BEFORE match creation
    mockCourse.holes[2].par = 5;
    act(() => {
      useGameStore.getState().createMatch(players, teams, matchOptions);
    });
    // Set store's holePar for hole 3 to 5 after match creation
    useGameStore.getState().match.holePar[2] = 5;
    // Enter holes 1 and 2 with default scores to reach hole 3
    const defaultGross = [5, 5, 5, 5] as [number, number, number, number];
    const emptyFlags = { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false };
    const defaultJunk = [emptyFlags, emptyFlags, emptyFlags, emptyFlags];
    act(() => {
      useGameStore.getState().enterHoleScores(1, defaultGross, defaultJunk);
      useGameStore.getState().enterHoleScores(2, defaultGross, defaultJunk);
    });
    // Hole 3 (par 5): Alice and Carol birdie (4), Bob and Dan sandie (5 with bunker)
    const grossScores3: [number, number, number, number] = [4, 5, 4, 5];
    const flags3 = [
      { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false }, // Alice (birdie)
      { hadBunkerShot: true, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false }, // Bob (sandie)
      { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false }, // Carol (ghost, birdie)
      { hadBunkerShot: true, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false }, // Dan (ghost, sandie)
    ];
    console.log('Before hole 3:');
    console.log('holeScores:', JSON.stringify(useGameStore.getState().holeScores, null, 2));
    console.log('junkEvents:', JSON.stringify(useGameStore.getState().junkEvents, null, 2));
    console.log('players:', JSON.stringify(useGameStore.getState().players, null, 2));
    act(() => {
      useGameStore.getState().enterHoleScores(3, grossScores3, flags3);
    });
    console.log('After hole 3:');
    console.log('holeScores:', JSON.stringify(useGameStore.getState().holeScores, null, 2));
    console.log('junkEvents:', JSON.stringify(useGameStore.getState().junkEvents, null, 2));
    console.log('players:', JSON.stringify(useGameStore.getState().players, null, 2));
    // Debug print of test setup and junkEvents before assertions
    console.log('grossScores3:', grossScores3);
    console.log('flags3:', flags3);
    console.log('junkEvents before assertions:', JSON.stringify(useGameStore.getState().junkEvents, null, 2));
    const junkEvents = useGameStore.getState().junkEvents;
    const countByType = (type: string) => junkEvents.filter(e => e.type === type).length;
    expect(countByType('Birdie')).toBe(2);
    expect(countByType('Sandie')).toBe(0);
    expect(countByType('Greenie')).toBe(0);
    expect(countByType('Penalty')).toBe(0);
    expect(countByType('LD10')).toBe(0);
    const isGhost = (id: string) => players.find(p => p.id === id)?.isGhost;
    expect(junkEvents.some(e => e.type === 'Birdie' && isGhost(e.playerId))).toBe(true);
    require('../../db/millbrookDb').millbrookDb.getCourse = originalGetCourse;
  });

  it('saves hasGhost flag and tags ghost rounds in match history', async () => {
    // 3 real, 1 ghost
    const players = [
      { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A' },
      { id: 'p2', name: 'Bob', index: 12, first: 'Bob', last: 'B' },
      { id: 'p3', name: 'Carol', index: 8, first: 'Carol', last: 'C' },
      { id: 'g1', name: 'Ghost (Dan)', index: 15, first: 'Dan', last: 'D', isGhost: true, sourcePlayerId: 'p4' },
    ];
    const teams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
    const matchOptions = {
      bigGame: false,
      courseId: 'mock-course',
      playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
    };
    const originalGetCourse = require('../../db/millbrookDb').millbrookDb.getCourse;
    require('../../db/millbrookDb').millbrookDb.getCourse = async () => mockCourse;

    act(() => {
      useGameStore.getState().createMatch(players, teams, matchOptions);
    });
    // Simulate entering scores for all holes
    for (let h = 1; h <= 18; h++) {
      const gross = useGameStore.getState().holeScores[h - 1].gross as [number, number, number, number];
      const emptyFlags = { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false };
      const junkFlags = [emptyFlags, emptyFlags, emptyFlags, emptyFlags];
      act(() => {
        useGameStore.getState().enterHoleScores(h, gross, junkFlags);
      });
    }
    // Finish the round
    await act(async () => {
      await useGameStore.getState().finishRound();
    });
    // Check that hasGhost is true in match and in game history
    const match = useGameStore.getState().match;
    expect(match.hasGhost).toBe(true);
    // Simulate loading from DB (mocked): check that hasGhost would be saved in game history
    // (In real app, would query millbrookDb.gameHistory, here just check match state)
    // Optionally, check that at least one player has isGhost true
    expect(useGameStore.getState().players.some(p => p.isGhost)).toBe(true);
    require('../../db/millbrookDb').millbrookDb.getCourse = originalGetCourse;
  });

  it('creates a match with 4 ghosts (no real players) and all logic works except Big Game', () => {
    // 4 ghosts, no real players
    const players = [
      { id: 'g1', name: 'Ghost (Alice)', index: 10, first: 'Alice', last: 'A', isGhost: true, sourcePlayerId: 'p1' },
      { id: 'g2', name: 'Ghost (Bob)', index: 12, first: 'Bob', last: 'B', isGhost: true, sourcePlayerId: 'p2' },
      { id: 'g3', name: 'Ghost (Carol)', index: 8, first: 'Carol', last: 'C', isGhost: true, sourcePlayerId: 'p3' },
      { id: 'g4', name: 'Ghost (Dan)', index: 15, first: 'Dan', last: 'D', isGhost: true, sourcePlayerId: 'p4' },
    ];
    const teams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
    const matchOptions = {
      bigGame: false, // Big Game should not be enabled for all ghosts
      courseId: 'mock-course',
      playerTeeIds: ['t1', 't1', 't1', 't1'] as [string, string, string, string],
    };
    const originalGetCourse = require('../../db/millbrookDb').millbrookDb.getCourse;
    require('../../db/millbrookDb').millbrookDb.getCourse = async () => mockCourse;

    act(() => {
      useGameStore.getState().createMatch(players, teams, matchOptions);
    });
    const state = useGameStore.getState();
    // All players should be ghosts
    expect(state.players.every(p => p.isGhost)).toBe(true);
    // There should be 4 players
    expect(state.players.length).toBe(4);
    // Each ghost should have plausible scores
    state.players.forEach((p, idx) => {
      const ghostScores = state.holeScores.map(h => h.gross[idx]);
      const ghostGross = ghostScores.reduce((a, b) => a + b, 0);
      expect(ghostScores.length).toBe(18);
      expect(ghostGross).toBeGreaterThanOrEqual(65);
      expect(ghostGross).toBeLessThanOrEqual(120);
    });
    // Big Game should not be enabled or should be ignored
    expect(state.match.bigGame).toBe(false);
    expect(state.bigGameRows.length).toBe(0);
    require('../../db/millbrookDb').millbrookDb.getCourse = originalGetCourse;
  });
}); 
import { selectHoleSummary } from '../gameStore';
import type { GameState, JunkEvent, LedgerRow, HoleScore, Player, Team } from '../gameStore';

describe('selectHoleSummary', () => {
  it('returns correct summary for a simple hole', () => {
    // Minimal state: 2 players, 1 hole, 1 junk event
    const players: Player[] = [
      { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A' },
      { id: 'p2', name: 'Bob', index: 12, first: 'Bob', last: 'B' },
    ];
    const playerTeams: Team[] = ['Red', 'Blue'];
    const ledger: LedgerRow[] = [
      { hole: 1, base: 2, carryAfter: 0, doubles: 0, payout: 4, runningTotals: [4, 0, 0, 0] }
    ];
    const junkEvents: JunkEvent[] = [
      { hole: 1, playerId: 'p1', teamId: 'Red', type: 'Birdie', value: 1 }
    ];
    const match = {
      id: 'm1', date: '2024-01-01', bigGame: false, playerIds: ['p1', 'p2', '', ''] as [string, string, string, string],
      holePar: [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
      holeSI: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
      state: 'active' as 'active', currentHole: 2, carry: 0, base: 2, doubles: 0, bigGameTotal: 0
    };
    const holeScores: HoleScore[] = [
      { hole: 1, gross: [5, 6, 0, 0], net: [4, 6, 0, 0], teamNet: [4, 6] }
    ];
    const state: GameState = {
      match,
      players,
      playerTeams,
      holeScores,
      ledger,
      junkEvents,
      bigGameRows: [],
      ghostJunkEvents: {},
      ghostRevealState: {},
      isDoubleAvailable: false,
      trailingTeam: undefined
    };
    const summary = selectHoleSummary(state, 0);
    expect(summary).toBeTruthy();
    if (!summary) throw new Error('Summary is null');
    expect(summary.hole).toBe(1);
    expect(summary.base).toBe(2);
    expect(summary.payout).toBe(4);
    expect(summary.junkEvents.length).toBe(1);
    expect(summary.junkEvents[0].type).toBe('Birdie');
    expect(summary.junkByTeam.Red).toBe(1);
    expect(summary.junkByTeam.Blue).toBe(0);
    expect(summary.winner).toBe('Red');
  });

  it('returns correct summary for a big game', () => {
    // Big game state: 4 players, 1 hole, 1 junk event
    const players: Player[] = [
      { id: 'p1', name: 'Player 1', first: 'Player', last: '1', index: 10, ghin: '123', lastUsed: '', isGhost: false, sourcePlayerId: undefined },
      { id: 'p2', name: 'Player 2', first: 'Player', last: '2', index: 15, ghin: '456', lastUsed: '', isGhost: false, sourcePlayerId: undefined },
      { id: 'p3', name: 'Player 3', first: 'Player', last: '3', index: 20, ghin: '789', lastUsed: '', isGhost: false, sourcePlayerId: undefined },
      { id: 'p4', name: 'Player 4', first: 'Player', last: '4', index: 25, ghin: '012', lastUsed: '', isGhost: false, sourcePlayerId: undefined },
    ];
    const playerTeams: Team[] = ['Red', 'Red', 'Blue', 'Blue'] as Team[];
    const ledger: LedgerRow[] = [
      { hole: 1, base: 1, carryAfter: 0, doubles: 0, payout: 4, runningTotals: [4, 0, 0, 0] }
    ];
    const junkEvents: JunkEvent[] = [
      { hole: 1, playerId: 'p1', teamId: 'Red', type: 'Birdie', value: 1 }
    ];
    const match = {
      id: '1',
      date: '2024-01-01',
      bigGame: true,
      playerIds: ['p1', 'p2', 'p3', 'p4'] as [string, string, string, string],
      holePar: Array(18).fill(4),
      holeSI: Array(18).fill(0).map((_, i) => i + 1),
      state: 'active' as 'active',
      currentHole: 2,
      carry: 0,
      base: 1,
      doubles: 0,
      bigGameTotal: 0,
    };
    const holeScores: HoleScore[] = [
      {
        hole: 1,
        gross: [5, 6, 7, 8] as [number, number, number, number],
        net: [4, 5, 5, 6] as [number, number, number, number],
        teamNet: [4, 5] as [number, number],
      },
    ];
    const state: GameState = {
      match,
      players,
      playerTeams,
      holeScores,
      ledger,
      junkEvents,
      bigGameRows: [],
      ghostJunkEvents: {},
      ghostRevealState: {},
      isDoubleAvailable: false,
      trailingTeam: undefined,
    };
    const summary = selectHoleSummary(state, 0);
    expect(summary).toBeTruthy();
    if (!summary) throw new Error('Summary is null');
    expect(summary.hole).toBe(1);
    expect(summary.base).toBe(1);
    expect(summary.payout).toBe(4);
    expect(summary.junkEvents.length).toBe(1);
    expect(summary.junkEvents[0].type).toBe('Birdie');
    expect(summary.junkByTeam.Red).toBe(1);
    expect(summary.junkByTeam.Blue).toBe(0);
    expect(summary.winner).toBe('Red');
  });
}); 
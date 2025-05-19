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
}); 
import {
  calculateHolePayout,
  calculatePlayerPayouts,
  updateRunningTotals
} from '../calcEngine/payoutCalculator';

describe('Payout Calculator', () => {
  describe('calculateHolePayout', () => {
    test('handles push correctly', () => {
      const result = calculateHolePayout('Push', 2, 0);
      expect(result.payout).toBe(0);
      expect(result.newCarry).toBe(2);
    });

    test('handles push with existing carry', () => {
      const result = calculateHolePayout('Push', 4, 6);
      expect(result.payout).toBe(0);
      expect(result.newCarry).toBe(10);
    });

    test('handles Red team win correctly', () => {
      const result = calculateHolePayout('Red', 4, 0);
      expect(result.payout).toBe(8); // base + base (no carry)
      expect(result.newCarry).toBe(0);
    });

    test('handles Blue team win correctly', () => {
      const result = calculateHolePayout('Blue', 4, 0);
      expect(result.payout).toBe(8); // base + base (no carry)
      expect(result.newCarry).toBe(0);
    });

    test('handles win with carry correctly', () => {
      const result = calculateHolePayout('Red', 4, 6);
      expect(result.payout).toBe(14); // carry + base + base
      expect(result.newCarry).toBe(0);
    });

    test('TC-04: carry-over push then win', () => {
      // First a push with base 8
      const pushResult = calculateHolePayout('Push', 8, 0);
      expect(pushResult.payout).toBe(0);
      expect(pushResult.newCarry).toBe(8);

      // Then a push with another base 8
      const secondPushResult = calculateHolePayout('Push', 8, pushResult.newCarry);
      expect(secondPushResult.payout).toBe(0);
      expect(secondPushResult.newCarry).toBe(16);

      // Finally a win by Blue with base 6
      const winResult = calculateHolePayout('Blue', 6, secondPushResult.newCarry);
      expect(winResult.payout).toBe(28); // carry 16 + base 6 + win-bonus 6 = 28
      expect(winResult.newCarry).toBe(0); // Carry resets
    });
  });

  describe('calculatePlayerPayouts', () => {
    test('handles push correctly', () => {
      const playerTeams = ['Red', 'Blue', 'Red', 'Blue'] as ('Red' | 'Blue')[];
      const payouts = calculatePlayerPayouts('Push', 0, playerTeams);
      
      expect(payouts).toEqual([0, 0, 0, 0]);
    });

    test('handles Red team win correctly', () => {
      const playerTeams = ['Red', 'Blue', 'Red', 'Blue'] as ('Red' | 'Blue')[];
      const payouts = calculatePlayerPayouts('Red', 8, playerTeams);
      // Each Red player gets +4, each Blue player gets -4
      expect(payouts).toEqual([4, -4, 4, -4]);
    });

    test('handles Blue team win correctly', () => {
      const playerTeams = ['Red', 'Blue', 'Red', 'Blue'] as ('Red' | 'Blue')[];
      const payouts = calculatePlayerPayouts('Blue', 8, playerTeams);
      // Each Red player gets -4, each Blue player gets +4
      expect(payouts).toEqual([-4, 4, -4, 4]);
    });

    test('handles uneven teams correctly', () => {
      const playerTeams = ['Red', 'Blue', 'Red', 'Blue', 'Red'] as ('Red' | 'Blue')[];
      const payouts = calculatePlayerPayouts('Red', 15, playerTeams);
      // Each Red player gets +5, each Blue player gets -7.5
      expect(payouts).toEqual([5, -7.5, 5, -7.5, 5]);
    });
  });

  describe('updateRunningTotals', () => {
    test('updates running totals correctly', () => {
      const currentTotals = [10, -5, 8, -13];
      const holePayouts = [4, -4, 4, -4];
      
      const newTotals = updateRunningTotals(currentTotals, holePayouts);
      expect(newTotals).toEqual([14, -9, 12, -17]);
    });

    test('throws error if arrays have different lengths', () => {
      const currentTotals = [10, -5, 8];
      const holePayouts = [4, -4, 4, -4];
      
      expect(() => {
        updateRunningTotals(currentTotals, holePayouts);
      }).toThrow('Number of players in totals and payouts must match');
    });
  });
}); 
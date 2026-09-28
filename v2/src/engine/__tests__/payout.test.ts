import { describe, expect, it } from 'vitest';
import { applyPayoutToTotals, holePayout } from '@/engine/payout';

describe('holePayout — Millbrook §5', () => {
  it('push: payout 0, carry rolls forward (carry + base)', () => {
    expect(holePayout({ result: 'Push', base: 4, carryIn: 6 })).toEqual({
      payout: 0,
      carryOut: 10,
    });
  });

  it('win: payout = carryIn + base + base, carry resets to 0', () => {
    expect(holePayout({ result: 'Red', base: 4, carryIn: 6 })).toEqual({
      payout: 14, // 6 + 4 + 4
      carryOut: 0,
    });
    expect(holePayout({ result: 'Blue', base: 2, carryIn: 0 })).toEqual({
      payout: 4,
      carryOut: 0,
    });
  });

  it('win-bonus equals the base even when there is no carry', () => {
    expect(holePayout({ result: 'Red', base: 8, carryIn: 0 })).toEqual({
      payout: 16,
      carryOut: 0,
    });
  });
});

describe('applyPayoutToTotals', () => {
  const teams = [
    { id: 'a', team: 'Red' as const },
    { id: 'b', team: 'Red' as const },
    { id: 'c', team: 'Blue' as const },
    { id: 'd', team: 'Blue' as const },
  ];
  const zero = { a: 0, b: 0, c: 0, d: 0 };

  it('splits the payout 50/50 within each team', () => {
    const out = applyPayoutToTotals(zero, 'Red', 8, teams);
    expect(out).toEqual({ a: 4, b: 4, c: -4, d: -4 });
  });

  it('is a no-op for a push', () => {
    expect(applyPayoutToTotals(zero, 'Push', 8, teams)).toEqual(zero);
  });

  it('zero-sum property holds for any win', () => {
    const out = applyPayoutToTotals(zero, 'Blue', 12, teams);
    const sum = Object.values(out).reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { bigGameRow, bigGameTotal } from '@/engine/bigGame';
import type { PlayerHoleScore } from '@/domain/types';

const score = (id: string, team: 'Red' | 'Blue', net: number): PlayerHoleScore => ({
  playerId: id,
  team,
  gross: net,
  net,
  strokes: 0,
  pickedUp: false,
  flags: {},
});

describe('bigGameRow — Big Game §3', () => {
  it('picks the two lowest nets and their sum', () => {
    const row = bigGameRow(1, [
      score('a', 'Red', 5),
      score('b', 'Red', 7),
      score('c', 'Blue', 4),
      score('d', 'Blue', 6),
    ]);
    expect(row.bestNet).toEqual([4, 5]);
    expect(row.subtotal).toBe(9);
    expect(row.contributors).toEqual(['c', 'a']);
  });

  it('throws if fewer than two scores', () => {
    expect(() => bigGameRow(1, [score('a', 'Red', 4)])).toThrow();
  });
});

describe('bigGameTotal', () => {
  it('sums subtotals across rows (typical winning totals 120-150)', () => {
    const rows = Array.from({ length: 18 }, (_, i) => ({
      hole: i + 1,
      bestNet: [4, 4] as [number, number],
      subtotal: 8,
      contributors: ['a', 'b'] as [string, string],
    }));
    expect(bigGameTotal(rows)).toBe(144);
  });
});

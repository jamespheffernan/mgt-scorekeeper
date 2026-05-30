/**
 * Big Game — Big Game §3.
 *
 *   1. Record the foursome's two best NET scores on every hole.
 *   2. Hole subtotal = sum of those two best nets.
 *   3. Big Game Total = Σ subtotals (typical winning total 120-150).
 *   4. Junk does not apply (§3 of side-match book).
 *   5. Lowest Big Game Total wins; ties roll the entire purse (Big Game §7).
 */

import type { BigGameRow, PlayerHoleScore } from '@/domain/types';

export function bigGameRow(hole: number, scores: PlayerHoleScore[]): BigGameRow {
  if (scores.length < 2) {
    throw new Error('bigGameRow: need at least two scores');
  }
  const sorted = [...scores].sort((a, b) => a.net - b.net);
  const [a, b] = [sorted[0]!, sorted[1]!];
  return {
    hole,
    bestNet: [a.net, b.net],
    subtotal: a.net + b.net,
    contributors: [a.playerId, b.playerId],
  };
}

export function bigGameTotal(rows: BigGameRow[]): number {
  return rows.reduce((sum, r) => sum + r.subtotal, 0);
}

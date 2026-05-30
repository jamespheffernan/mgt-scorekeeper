/**
 * Hole payout — Millbrook §5.
 *
 *   If the hole is halved (push):
 *     - payout = 0
 *     - carry  = previous carry + base   (rolls forward)
 *
 *   If a team wins:
 *     - payout = carryIn + base + base   (carry-over + base + win-bonus)
 *     - carry  = 0                       (win-bonus never carries)
 *
 * The payout is split equally between the two players on the winning team;
 * each losing player is debited their half. §7 governs settlement — the two
 * players on the losing team each pay the full final amount to ONE opponent
 * (their choice). The per-hole arithmetic still splits 50/50 so the running
 * total stays a clean two-sided ledger.
 */

import type { HoleResult } from '@/rules/rulebook';

export interface HolePayoutInput {
  result: HoleResult;
  base: number;
  carryIn: number;
}

export interface HolePayoutResult {
  payout: number;
  carryOut: number;
}

export function holePayout({ result, base, carryIn }: HolePayoutInput): HolePayoutResult {
  if (result === 'Push') {
    return { payout: 0, carryOut: carryIn + base };
  }
  return { payout: carryIn + base * 2, carryOut: 0 };
}

/**
 * Apply a side-match payout across the four players. Each winning player
 * gains `payout / 2` and each losing player loses `payout / 2`. Pushes are
 * no-ops.
 */
export function applyPayoutToTotals(
  totals: Record<string, number>,
  result: HoleResult,
  payout: number,
  playerTeams: { id: string; team: 'Red' | 'Blue' }[],
): Record<string, number> {
  if (result === 'Push' || payout === 0) return totals;

  const next = { ...totals };
  const winners = playerTeams.filter((p) => p.team === result);
  const losers = playerTeams.filter((p) => p.team !== result);
  if (winners.length === 0 || losers.length === 0) return totals;

  const perWinner = payout / winners.length;
  const perLoser = payout / losers.length;

  for (const w of winners) next[w.id] = (next[w.id] ?? 0) + perWinner;
  for (const l of losers) next[l.id] = (next[l.id] ?? 0) - perLoser;

  return next;
}

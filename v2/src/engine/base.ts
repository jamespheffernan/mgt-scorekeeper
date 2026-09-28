/**
 * Base wager & doubling — Millbrook §4.
 *
 *   §4.1  Hole 1 base = $1                       (fixed, never doubled)
 *   §4.2  Hole 2 base = $2                       (fixed, never doubled)
 *   §4.3  Hole 3+ base = $2 × 2^doublesInEffect  (doubling starts at hole 3)
 *   §4.4  A double must be declared before any player tees off on that hole;
 *         only the trailing side may call it.
 *   §4.5  Each valid double multiplies the base for that hole AND every
 *         following hole; the base never decreases.
 */

import { BASE_HOLE_1, BASE_HOLE_2_PLUS } from '@/rules/rulebook';
import type { Team } from '@/rules/rulebook';

/**
 * Base dollar amount for a given hole, taking the doubles-in-effect into account.
 * `doubles` is the number of doubles that have been called so far in the round.
 *
 * @param hole         1..18
 * @param doubles      cumulative count of doubles called so far
 */
export function baseForHole(hole: number, doubles: number): number {
  if (hole === 1) return BASE_HOLE_1;
  if (hole === 2) return BASE_HOLE_2_PLUS;
  // Hole 3+: $2 × 2^doubles
  return BASE_HOLE_2_PLUS * 2 ** doubles;
}

/**
 * Decide whether a double is legal to call right now.
 *
 *  - must be on hole 3 or later  (§4.3)
 *  - must be the trailing team   (§4.4)
 *  - must be called before any tee shot on that hole; the caller is responsible
 *    for tracking that — we treat `doubleAlreadyCalledThisHole` as the gate.
 */
export interface DoubleEligibility {
  team: Team;
  hole: number;
  leadingTeam: Team | 'Tied';
  doubleAlreadyCalledThisHole: boolean;
}
export function canCallDouble(input: DoubleEligibility): boolean {
  if (input.hole < 3) return false;
  if (input.doubleAlreadyCalledThisHole) return false;
  if (input.leadingTeam === 'Tied') return false;
  return input.leadingTeam !== input.team; // only trailing team
}

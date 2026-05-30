/**
 * Junk — Millbrook §6 and §6A.
 *
 *   §6   Junk only applies to the side match (never Big Game). Each junk
 *        bet pays the hole's CURRENT base, independent of hole-win money.
 *        Categories:
 *          - Birdie  : gross < par. Pays once per player per round.
 *          - Sandie  : par or better after a bunker shot. May not stack
 *                      with a greenie (ball not on green).
 *          - Greenie : par-3 tee shot finishes on the green, the player is
 *                      closest in regulation, and they make par or better.
 *                      Two balls exactly tied → greenie CARRIES.
 *          - Greenie : a greenie candidate who 3-putts pays the base and
 *            penalty   the greenie carries.
 *          - LD10    : optional on hole 17. Longest drive that ends in upper
 *                      fairway / collar / green wins $10 added to running
 *                      total. Stake is a flat $10, not the base.
 *
 *   §6A  Six par-3 holes (2, 7, 9, 11, 16, 18). Unclaimed greenies roll to
 *        the next par-3 and accumulate. Capturing all six = "greenie grandé".
 */

import {
  BIRDIE_ONCE_PER_PLAYER_PER_ROUND,
  LD10_STAKE,
  PAR3_HOLES,
} from '@/rules/rulebook';
import type { JunkEvent, JunkFlags, PlayerHoleScore, Team } from '@/domain/types';

export interface JunkInput {
  hole: number;
  par: number;
  base: number;
  scores: PlayerHoleScore[];
  /** Carrying greenie value entering this hole (0 if none or hole isn't a par-3). */
  greenieCarry: number;
  /** Players who have already been paid a birdie earlier in the round. */
  birdiePaidPlayers: Set<string>;
  /** True if this is hole 17 AND LD10 was accepted before the tee. */
  ld10Active: boolean;
}

export interface JunkOutcome {
  events: JunkEvent[];
  /** Greenie pool carrying OUT of this hole. */
  greenieCarryOut: number;
  /** Updated set of players who have been paid a birdie. */
  birdiePaidOut: Set<string>;
}

/**
 * Evaluate all junk for a single hole.
 *
 * The function is total: every input maps to a definite outcome. The caller is
 * responsible for skipping calls entirely when Big Game is the only thing being
 * scored.
 */
export function evaluateJunk(input: JunkInput): JunkOutcome {
  const { hole, par, base, scores, ld10Active } = input;
  const events: JunkEvent[] = [];
  const birdiePaid = new Set(input.birdiePaidPlayers);
  const isPar3 = PAR3_HOLES.includes(hole as (typeof PAR3_HOLES)[number]);

  // Greenie resolution must consider all candidates together (carry / penalty),
  // so do it first if this is a par-3.
  let greenieCarryOut = input.greenieCarry;
  if (isPar3) {
    const result = resolveGreenie({ hole, par, base, scores, carryIn: input.greenieCarry });
    events.push(...result.events);
    greenieCarryOut = result.carryOut;
  }

  for (const s of scores) {
    if (s.pickedUp) continue; // pickups can't earn junk

    // Birdie (§6) — once per player per round
    if (s.gross < par) {
      const alreadyPaid = BIRDIE_ONCE_PER_PLAYER_PER_ROUND && birdiePaid.has(s.playerId);
      if (!alreadyPaid) {
        events.push({ hole, playerId: s.playerId, team: s.team, type: 'Birdie', value: base });
        birdiePaid.add(s.playerId);
      }
    }

    // Sandie (§6) — par or better after a bunker shot.
    // §6: "Cannot also earn a Greenie (ball not on green)" — by definition a
    // sandie ball was not on the green from the tee, so the exclusion is
    // automatic when we require `!s.flags.onGreenFromTee` here.
    if (s.flags.hadBunkerShot && s.gross <= par && !s.flags.onGreenFromTee) {
      events.push({ hole, playerId: s.playerId, team: s.team, type: 'Sandie', value: base });
    }
  }

  // LD10 (§6) — flat $10
  if (ld10Active && hole === 17) {
    const winner = scores.find((s) => s.flags.ld10Winner);
    if (winner) {
      events.push({
        hole,
        playerId: winner.playerId,
        team: winner.team,
        type: 'LD10',
        value: LD10_STAKE,
      });
    }
  }

  return { events, greenieCarryOut, birdiePaidOut: birdiePaid };
}

interface GreenieInput {
  hole: number;
  par: number;
  base: number;
  scores: PlayerHoleScore[];
  carryIn: number;
}
interface GreenieResolved {
  events: JunkEvent[];
  carryOut: number;
}

/**
 * Resolve the greenie for a par-3 hole. Three cases:
 *   1. No tee shot on the green → carry forward (carryOut = carryIn + base).
 *   2. One tee shot on the green:
 *        a. Player made par or better with ≤ 2 putts → greenie paid (base + carryIn).
 *        b. Player 3-putted → penalty: player pays base; greenie carries.
 *   3. Multiple tee shots on the green → tied → greenie carries.
 *
 * We don't separately model "closest in regulation" — by Millbrook custom the
 * scorer toggles `onGreenFromTee` only for the closest ball, so a single flag
 * means closest by definition. If the scorer toggles multiple flags they're
 * declaring a tie, which §6 resolves by carrying.
 */
function resolveGreenie(input: GreenieInput): GreenieResolved {
  const { hole, par, base, scores, carryIn } = input;
  const candidates = scores.filter((s) => s.flags.onGreenFromTee && !s.pickedUp);

  if (candidates.length === 0) {
    // Nobody on the green from the tee — carry the base forward.
    return { events: [], carryOut: carryIn + base };
  }

  if (candidates.length > 1) {
    // Tie — §6 says greenie carries; nothing paid.
    return { events: [], carryOut: carryIn + base };
  }

  const c = candidates[0]!;
  const events: JunkEvent[] = [];

  if (c.flags.threePutts) {
    // Greenie penalty: candidate pays the base; greenie carries.
    events.push({
      hole,
      playerId: c.playerId,
      team: c.team,
      type: 'GreeniePenalty',
      value: -base,
    });
    return { events, carryOut: carryIn + base };
  }

  if (c.gross > par) {
    // Made worse than par — greenie carries.
    return { events: [], carryOut: carryIn + base };
  }

  // Clean greenie: pay base + any carried pool.
  events.push({
    hole,
    playerId: c.playerId,
    team: c.team,
    type: 'Greenie',
    value: base + carryIn,
  });
  return { events, carryOut: 0 };
}

/**
 * Apply a set of junk events to the running totals.
 *
 *   Normal junk (Birdie, Sandie, Greenie, LD10): winner's team gains `value`
 *   split 50/50 across its two players; losing team pays `value` split 50/50.
 *
 *   GreeniePenalty: §6 says "Player pays the base". The offending player —
 *   not their partner — is debited |value|; the opposing team receives
 *   |value| split 50/50.
 */
export function applyJunkToTotals(
  totals: Record<string, number>,
  events: JunkEvent[],
  playerTeams: { id: string; team: Team }[],
): Record<string, number> {
  const next = { ...totals };

  for (const e of events) {
    if (e.carry) continue;
    const oppTeam: Team = e.team === 'Red' ? 'Blue' : 'Red';
    const opponents = playerTeams.filter((p) => p.team === oppTeam);

    if (e.type === 'GreeniePenalty') {
      const amount = Math.abs(e.value);
      next[e.playerId] = (next[e.playerId] ?? 0) - amount;
      if (opponents.length > 0) {
        const per = amount / opponents.length;
        for (const o of opponents) next[o.id] = (next[o.id] ?? 0) + per;
      }
      continue;
    }

    const winners = playerTeams.filter((p) => p.team === e.team);
    if (winners.length === 0 || opponents.length === 0) continue;
    const perWinner = e.value / winners.length;
    const perLoser = e.value / opponents.length;
    for (const w of winners) next[w.id] = (next[w.id] ?? 0) + perWinner;
    for (const l of opponents) next[l.id] = (next[l.id] ?? 0) - perLoser;
  }

  return next;
}

export type { JunkFlags };

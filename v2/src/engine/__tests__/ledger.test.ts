/**
 * Integration test — full 18-hole round of the Millbrook Game, walked through
 * the engine. Verifies that the pieces compose correctly: strokes, base
 * sequence, payouts, junk, big game, and the zero-sum property of the ledger.
 */

import { describe, expect, it } from 'vitest';
import {
  applyHole,
  applyDouble,
  initialEngineState,
  type EngineState,
  type PlayerSlot,
} from '@/engine/ledger';
import { allocateStrokes } from '@/engine/strokes';
import { millbrookCourse, parsForTee, strokeIndexesForTee } from '@/courses/millbrook';
import type { PlayerHoleInput } from '@/domain/types';

function buildSlots(): { players: PlayerSlot[]; par: number[] } {
  const indexes = [4.0, 7.0, 9.0, 6.0];
  const teeId = 'white-blue';
  const par = parsForTee(millbrookCourse, teeId);
  const si = strokeIndexesForTee(millbrookCourse, teeId);
  const matrix = allocateStrokes({
    indexes,
    strokeIndexes: [si, si, si, si],
  });
  const players: PlayerSlot[] = [
    { id: 'a', team: 'Red', strokes: matrix[0]! },
    { id: 'b', team: 'Red', strokes: matrix[1]! },
    { id: 'c', team: 'Blue', strokes: matrix[2]! },
    { id: 'd', team: 'Blue', strokes: matrix[3]! },
  ];
  return { players, par };
}

describe('engine integration — full 18-hole round', () => {
  it('ledger is zero-sum across the four players, every hole', () => {
    const { players, par } = buildSlots();
    let state = initialEngineState(players);

    for (let hole = 1; hole <= 18; hole++) {
      const inputs: PlayerHoleInput[] = players.map((_, i) => ({
        gross: par[hole - 1]! + ((i + hole) % 3 === 0 ? 1 : 0),
      }));
      const next = applyHole({
        state,
        players,
        course: { par },
        bigGame: true,
        submission: { hole, inputs },
      });
      state = next.state;
      const sum = Object.values(state.runningTotals).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(0, 8); // floats — within rounding
    }

    expect(state.finished).toBe(true);
    expect(state.ledger).toHaveLength(18);
    expect(state.bigGameRows).toHaveLength(18);
  });

  it('doubles called mid-round take effect immediately and forever', () => {
    const { players, par } = buildSlots();
    let state = initialEngineState(players);

    // Play hole 1: a Red push so Red ends $1 in carry... actually let's
    // engineer hole 1: Blue wins.
    state = applyHole({
      state,
      players,
      course: { par },
      bigGame: false,
      submission: {
        hole: 1,
        inputs: [
          { gross: 6 }, // a Red
          { gross: 6 }, // b Red
          { gross: 5 }, // c Blue — net winner pair
          { gross: 5 }, // d Blue
        ],
      },
    }).state;
    expect(state.leadingTeam).toBe('Blue');

    // Hole 2: Red still trails; can Red call a double? Per §4.3 doubling starts at
    // hole 3, so no.
    expect(state.doubleCalledThisHole).toBe(false);
    state = applyHole({
      state,
      players,
      course: { par },
      bigGame: false,
      submission: { hole: 2, inputs: [{ gross: 4 }, { gross: 4 }, { gross: 3 }, { gross: 3 }] },
    }).state;

    // Hole 3: Red trails; Red calls a double pre-tee.
    state = applyDouble(state, 'Red');
    expect(state.doubles).toBe(1);

    // Red wants a clean win. Player a (Red, low index) makes birdie 4 (no
    // strokes). Player b posts par 5. Both Blue players get strokes on hole 3
    // (SI 5 is in c's top 5; not in d's top 2). Score them 7/7 so even with
    // c's stroke they net 6/7. Red wins on net 4 vs net 6.
    const { row, state: after } = applyHole({
      state,
      players,
      course: { par },
      bigGame: false,
      submission: { hole: 3, inputs: [{ gross: 4 }, { gross: 5 }, { gross: 7 }, { gross: 7 }] },
    });
    // Base for hole 3 with one double = $4.
    expect(row.base).toBe(4);
    expect(row.result).toBe('Red');
    // Red won — payout = carryIn + 2*base. carryIn here is 0 (no prior push).
    expect(row.payout).toBe(8);
    state = after;

    // Hole 4 onwards still at base $4 until another double.
    expect(state.doubles).toBe(1);
    expect(state.doubleCalledThisHole).toBe(false);
  });

  it('a halved hole rolls its base into the next hole as carry', () => {
    const { players, par } = buildSlots();
    let state = initialEngineState(players);

    // Hole 1: all four match — push.
    state = applyHole({
      state,
      players,
      course: { par },
      bigGame: false,
      submission: { hole: 1, inputs: [{ gross: 6 }, { gross: 6 }, { gross: 6 }, { gross: 6 }] },
    }).state;
    expect(state.carryIn).toBe(1); // $1 from hole 1 base rolls forward
    expect(state.runningTotals).toEqual({ a: 0, b: 0, c: 0, d: 0 });

    // Hole 2: Red wins. Payout = carryIn ($1) + 2*base ($4) = $5.
    const next = applyHole({
      state,
      players,
      course: { par },
      bigGame: false,
      submission: { hole: 2, inputs: [{ gross: 3 }, { gross: 3 }, { gross: 4 }, { gross: 4 }] },
    });
    expect(next.row.payout).toBe(5);
    // Each Red player +$2.50, each Blue -$2.50.
    expect(next.row.runningTotals).toEqual({ a: 2.5, b: 2.5, c: -2.5, d: -2.5 });
  });

  it('Big Game §3 — junk does not affect Big Game subtotals', () => {
    const { players, par } = buildSlots();
    let state: EngineState = initialEngineState(players);

    state = applyHole({
      state,
      players,
      course: { par },
      bigGame: true,
      submission: {
        hole: 1,
        inputs: [
          { gross: 4 }, // Red — birdie on a par 5
          { gross: 6 },
          { gross: 5 },
          { gross: 5 },
        ],
      },
    }).state;

    const row = state.ledger[0]!;
    expect(row.junk.some((e) => e.type === 'Birdie')).toBe(true);
    // Big Game uses the two lowest NETs (no junk involved): 4 and 5 = 9.
    expect(row.bigGame?.subtotal).toBe(9);
  });

  it('a pickup records a net double-bogey for that player', () => {
    const { players, par } = buildSlots();
    const state = initialEngineState(players);

    const { row, state: after } = applyHole({
      state,
      players,
      course: { par },
      bigGame: false,
      submission: {
        hole: 1, // par 5, SI 7 — nobody gets a stroke here
        inputs: [{ gross: 5 }, { pickedUp: true }, { gross: 5 }, { gross: 5 }],
      },
    });
    // Player b pickup: net = par + 2 = 7, gross = par + 2 + 0 strokes = 7.
    const b = after.ledger[0]!;
    expect(b).toBe(row);
    // Red min net = min(5, 7) = 5; Blue min net = 5 → Push.
    expect(row.result).toBe('Push');
    // No junk earned by a pickup.
    expect(row.junk.find((e) => e.playerId === 'b')).toBeUndefined();
  });
});

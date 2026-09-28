import { describe, expect, it } from 'vitest';
import { evaluateJunk, applyJunkToTotals } from '@/engine/junk';
import type { JunkFlags, PlayerHoleScore, Team } from '@/domain/types';

function score(
  id: string,
  team: Team,
  gross: number,
  flags: JunkFlags = {},
  pickedUp = false,
): PlayerHoleScore {
  return {
    playerId: id,
    team,
    gross,
    net: gross,
    strokes: 0,
    pickedUp,
    flags,
  };
}

const teams = [
  { id: 'a', team: 'Red' as const },
  { id: 'b', team: 'Red' as const },
  { id: 'c', team: 'Blue' as const },
  { id: 'd', team: 'Blue' as const },
];

describe('Birdie — §6', () => {
  it('detects a gross birdie and pays the base', () => {
    const { events } = evaluateJunk({
      hole: 5,
      par: 4,
      base: 4,
      scores: [score('a', 'Red', 3), score('b', 'Red', 4), score('c', 'Blue', 4), score('d', 'Blue', 5)],
      greenieCarry: 0,
      birdiePaidPlayers: new Set(),
      ld10Active: false,
    });
    expect(events.filter((e) => e.type === 'Birdie')).toEqual([
      { hole: 5, playerId: 'a', team: 'Red', type: 'Birdie', value: 4 },
    ]);
  });

  it('pays the birdie only once per player per round', () => {
    const paid = new Set<string>(['a']);
    const { events, birdiePaidOut } = evaluateJunk({
      hole: 5,
      par: 4,
      base: 4,
      scores: [score('a', 'Red', 3), score('b', 'Red', 4), score('c', 'Blue', 4), score('d', 'Blue', 4)],
      greenieCarry: 0,
      birdiePaidPlayers: paid,
      ld10Active: false,
    });
    expect(events.filter((e) => e.type === 'Birdie')).toHaveLength(0);
    expect(birdiePaidOut.has('a')).toBe(true);
  });

  it('a pick-up cannot earn a birdie', () => {
    const { events } = evaluateJunk({
      hole: 5,
      par: 4,
      base: 4,
      scores: [score('a', 'Red', 3, {}, true), score('b', 'Red', 4), score('c', 'Blue', 4), score('d', 'Blue', 4)],
      greenieCarry: 0,
      birdiePaidPlayers: new Set(),
      ld10Active: false,
    });
    expect(events).toHaveLength(0);
  });
});

describe('Sandie — §6', () => {
  it('pays when a bunker shot ends in par-or-better and ball not on green from tee', () => {
    const { events } = evaluateJunk({
      hole: 5,
      par: 4,
      base: 4,
      scores: [score('a', 'Red', 4, { hadBunkerShot: true }), score('b', 'Red', 5), score('c', 'Blue', 5), score('d', 'Blue', 5)],
      greenieCarry: 0,
      birdiePaidPlayers: new Set(),
      ld10Active: false,
    });
    expect(events).toEqual([
      { hole: 5, playerId: 'a', team: 'Red', type: 'Sandie', value: 4 },
    ]);
  });

  it('does not pay if the player worse than par', () => {
    const { events } = evaluateJunk({
      hole: 5,
      par: 4,
      base: 4,
      scores: [score('a', 'Red', 5, { hadBunkerShot: true }), score('b', 'Red', 4), score('c', 'Blue', 4), score('d', 'Blue', 4)],
      greenieCarry: 0,
      birdiePaidPlayers: new Set(),
      ld10Active: false,
    });
    expect(events.find((e) => e.type === 'Sandie')).toBeUndefined();
  });
});

describe('Greenie — §6, §6A', () => {
  it('par-3: clean greenie pays base + carryIn', () => {
    const { events, greenieCarryOut } = evaluateJunk({
      hole: 7,
      par: 3,
      base: 4,
      scores: [score('a', 'Red', 3, { onGreenFromTee: true }), score('b', 'Red', 4), score('c', 'Blue', 4), score('d', 'Blue', 4)],
      greenieCarry: 6,
      birdiePaidPlayers: new Set(['a']),
      ld10Active: false,
    });
    expect(events.find((e) => e.type === 'Greenie')).toEqual({
      hole: 7,
      playerId: 'a',
      team: 'Red',
      type: 'Greenie',
      value: 10, // 4 (base) + 6 (carry)
    });
    expect(greenieCarryOut).toBe(0);
  });

  it('par-3: no candidate → greenie carries (carryIn + base)', () => {
    const { events, greenieCarryOut } = evaluateJunk({
      hole: 7,
      par: 3,
      base: 4,
      scores: [score('a', 'Red', 4), score('b', 'Red', 4), score('c', 'Blue', 4), score('d', 'Blue', 4)],
      greenieCarry: 6,
      birdiePaidPlayers: new Set(),
      ld10Active: false,
    });
    expect(events.find((e) => e.type === 'Greenie')).toBeUndefined();
    expect(greenieCarryOut).toBe(10);
  });

  it('par-3: tied candidates → greenie carries', () => {
    const { events, greenieCarryOut } = evaluateJunk({
      hole: 9,
      par: 3,
      base: 4,
      scores: [
        score('a', 'Red', 3, { onGreenFromTee: true }),
        score('b', 'Red', 4),
        score('c', 'Blue', 3, { onGreenFromTee: true }),
        score('d', 'Blue', 4),
      ],
      greenieCarry: 0,
      birdiePaidPlayers: new Set(),
      ld10Active: false,
    });
    expect(events.find((e) => e.type === 'Greenie')).toBeUndefined();
    expect(greenieCarryOut).toBe(4);
  });

  it('par-3: greenie candidate 3-putts → penalty, greenie carries', () => {
    const { events, greenieCarryOut } = evaluateJunk({
      hole: 9,
      par: 3,
      base: 4,
      scores: [
        score('a', 'Red', 4, { onGreenFromTee: true, threePutts: true }),
        score('b', 'Red', 4),
        score('c', 'Blue', 4),
        score('d', 'Blue', 4),
      ],
      greenieCarry: 2,
      birdiePaidPlayers: new Set(),
      ld10Active: false,
    });
    expect(events.find((e) => e.type === 'GreeniePenalty')).toEqual({
      hole: 9,
      playerId: 'a',
      team: 'Red',
      type: 'GreeniePenalty',
      value: -4,
    });
    expect(greenieCarryOut).toBe(6);
  });

  it('does not evaluate greenie on a non-par-3 hole', () => {
    const { greenieCarryOut } = evaluateJunk({
      hole: 5,
      par: 4,
      base: 4,
      scores: [
        score('a', 'Red', 4, { onGreenFromTee: true }),
        score('b', 'Red', 4),
        score('c', 'Blue', 4),
        score('d', 'Blue', 4),
      ],
      greenieCarry: 6,
      birdiePaidPlayers: new Set(),
      ld10Active: false,
    });
    expect(greenieCarryOut).toBe(6); // unchanged
  });
});

describe('LD10 — §6', () => {
  it('pays the flat $10 on hole 17 when active', () => {
    const { events } = evaluateJunk({
      hole: 17,
      par: 4,
      base: 8,
      scores: [
        score('a', 'Red', 4, { ld10Winner: true }),
        score('b', 'Red', 5),
        score('c', 'Blue', 5),
        score('d', 'Blue', 5),
      ],
      greenieCarry: 0,
      birdiePaidPlayers: new Set(),
      ld10Active: true,
    });
    expect(events.find((e) => e.type === 'LD10')).toEqual({
      hole: 17,
      playerId: 'a',
      team: 'Red',
      type: 'LD10',
      value: 10,
    });
  });

  it('does not pay if LD10 was not accepted', () => {
    const { events } = evaluateJunk({
      hole: 17,
      par: 4,
      base: 8,
      scores: [score('a', 'Red', 4, { ld10Winner: true }), score('b', 'Red', 4), score('c', 'Blue', 5), score('d', 'Blue', 5)],
      greenieCarry: 0,
      birdiePaidPlayers: new Set(),
      ld10Active: false,
    });
    expect(events.find((e) => e.type === 'LD10')).toBeUndefined();
  });
});

describe('applyJunkToTotals', () => {
  it('credits and debits 50/50 per team', () => {
    const out = applyJunkToTotals(
      { a: 0, b: 0, c: 0, d: 0 },
      [{ hole: 5, playerId: 'a', team: 'Red', type: 'Birdie', value: 4 }],
      teams,
    );
    expect(out).toEqual({ a: 2, b: 2, c: -2, d: -2 });
  });

  it('GreeniePenalty: only the offender pays; opposing team is credited 50/50', () => {
    const out = applyJunkToTotals(
      { a: 0, b: 0, c: 0, d: 0 },
      [{ hole: 9, playerId: 'a', team: 'Red', type: 'GreeniePenalty', value: -4 }],
      teams,
    );
    expect(out).toEqual({ a: -4, b: 0, c: 2, d: 2 });
  });

  it('stays zero-sum across the four players for any junk event', () => {
    const out = applyJunkToTotals(
      { a: 0, b: 0, c: 0, d: 0 },
      [
        { hole: 5, playerId: 'a', team: 'Red', type: 'Birdie', value: 4 },
        { hole: 7, playerId: 'c', team: 'Blue', type: 'Greenie', value: 10 },
      ],
      teams,
    );
    const sum = Object.values(out).reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });
});

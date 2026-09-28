import { describe, expect, it } from 'vitest';
import { baseForHole, canCallDouble } from '@/engine/base';

describe('baseForHole — Millbrook §4', () => {
  it('§4.1 — hole 1 is always $1, regardless of doubles', () => {
    expect(baseForHole(1, 0)).toBe(1);
    expect(baseForHole(1, 5)).toBe(1);
  });

  it('§4.2 — hole 2 is always $2, regardless of doubles', () => {
    expect(baseForHole(2, 0)).toBe(2);
    expect(baseForHole(2, 3)).toBe(2);
  });

  it('§4.3 — holes 3+ remain $2 until a double is called', () => {
    for (let h = 3; h <= 18; h++) expect(baseForHole(h, 0)).toBe(2);
  });

  it('§4.5 — each double multiplies all subsequent holes', () => {
    expect(baseForHole(3, 1)).toBe(4);
    expect(baseForHole(5, 1)).toBe(4);
    expect(baseForHole(5, 2)).toBe(8);
    expect(baseForHole(18, 4)).toBe(32);
  });

  it('§4.5 — base never decreases', () => {
    let prev = baseForHole(3, 0);
    for (let h = 4; h <= 18; h++) {
      const b = baseForHole(h, 0);
      expect(b).toBeGreaterThanOrEqual(prev);
      prev = b;
    }
  });
});

describe('canCallDouble — Millbrook §4.4', () => {
  it('disallows on holes 1 and 2', () => {
    expect(canCallDouble({ team: 'Red', hole: 1, leadingTeam: 'Blue', doubleAlreadyCalledThisHole: false })).toBe(false);
    expect(canCallDouble({ team: 'Red', hole: 2, leadingTeam: 'Blue', doubleAlreadyCalledThisHole: false })).toBe(false);
  });

  it('disallows when no team is trailing (tied)', () => {
    expect(canCallDouble({ team: 'Red', hole: 5, leadingTeam: 'Tied', doubleAlreadyCalledThisHole: false })).toBe(false);
  });

  it('only the trailing team may call a double', () => {
    expect(canCallDouble({ team: 'Blue', hole: 5, leadingTeam: 'Red', doubleAlreadyCalledThisHole: false })).toBe(true);
    expect(canCallDouble({ team: 'Red', hole: 5, leadingTeam: 'Red', doubleAlreadyCalledThisHole: false })).toBe(false);
  });

  it('disallows a second double on the same hole', () => {
    expect(canCallDouble({ team: 'Blue', hole: 5, leadingTeam: 'Red', doubleAlreadyCalledThisHole: true })).toBe(false);
  });
});

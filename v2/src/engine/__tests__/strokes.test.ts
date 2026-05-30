import { describe, expect, it } from 'vitest';
import { allocateStrokes, strokesOn } from '@/engine/strokes';

const SI_18 = [7, 9, 5, 13, 3, 11, 17, 1, 15, 6, 12, 8, 4, 16, 2, 18, 14, 10];

describe('allocateStrokes — Millbrook §2', () => {
  it('returns zero strokes for the lowest-index player', () => {
    const m = allocateStrokes({
      indexes: [4.2, 10.1, 8.9, 6.0],
      strokeIndexes: [SI_18, SI_18, SI_18, SI_18],
    });
    expect(m[0]!.every((s) => s === 0)).toBe(true);
  });

  it('distributes (idx - low) strokes across the hardest SI holes first', () => {
    const m = allocateStrokes({
      indexes: [4.0, 7.0, 9.0, 6.0],
      strokeIndexes: [SI_18, SI_18, SI_18, SI_18],
    });
    // Player 1 gets 3 strokes (7 - 4), placed on SI 1, 2, 3 → holes 8, 15, 5.
    const p1 = m[1]!;
    expect(p1.reduce((a, b) => a + b, 0)).toBe(3);
    expect(p1[8 - 1]).toBe(1);
    expect(p1[15 - 1]).toBe(1);
    expect(p1[5 - 1]).toBe(1);
  });

  it('floors fractional differences', () => {
    const m = allocateStrokes({
      indexes: [4.0, 6.9, 5.4, 4.0],
      strokeIndexes: [SI_18, SI_18, SI_18, SI_18],
    });
    // 6.9 - 4 = 2.9 → floor → 2 strokes
    expect(m[1]!.reduce((a, b) => a + b, 0)).toBe(2);
    // 5.4 - 4 = 1.4 → floor → 1 stroke
    expect(m[2]!.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('wraps around to give 2 strokes on the hardest holes when index > 18', () => {
    const m = allocateStrokes({
      indexes: [4.0, 24.0, 4.0, 4.0],
      strokeIndexes: [SI_18, SI_18, SI_18, SI_18],
    });
    // 20 strokes → 18 holes get 1 each, plus 2 more on SI 1 (hole 8) and SI 2 (hole 15)
    const p1 = m[1]!;
    expect(p1.reduce((a, b) => a + b, 0)).toBe(20);
    expect(p1[8 - 1]).toBe(2);
    expect(p1[15 - 1]).toBe(2);
    expect(p1[5 - 1]).toBe(1);
  });

  it('Big Game §2 — uses field baseline when provided', () => {
    const m = allocateStrokes({
      indexes: [10, 12, 11, 13],
      strokeIndexes: [SI_18, SI_18, SI_18, SI_18],
      baseIndex: 5, // a player in another foursome has a 5
    });
    // Player 0 still gets (10 - 5) = 5 strokes even though locally lowest.
    expect(m[0]!.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it('honors per-player stroke-index tables (multi-tee)', () => {
    // Build an alt table where SI 1 lives at hole 9 (index 8).
    const altSI = SI_18.map((si, i) => (i === 8 ? 1 : si === 1 ? 15 : si));
    const m = allocateStrokes({
      indexes: [4, 5, 4, 4],
      strokeIndexes: [SI_18, altSI, SI_18, SI_18],
    });
    const p1 = m[1]!;
    expect(p1.reduce((a, b) => a + b, 0)).toBe(1);
    expect(p1[8]).toBe(1);
  });

  it('strokesOn helper matches matrix', () => {
    const m = allocateStrokes({
      indexes: [4, 7, 4, 4],
      strokeIndexes: [SI_18, SI_18, SI_18, SI_18],
    });
    expect(strokesOn(m, 1, 8)).toBe(1);
    expect(strokesOn(m, 0, 8)).toBe(0);
  });

  it('rejects mismatched array sizes', () => {
    expect(() =>
      allocateStrokes({ indexes: [1, 2], strokeIndexes: [SI_18] }),
    ).toThrow();
    expect(() =>
      allocateStrokes({ indexes: [1], strokeIndexes: [[1, 2, 3]] }),
    ).toThrow();
  });
});

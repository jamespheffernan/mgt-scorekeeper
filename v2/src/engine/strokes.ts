/**
 * Handicap stroke allocation — Millbrook §2.
 *
 * The lowest index in the foursome (or in the entire field for Big Game) is the
 * baseline. Every other player gets `floor(theirIndex - lowIndex)` strokes,
 * distributed across holes by ascending stroke index. If a player has more than
 * 18 strokes, they wrap around and get a second stroke on the hardest holes.
 *
 * Each player may play from a different tee, so each player carries their own
 * stroke-index table for that tee.
 */

import { HOLE_COUNT } from '@/rules/rulebook';

export interface StrokeAllocationInput {
  /** Handicap indexes per player, in player order. */
  indexes: number[];
  /** Stroke-index tables, 18 entries each, per player (matches player order). */
  strokeIndexes: number[][];
  /** Big Game baseline (§2 of the Big Game book) — uses the lowest index in the field. */
  baseIndex?: number;
}

/**
 * Returns a `[playerCount][18]` matrix where each cell is the number of
 * handicap strokes the player gets on that hole (0, 1, or 2).
 */
export function allocateStrokes(input: StrokeAllocationInput): number[][] {
  const { indexes, strokeIndexes } = input;
  if (indexes.length === 0) return [];
  if (indexes.length !== strokeIndexes.length) {
    throw new Error('strokes: indexes and strokeIndexes must have the same length');
  }
  for (const si of strokeIndexes) {
    if (si.length !== HOLE_COUNT) {
      throw new Error(`strokes: stroke index table must have ${HOLE_COUNT} entries`);
    }
  }

  const baseline = input.baseIndex ?? Math.min(...indexes);
  const strokesGiven = indexes.map((idx) => Math.max(0, Math.floor(idx - baseline)));

  return strokesGiven.map((total, playerIdx) => {
    const matrix = new Array<number>(HOLE_COUNT).fill(0);
    if (total === 0) return matrix;

    const table = strokeIndexes[playerIdx]!;
    // Sort hole indices ascending by SI (hardest first).
    const order = table
      .map((si, holeIdx) => [holeIdx, si] as const)
      .sort((a, b) => a[1] - b[1])
      .map(([holeIdx]) => holeIdx);

    for (let s = 0; s < total; s++) {
      const holeIdx = order[s % HOLE_COUNT];
      if (holeIdx !== undefined) matrix[holeIdx] = (matrix[holeIdx] ?? 0) + 1;
    }
    return matrix;
  });
}

/** Convenience: how many strokes does player p get on hole h (1-indexed)? */
export function strokesOn(matrix: number[][], playerIdx: number, hole: number): number {
  return matrix[playerIdx]?.[hole - 1] ?? 0;
}

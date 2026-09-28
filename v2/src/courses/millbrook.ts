/**
 * Millbrook Golf & Tennis Club — course data extracted verbatim from the
 * scorecard JSON appended to the rulebook MD. Six par-3s confirmed at holes
 * 2, 7, 9, 11, 16, 18 (matches §6A).
 */

import type { Course } from '@/domain/types';

export const millbrookCourse: Course = {
  id: 'millbrook',
  name: 'Millbrook Golf & Tennis Club',
  tees: [
    {
      id: 'white-blue',
      name: 'White / Blue',
      holes: [
        { number: 1, par: 5, yards: 497, strokeIndex: 7 },
        { number: 2, par: 3, yards: 190, strokeIndex: 9 },
        { number: 3, par: 5, yards: 518, strokeIndex: 5 },
        { number: 4, par: 4, yards: 289, strokeIndex: 13 },
        { number: 5, par: 4, yards: 379, strokeIndex: 3 },
        { number: 6, par: 5, yards: 441, strokeIndex: 11 },
        { number: 7, par: 3, yards: 163, strokeIndex: 17 },
        { number: 8, par: 4, yards: 386, strokeIndex: 1 },
        { number: 9, par: 3, yards: 151, strokeIndex: 15 },
        { number: 10, par: 5, yards: 485, strokeIndex: 6 },
        { number: 11, par: 3, yards: 190, strokeIndex: 12 },
        { number: 12, par: 5, yards: 498, strokeIndex: 8 },
        { number: 13, par: 4, yards: 320, strokeIndex: 4 },
        { number: 14, par: 4, yards: 328, strokeIndex: 16 },
        { number: 15, par: 4, yards: 389, strokeIndex: 2 },
        { number: 16, par: 3, yards: 150, strokeIndex: 18 },
        { number: 17, par: 4, yards: 343, strokeIndex: 14 },
        { number: 18, par: 3, yards: 207, strokeIndex: 10 },
      ],
    },
    {
      id: 'blue-green',
      name: 'Blue / Green',
      holes: [
        { number: 1, par: 5, yards: 485, strokeIndex: 7 },
        { number: 2, par: 3, yards: 190, strokeIndex: 9 },
        { number: 3, par: 5, yards: 498, strokeIndex: 5 },
        { number: 4, par: 4, yards: 320, strokeIndex: 13 },
        { number: 5, par: 4, yards: 328, strokeIndex: 3 },
        { number: 6, par: 4, yards: 389, strokeIndex: 11 },
        { number: 7, par: 3, yards: 150, strokeIndex: 17 },
        { number: 8, par: 4, yards: 343, strokeIndex: 1 },
        { number: 9, par: 3, yards: 207, strokeIndex: 15 },
        { number: 10, par: 5, yards: 455, strokeIndex: 6 },
        { number: 11, par: 3, yards: 177, strokeIndex: 12 },
        { number: 12, par: 5, yards: 473, strokeIndex: 8 },
        { number: 13, par: 4, yards: 218, strokeIndex: 4 },
        { number: 14, par: 4, yards: 328, strokeIndex: 16 },
        { number: 15, par: 4, yards: 325, strokeIndex: 2 },
        { number: 16, par: 3, yards: 140, strokeIndex: 18 },
        { number: 17, par: 4, yards: 291, strokeIndex: 14 },
        { number: 18, par: 3, yards: 151, strokeIndex: 10 },
      ],
    },
    {
      id: 'green-silver',
      name: 'Green / Silver',
      holes: [
        { number: 1, par: 5, yards: 455, strokeIndex: 7 },
        { number: 2, par: 3, yards: 177, strokeIndex: 9 },
        { number: 3, par: 5, yards: 473, strokeIndex: 5 },
        { number: 4, par: 4, yards: 218, strokeIndex: 13 },
        { number: 5, par: 4, yards: 328, strokeIndex: 3 },
        { number: 6, par: 4, yards: 325, strokeIndex: 11 },
        { number: 7, par: 3, yards: 140, strokeIndex: 17 },
        { number: 8, par: 4, yards: 291, strokeIndex: 1 },
        { number: 9, par: 3, yards: 151, strokeIndex: 15 },
        { number: 10, par: 5, yards: 455, strokeIndex: 6 },
        { number: 11, par: 3, yards: 140, strokeIndex: 12 },
        { number: 12, par: 5, yards: 414, strokeIndex: 8 },
        { number: 13, par: 4, yards: 218, strokeIndex: 4 },
        { number: 14, par: 4, yards: 228, strokeIndex: 16 },
        { number: 15, par: 4, yards: 325, strokeIndex: 2 },
        { number: 16, par: 3, yards: 125, strokeIndex: 18 },
        { number: 17, par: 4, yards: 295, strokeIndex: 14 },
        { number: 18, par: 3, yards: 190, strokeIndex: 10 },
      ],
    },
    {
      id: 'red-gold',
      name: 'Red / Gold',
      holes: [
        { number: 1, par: 5, yards: 455, strokeIndex: 3 },
        { number: 2, par: 3, yards: 139, strokeIndex: 15 },
        { number: 3, par: 5, yards: 414, strokeIndex: 5 },
        { number: 4, par: 4, yards: 218, strokeIndex: 13 },
        { number: 5, par: 4, yards: 232, strokeIndex: 11 },
        { number: 6, par: 5, yards: 389, strokeIndex: 7 },
        { number: 7, par: 3, yards: 109, strokeIndex: 17 },
        { number: 8, par: 4, yards: 291, strokeIndex: 1 },
        { number: 9, par: 3, yards: 140, strokeIndex: 9 },
        { number: 10, par: 5, yards: 485, strokeIndex: 2 },
        { number: 11, par: 3, yards: 177, strokeIndex: 10 },
        { number: 12, par: 4, yards: 296, strokeIndex: 16 },
        { number: 13, par: 3, yards: 145, strokeIndex: 18 },
        { number: 14, par: 4, yards: 328, strokeIndex: 6 },
        { number: 15, par: 5, yards: 325, strokeIndex: 4 },
        { number: 16, par: 3, yards: 140, strokeIndex: 8 },
        { number: 17, par: 5, yards: 343, strokeIndex: 14 },
        { number: 18, par: 4, yards: 207, strokeIndex: 12 },
      ],
    },
  ],
};

/** Convenience helpers. */
export function parsForTee(course: Course, teeId: string): number[] {
  const tee = course.tees.find((t) => t.id === teeId);
  if (!tee) throw new Error(`unknown tee: ${teeId}`);
  return tee.holes.map((h) => h.par);
}

export function strokeIndexesForTee(course: Course, teeId: string): number[] {
  const tee = course.tees.find((t) => t.id === teeId);
  if (!tee) throw new Error(`unknown tee: ${teeId}`);
  return tee.holes.map((h) => h.strokeIndex);
}

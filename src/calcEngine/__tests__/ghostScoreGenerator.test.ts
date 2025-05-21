import { generateGhostScores } from '../ghostScoreGenerator';

// Mock course with 18 holes, par 4, strokeIndex 1-18
const mockCourse = {
  holes: Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: 4,
    yardage: 400,
    strokeIndex: i + 1,
  })),
};

describe('generateGhostScores', () => {
  it('returns 18 scores for a typical index', () => {
    const scores = generateGhostScores(12, mockCourse, 123);
    expect(scores).toHaveLength(18);
    scores.forEach(score => expect(typeof score).toBe('number'));
  });

  it('mean and stdev are within expected range for index 10', () => {
    // Run multiple times to get a distribution
    const runs = 1000;
    let allScores: number[] = [];
    for (let i = 0; i < runs; i++) {
      allScores = allScores.concat(generateGhostScores(10, mockCourse, i));
    }
    const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    const stdev = Math.sqrt(allScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allScores.length);
    // For index 10, mean should be ~par+0.6-0.7 per hole (so ~4.6-4.7), stdev ~0.7-0.9
    expect(mean).toBeGreaterThanOrEqual(4.5);
    expect(mean).toBeLessThanOrEqual(5.0);
    expect(stdev).toBeGreaterThanOrEqual(0.6);
    expect(stdev).toBeLessThanOrEqual(1.1);
  });

  it('output is deterministic for a given seed', () => {
    const scores1 = generateGhostScores(15, mockCourse, 999);
    const scores2 = generateGhostScores(15, mockCourse, 999);
    expect(scores1).toEqual(scores2);
  });

  it('supports generating scores for multiple ghosts in a match', () => {
    const indexes = [5, 12, 20, 25];
    const seeds = [1, 2, 3, 4];
    const allScores = indexes.map((idx, i) => generateGhostScores(idx, mockCourse, seeds[i]));
    allScores.forEach(scores => {
      expect(scores).toHaveLength(18);
      scores.forEach(score => expect(typeof score).toBe('number'));
    });
    // Ensure different ghosts (different index/seed) get different scores
    expect(allScores[0]).not.toEqual(allScores[1]);
    expect(allScores[2]).not.toEqual(allScores[3]);
  });
}); 
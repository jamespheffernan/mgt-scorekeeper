import { Course, HoleInfo } from '../db/courseModel';

// Utility: Seedable random number generator (simple LCG for determinism)
function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

// Utility: Box-Muller transform for normal distribution
function randomNormal(rng: () => number, mean: number, stddev: number) {
  let u = 0, v = 0;
  while (u === 0) u = rng(); // Avoid 0
  while (v === 0) v = rng();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stddev + mean;
}

// Main ghost score generator
export function generateGhostScores(
  index: number,
  course: { holes: HoleInfo[] },
  seed: number = 42
): number[] {
  // μ and σ functions from research
  // μ: Par + (index/18) + buffer, adjusted for hole difficulty
  // σ: 0.5 + 0.025*index, adjusted ±10% for hole difficulty
  const rng = seededRandom(seed);
  const scores: number[] = [];
  const H = index;
  const holes = course.holes;
  // Empirical buffer: +3 for mid, +5 for high handicaps, 0 for plus
  const buffer = H >= 15 ? 5 : H > 0 ? 3 : 0;
  const extraStrokes = H + buffer;
  // Difficulty weights: linear from 1.3 (SI=1) to 0.7 (SI=18)
  const weights = holes.map(h => 1.3 - 0.6 * ((h.strokeIndex - 1) / 17));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 18; i++) {
    const hole = holes[i];
    const par = hole.par;
    const si = hole.strokeIndex;
    const weight = weights[i];
    // Mean over par for this hole
    let meanOver = (extraStrokes / totalWeight) * weight;
    // For H >= si, allocate at least 1 stroke over par
    if (H >= si) meanOver = Math.max(meanOver, 1);
    if (H > 18 && si <= H - 18) meanOver = Math.max(meanOver, 2);
    // Par-based tweak (optional, can refine)
    // For now, just use meanOver
    const mu = par + meanOver;
    // Standard deviation
    let sigma = 0.5 + 0.025 * Math.abs(H);
    if (si <= 6) sigma *= 1.1;
    else if (si >= 13) sigma *= 0.9;
    // Draw score, round, clamp to [par-2, par+4]
    let score = Math.round(randomNormal(rng, mu, sigma));
    score = Math.max(score, par - 2);
    score = Math.min(score, par + 4);
    scores.push(score);
  }
  return scores;
}

// Placeholder for unit tests
// TODO: Write tests to verify mean, stdev, and distribution for various indexes 
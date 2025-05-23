import { Course, HoleInfo } from '../db/courseModel';
import { JunkFlags } from './junkCalculator';

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

/**
 * Ghost Junk Event Generation - Generates realistic junk events for ghost players
 * Based on probability tables from research document
 */

// Interface for ghost junk events per hole
export interface GhostJunkEvents {
  [hole: number]: JunkFlags;
}

/**
 * Calculate birdie probability based on handicap and hole difficulty
 */
function getBirdieProb(handicap: number, strokeIndex: number): number {
  // Base birdie rates from research:
  // Scratch: ~13% per hole (2.3 per round)
  // H=10: ~4% per hole (0.7 per round)  
  // H=20: ~2% per hole (0.36 per round)
  
  let baseRate: number;
  if (handicap <= 0) {
    baseRate = 0.13; // Scratch/plus handicaps
  } else if (handicap <= 5) {
    baseRate = 0.10;
  } else if (handicap <= 10) {
    baseRate = 0.04;
  } else if (handicap <= 15) {
    baseRate = 0.03;
  } else {
    baseRate = 0.02; // High handicaps
  }
  
  // Difficulty modifier: easier holes have higher birdie chance
  const difficultyFactor = (19 - strokeIndex) / 18; // 1.0 for easiest, ~0.06 for hardest
  const adjustedRate = baseRate * (0.5 + 1.5 * difficultyFactor);
  
  return Math.min(adjustedRate, 0.25); // Cap at 25%
}

/**
 * Calculate bunker encounter and sand save probabilities
 */
function getSandieProb(handicap: number, grossScore: number, par: number, strokeIndex: number): number {
  // Only consider if made par or better
  if (grossScore > par) return 0;
  
  // Bunker encounter probabilities based on GIR rates and accuracy
  const girRate = handicap <= 0 ? 0.61 : 
                  handicap <= 10 ? 0.35 : 
                  0.16; // H=20
  
  const missRate = 1 - girRate;
  // Increase bunker rate - more misses find bunkers than 25%
  const bunkerRate = missRate * 0.35; // ~35% of misses find bunkers
  
  // Sand save rates from research - but need to account for the fact that
  // we're already conditioning on par or better score
  let sandSaveRate = handicap <= 0 ? 0.37 :
                     handicap <= 10 ? 0.20 :
                     0.15; // H=20
  
  // If the score is particularly good (birdie), higher chance it was a sand save
  if (grossScore < par) {
    sandSaveRate *= 1.5; // More likely to be from bunker if birdie
  }
  
  // Also factor in hole difficulty - harder holes more likely to have bunkers
  const difficultyFactor = strokeIndex <= 6 ? 1.3 : strokeIndex >= 13 ? 0.8 : 1.0;
  
  return bunkerRate * sandSaveRate * difficultyFactor;
}

/**
 * Calculate greenie probability (par-3 only)
 */
function getGreenieProb(handicap: number, grossScore: number, par: number): number {
  // Only on par-3s and only if made par or better
  if (par !== 3 || grossScore > par) return 0;
  
  // GIR rates on par-3s (slightly different from overall)
  const par3GirRate = handicap <= 0 ? 0.50 :
                      handicap <= 10 ? 0.30 :
                      0.18; // H=20
  
  // Probability of making par given GIR (avoid 3-putt)
  const parGivenGir = handicap <= 0 ? 0.97 :
                      handicap <= 10 ? 0.93 :
                      0.87; // H=20
  
  // Total greenie probability
  return par3GirRate * parGivenGir;
}

/**
 * Calculate greenie penalty probability (par-3 only)
 */
function getGreeniePenaltyProb(handicap: number, grossScore: number, par: number): number {
  // Only on par-3s and only if made bogey or worse
  if (par !== 3 || grossScore <= par) return 0;
  
  // GIR rate on par-3s
  const par3GirRate = handicap <= 0 ? 0.50 :
                      handicap <= 10 ? 0.30 :
                      0.18; // H=20
  
  // 3-putt rate given GIR
  const threePuttRate = handicap <= 0 ? 0.03 :
                        handicap <= 10 ? 0.07 :
                        0.13; // H=20
  
  return par3GirRate * threePuttRate;
}

/**
 * Calculate long drive probability (hole 17 only)
 */
function getLongDriveProb(handicap: number, hole: number): number {
  // Only on hole 17 (LD10)
  if (hole !== 17) return 0;
  
  // Fairway hit rates
  const fairwayRate = handicap <= 0 ? 0.60 :
                      handicap <= 10 ? 0.50 :
                      0.40; // H=20
  
  // Assuming 4-player field, 25% chance to win if all hit fairway
  // Adjust based on handicap advantage
  let winChance = 0.25;
  if (handicap <= 5) winChance = 0.35; // Better players hit it farther
  else if (handicap >= 15) winChance = 0.15; // Shorter hitters
  
  return fairwayRate * winChance;
}

/**
 * Generate junk events for a ghost player
 * @param ghostIndex Ghost player's handicap index
 * @param grossScores Array of 18 gross scores
 * @param course Course information with hole details
 * @param seed Random seed for deterministic generation
 * @returns Object mapping hole numbers to JunkFlags
 */
export function generateGhostJunkEvents(
  ghostIndex: number,
  grossScores: number[],
  course: { holes: HoleInfo[] },
  seed: number = 42
): GhostJunkEvents {
  const rng = seededRandom(seed + 1000); // Offset seed to avoid correlation with scores
  const junkEvents: GhostJunkEvents = {};
  
  for (let i = 0; i < 18; i++) {
    const hole = course.holes[i];
    const holeNumber = i + 1;
    const grossScore = grossScores[i];
    const par = hole.par;
    const strokeIndex = hole.strokeIndex;
    
    // Initialize flags
    const flags: JunkFlags = {
      hadBunkerShot: false,
      isOnGreenFromTee: false,
      isClosestOnGreen: false, // Deprecated but kept for compatibility
      hadThreePutts: false,
      isLongDrive: false
    };
    
    // Check for birdie (automatic if score is under par)
    // No flag needed - this is determined by the score itself
    
    // Check for sandie (bunker save)
    if (grossScore <= par) {
      const sandieProb = getSandieProb(ghostIndex, grossScore, par, strokeIndex);
      if (rng() < sandieProb) {
        flags.hadBunkerShot = true;
      }
    }
    
    // Check for greenie (par-3 green in regulation with par or better)
    if (par === 3 && grossScore <= par) {
      const greenieProb = getGreenieProb(ghostIndex, grossScore, par);
      if (rng() < greenieProb) {
        flags.isOnGreenFromTee = true;
        flags.isClosestOnGreen = true; // Auto-award if only one player
      }
    }
    
    // Check for greenie penalty (par-3 GIR but 3-putt)
    if (par === 3 && grossScore > par) {
      const penaltyProb = getGreeniePenaltyProb(ghostIndex, grossScore, par);
      if (rng() < penaltyProb) {
        flags.isOnGreenFromTee = true;
        flags.hadThreePutts = true;
      }
    }
    
    // Check for long drive (hole 17 only)
    if (holeNumber === 17) {
      const ldProb = getLongDriveProb(ghostIndex, holeNumber);
      if (rng() < ldProb) {
        flags.isLongDrive = true;
      }
    }
    
    junkEvents[holeNumber] = flags;
  }
  
  return junkEvents;
}

// Placeholder for unit tests
// TODO: Write tests to verify mean, stdev, and distribution for various indexes 
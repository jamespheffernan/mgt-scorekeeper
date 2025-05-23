/**
 * Big Game Calculator
 * 
 * Calculates the "two best net" scores for each hole in the Big Game format.
 * 
 * Algorithm:
 * 1. Sort net scores ascending → bestNet[0..3]
 * 2. subtotal = bestNet[0] + bestNet[1]
 * 3. BigGameRow = { hole, bestNet:[bestNet0,bestNet1], subtotal }
 * 4. Match.bigGameTotal = Σ subtotal (holes 1-18)
 */

export interface BigGameRow {
  hole: number;           // 1-18
  bestNet: [number, number];  // Two best net scores
  subtotal: number;       // Sum of two best net scores
}

/**
 * Calculate the two best net scores for a hole
 * 
 * @param hole Hole number (1-18)
 * @param netScores Array of net scores (2-4), one per non-ghost player
 * @returns BigGameRow with the two best net scores and their sum
 */
export function calculateBigGameRow(
  hole: number,
  netScores: number[]
): BigGameRow {
  // Validate input
  if (netScores.length < 2) {
    throw new Error('Big Game calculation requires at least 2 non-ghost players');
  }
  
  // Validate all scores are numbers
  if (!netScores.every(score => typeof score === 'number' && !isNaN(score))) {
    throw new Error('Big Game calculation requires all net scores to be valid numbers');
  }
  
  // Sort scores ascending (lowest first)
  const sortedScores = [...netScores].sort((a, b) => a - b);
  
  // Take two best (lowest) scores
  const bestNet: [number, number] = [sortedScores[0], sortedScores[1]];
  
  // Calculate subtotal (sum of two best)
  const subtotal = bestNet[0] + bestNet[1];
  
  // Validate the result
  if (isNaN(subtotal)) {
    throw new Error(`Big Game calculation resulted in NaN for hole ${hole} with scores ${JSON.stringify(netScores)}`);
  }
  
  return {
    hole,
    bestNet,
    subtotal
  };
}

/**
 * Calculate the total Big Game score from an array of BigGameRows
 * 
 * @param rows Array of BigGameRow objects, one per hole
 * @returns Total Big Game score (sum of all subtotals)
 */
export function calculateBigGameTotal(rows: BigGameRow[]): number {
  return rows.reduce((total, row) => total + row.subtotal, 0);
}

/**
 * Find the indexes of the two best scores
 * This is useful for highlighting which players' scores were used
 * 
 * @param netScores Array of net scores (2-4), one per non-ghost player
 * @returns Array of indexes for the two best (lowest) scores
 */
export function findBestScoreIndexes(netScores: number[]): number[] {
  if (netScores.length < 2) {
    throw new Error('Finding best score indexes requires at least 2 net scores');
  }
  
  // Create array of {score, index} objects
  const scoresWithIndexes = netScores.map((score, index) => ({ score, index }));
  
  // Sort by score (ascending)
  scoresWithIndexes.sort((a, b) => a.score - b.score);
  
  // Return the indexes of the two best scores
  return [scoresWithIndexes[0].index, scoresWithIndexes[1].index];
} 
/**
 * Handicap Stroke Allocation
 * 
 * Allocates handicap strokes based on player indexes and course stroke indexes (SI).
 * Uses the "low-index" rule, where the player with the lowest index is used as
 * the baseline, and other players get strokes on holes based on their index difference.
 */

/**
 * Allocate handicap strokes for all players
 * 
 * @param indexes Player handicap indexes (e.g. [8.4, 6.1, 10.2, 9.3])
 * @param holeSI Course stroke index table (1-18) representing hole difficulty
 * @param bigGameBaseIndex Optional big game base index
 * @returns Number matrix [players][holes] where value is how many strokes player gets on that hole
 */
export function allocateStrokes(
  indexes: number[],
  holeSI: number[],
  bigGameBaseIndex?: number
): number[][] {
  // Find the lowest index as baseline
  const lowestIndex = typeof bigGameBaseIndex === 'number'
    ? bigGameBaseIndex
    : Math.min(...indexes);
  
  // Calculate number of strokes for each player (difference from lowest)
  const strokes = indexes.map(index => Math.floor(index - lowestIndex));
  
  // <<< STROKE ALLOCATION LOGGING START >>>
  console.log('[STROKE DEBUG] allocateStrokes called with:');
  console.log('[STROKE DEBUG] Player Handicap Indexes:', indexes);
  console.log('[STROKE DEBUG] Course Hole SIs:', holeSI);
  console.log('[STROKE DEBUG] Lowest Index:', lowestIndex);
  console.log('[STROKE DEBUG] Strokes to allocate per player:', strokes);
  // <<< STROKE ALLOCATION LOGGING END >>>
  
  // Create result matrix - [players][holes]
  const strokesPerHole: number[][] = Array(indexes.length)
    .fill(null)
    .map(() => Array(18).fill(0));
  
  // Get the sorted hole indexes by SI
  const sortedHoleIndexes = findHolesBySI(holeSI, 18);
  
  // Allocate strokes based on hole SI
  for (let playerIdx = 0; playerIdx < indexes.length; playerIdx++) {
    let playerStrokes = strokes[playerIdx];
    
    // <<< STROKE ALLOCATION LOGGING START >>>
    console.log(`[STROKE DEBUG] Processing player ${playerIdx} (Index: ${indexes[playerIdx]}). Total strokes: ${playerStrokes}`);
    // <<< STROKE ALLOCATION LOGGING END >>>

    if (playerStrokes === 0) continue; // No strokes for lowest-index player
    
    // For each stroke, find the next hole by SI
    for (let stroke = 1; stroke <= playerStrokes; stroke++) {
      // Calculate which hole gets this stroke (mod 18)
      const holeInRound = (stroke - 1) % 18;
      const holeIdx = sortedHoleIndexes[holeInRound];
      
      // <<< STROKE ALLOCATION LOGGING START >>>
      console.log(`[STROKE DEBUG] Player ${playerIdx}: Stroke ${stroke} allocated to hole index ${holeIdx} (SI: ${holeSI[holeIdx]})`);
      // <<< STROKE ALLOCATION LOGGING END >>>

      // Increment the stroke count for this hole
      strokesPerHole[playerIdx][holeIdx]++;
    }
  }
  
  return strokesPerHole;
}

/**
 * Allocate handicap strokes for all players with multi-tee support
 * 
 * This enhanced version supports different tees for each player
 * 
 * @param indexes Player handicap indexes (e.g. [8.4, 6.1, 10.2, 9.3])
 * @param playerSI Array of stroke index arrays, one per player [[SI for player1], [SI for player2], etc.]
 * @param bigGameBaseIndex Optional big game base index
 * @returns Number matrix [players][holes] where value is how many strokes player gets on that hole
 */
export function allocateStrokesMultiTee(
  indexes: number[],
  playerSI: number[][],
  bigGameBaseIndex?: number
): number[][] {
  // Find the lowest index as baseline
  const lowestIndex = typeof bigGameBaseIndex === 'number' 
    ? bigGameBaseIndex 
    : Math.min(...indexes);
  
  // Calculate number of strokes for each player (difference from lowest)
  const strokes = indexes.map(index => Math.floor(index - lowestIndex));
  
  // <<< STROKE ALLOCATION LOGGING START >>>
  console.log('[STROKE DEBUG] allocateStrokesMultiTee called with:');
  console.log('[STROKE DEBUG] Player Handicap Indexes:', indexes);
  console.log('[STROKE DEBUG] Player Specific SIs:', playerSI);
  console.log('[STROKE DEBUG] Lowest Index:', lowestIndex);
  console.log('[STROKE DEBUG] Strokes to allocate per player:', strokes);
  // <<< STROKE ALLOCATION LOGGING END >>>
  
  // Create result matrix - [players][holes]
  const strokesPerHole: number[][] = Array(indexes.length)
    .fill(null)
    .map(() => Array(18).fill(0));
  
  // Allocate strokes based on each player's own SI
  for (let playerIdx = 0; playerIdx < indexes.length; playerIdx++) {
    let playerStrokes = strokes[playerIdx];
    
    // <<< STROKE ALLOCATION LOGGING START >>>
    console.log(`[STROKE DEBUG] Processing player ${playerIdx} (Index: ${indexes[playerIdx]}). Total strokes: ${playerStrokes}`);
    // <<< STROKE ALLOCATION LOGGING END >>>

    if (playerStrokes === 0) continue; // No strokes for lowest-index player
    
    // Get sorted hole indexes by this player's SI
    const playerHoleSI = playerSI[playerIdx];
    if (!playerHoleSI || playerHoleSI.length !== 18) {
      console.error(`Invalid stroke index data for player ${playerIdx}`);
      continue;
    }
    
    const sortedHoleIndexes = findHolesBySI(playerHoleSI, 18);
    
    // <<< STROKE ALLOCATION LOGGING START >>>
    console.log(`[STROKE DEBUG] Player ${playerIdx} using SIs:`, playerHoleSI);
    console.log(`[STROKE DEBUG] Player ${playerIdx} sorted hole indexes by their SI:`, sortedHoleIndexes.map(hIdx => ({ hole: hIdx + 1, si: playerHoleSI[hIdx] })));
    // <<< STROKE ALLOCATION LOGGING END >>>
    
    // For each stroke, find the next hole by SI
    for (let stroke = 1; stroke <= playerStrokes; stroke++) {
      // Calculate which hole gets this stroke (mod 18)
      const holeInRound = (stroke - 1) % 18;
      const holeIdx = sortedHoleIndexes[holeInRound];
      
      // <<< STROKE ALLOCATION LOGGING START >>>
      console.log(`[STROKE DEBUG] Player ${playerIdx}: Stroke ${stroke} allocated to their hole index ${holeIdx} (Actual SI for player: ${playerHoleSI[holeIdx]})`);
      // <<< STROKE ALLOCATION LOGGING END >>>

      // Increment the stroke count for this hole
      strokesPerHole[playerIdx][holeIdx]++;
    }
  }
  
  return strokesPerHole;
}

/**
 * Check if a player gets strokes on a specific hole
 * 
 * @param strokeMatrix The matrix returned by allocateStrokes
 * @param playerIndex Index of the player in the strokeMatrix
 * @param holeIndex Index of the hole (0-17)
 * @returns True if the player gets one or more strokes on the hole
 */
export function hasStroke(
  strokeMatrix: number[][],
  playerIndex: number,
  holeIndex: number
): boolean {
  return strokeMatrix[playerIndex][holeIndex] > 0;
}

/**
 * Get the number of strokes a player gets on a specific hole
 * 
 * @param strokeMatrix The matrix returned by allocateStrokes
 * @param playerIndex Index of the player in the strokeMatrix
 * @param holeIndex Index of the hole (0-17)
 * @returns Number of strokes the player gets on the hole
 */
export function getStrokes(
  strokeMatrix: number[][],
  playerIndex: number,
  holeIndex: number
): number {
  return strokeMatrix[playerIndex][holeIndex];
}

/**
 * Find the indexes of holes based on their stroke index (SI) values
 * 
 * @param holeSI Course stroke index array
 * @param count Number of holes to find
 * @returns Array of hole indexes (0-17) ordered by SI
 */
function findHolesBySI(holeSI: number[], count: number): number[] {
  // Create array of [holeIndex, strokeIndex] pairs
  const indexed = holeSI.map((si, idx) => [idx, si]);
  
  // Sort by stroke index (ascending)
  indexed.sort((a, b) => a[1] - b[1]);
  
  // Take the first 'count' holes
  return indexed.slice(0, count).map(pair => pair[0]);
} 
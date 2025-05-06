/**
 * Base & Doubling Sequence
 * 
 * Handles the base amount calculation and doubling for the Millbrook Game.
 * - initial: hole1 base = 1; hole2 base = 2
 * - hole3+ base = 2 × 2^doubles (doubles = valid double calls so far)
 */

/**
 * Match state related to base and doubling
 */
export interface DoublingState {
  currentHole: number;
  base: number;
  doubles: number;
  carry: number;
  leadingTeam: 'Red' | 'Blue' | 'Tied';
  doubleUsedThisHole: boolean;
}

/**
 * Get the initial doubling state
 */
export function getInitialDoublingState(): DoublingState {
  return {
    currentHole: 1,
    base: 1,
    doubles: 0,
    carry: 0,
    leadingTeam: 'Tied',
    doubleUsedThisHole: false
  };
}

/**
 * Calculate the base amount for a hole
 * 
 * @param holeNumber Current hole number (1-18)
 * @param doubles Number of doubles called so far
 * @returns Base amount in dollars
 */
export function calculateBase(holeNumber: number, doubles: number): number {
  console.log(`[BASE-DEBUG] Calculating base for hole ${holeNumber} with ${doubles} doubles`);
  
  // First hole is fixed at 1
  if (holeNumber === 1) {
    console.log(`[BASE-DEBUG] Hole 1: base = 1`);
    return 1;
  }
  
  // Second hole is fixed at 2 (unless explicitly doubled)
  if (holeNumber === 2) {
    const baseValue = doubles > 0 ? 2 * Math.pow(2, doubles - 1) : 2;
    console.log(`[BASE-DEBUG] Hole 2: base = ${baseValue}`);
    return baseValue;
  }
  
  // Hole 3+ uses the standard doubling formula
  const baseValue = 2 * Math.pow(2, doubles);
  console.log(`[BASE-DEBUG] Hole ${holeNumber}: base = ${baseValue} (2 * 2^${doubles})`);
  return baseValue;
}

/**
 * Call a double for the trailing team
 * 
 * @param state Current doubling state
 * @param teamCalling Team calling the double
 * @returns Updated doubling state with new base and doubles count
 */
export function callDouble(
  state: DoublingState,
  teamCalling: 'Red' | 'Blue'
): DoublingState {
  // Can't double if already used on this hole
  if (state.doubleUsedThisHole) {
    return state;
  }
  
  // Only the trailing team can double
  if (
    (teamCalling === 'Red' && state.leadingTeam === 'Red') ||
    (teamCalling === 'Blue' && state.leadingTeam === 'Blue') ||
    state.leadingTeam === 'Tied'
  ) {
    return state;
  }
  
  // Update the state with the new double
  const newDoubles = state.doubles + 1;
  const newBase = calculateBase(state.currentHole, newDoubles);
  
  return {
    ...state,
    doubles: newDoubles,
    base: newBase,
    doubleUsedThisHole: true
  };
}

/**
 * Move to the next hole, updating the base amount
 * 
 * @param state Current doubling state
 * @param winner Team that won the hole ('Red', 'Blue', or 'Push')
 * @param additionalCarry Additional carry amount (usually from junk)
 * @returns Updated doubling state for the next hole
 */
export function advanceToNextHole(
  state: DoublingState,
  winner: 'Red' | 'Blue' | 'Push',
  additionalCarry: number = 0
): DoublingState {
  const nextHole = state.currentHole + 1;
  
  // Update the carry amount and leading team
  let newCarry = 0;
  let newLeadingTeam = state.leadingTeam;
  
  if (winner === 'Push') {
    // Carry forward the existing base and any additional carry
    newCarry = state.base + state.carry + additionalCarry;
  } else {
    // Update the leading team
    newLeadingTeam = winner;
  }
  
  // Calculate the new base for the next hole
  const newBase = calculateBase(nextHole, state.doubles);
  
  return {
    currentHole: nextHole,
    base: newBase,
    doubles: state.doubles,
    carry: newCarry,
    leadingTeam: newLeadingTeam,
    doubleUsedThisHole: false
  };
} 
/**
 * Hole Payout Calculator
 * 
 * Handles the payout calculations for holes in the Millbrook Game.
 * - If winner == "Push": carry += base; payout = 0
 * - else: payout = carry + base + base; carry = 0 (win-bonus = base)
 */

/**
 * Calculate the payout for a hole result
 * 
 * @param winner The winning team ('Red', 'Blue') or 'Push'
 * @param base Current base amount in dollars
 * @param carry Current carry amount in dollars
 * @returns Object with payout amount and new carry amount
 */
export function calculateHolePayout(
  winner: 'Red' | 'Blue' | 'Push',
  base: number,
  carry: number = 0
): { payout: number; newCarry: number } {
  console.log(`[PAYOUT-DEBUG] Calculating hole payout: winner=${winner}, base=${base}, carry=${carry}`);
  
  if (winner === 'Push') {
    // No payout, carry increases by the base amount
    const newCarry = carry + base;
    console.log(`[PAYOUT-DEBUG] Push result: payout=0, newCarry=${newCarry}`);
    return {
      payout: 0,
      newCarry
    };
  } else {
    // Winner gets: carry + base + win-bonus (base)
    const totalPayout = carry + base + base; // carry + 2*base
    console.log(`[PAYOUT-DEBUG] Win result: payout=${totalPayout} (carry=${carry} + base=${base} + win-bonus=${base})`);
    return {
      payout: totalPayout,
      newCarry: 0 // Reset carry after a win
    };
  }
}

/**
 * Calculate individual player payouts from a hole result
 * 
 * @param winner The winning team ('Red', 'Blue') or 'Push'
 * @param payout The total payout amount for the hole
 * @param playerTeams Array of team assignments for each player ['Red', 'Blue', 'Red', 'Blue']
 * @returns Array of payouts per player (positive for winners, negative for losers)
 */
export function calculatePlayerPayouts(
  winner: 'Red' | 'Blue' | 'Push',
  payout: number,
  playerTeams: ('Red' | 'Blue')[]
): number[] {
  // For a push, everyone gets 0
  if (winner === 'Push') {
    return playerTeams.map(() => 0);
  }

  const numPlayers = playerTeams.length;
  if (numPlayers === 0) return [];

  const winningTeamPlayers = playerTeams.filter(team => team === winner).length;
  const losingTeamPlayers = numPlayers - winningTeamPlayers;

  // Avoid division by zero if a team has no players (should not happen in a typical game)
  if (winningTeamPlayers === 0 || losingTeamPlayers === 0) {
    console.error('[PAYOUT-DEBUG] Team has zero players, cannot distribute payout fairly.');
    return playerTeams.map(() => 0); // Or handle error appropriately
  }

  const payoutPerWinningPlayer = payout / winningTeamPlayers;
  const payoutPerLosingPlayer = -payout / losingTeamPlayers;

  return playerTeams.map(team => {
    if (team === winner) {
      return payoutPerWinningPlayer;
    } else {
      return payoutPerLosingPlayer;
    }
  });
}

/**
 * Update running totals after a hole
 * 
 * @param currentTotals Current running totals for each player
 * @param holePayouts Payouts for this hole for each player
 * @returns New running totals after adding hole payouts
 */
export function updateRunningTotals(
  currentTotals: number[],
  holePayouts: number[]
): number[] {
  if (currentTotals.length !== holePayouts.length) {
    throw new Error('Number of players in totals and payouts must match');
  }
  
  return currentTotals.map((total, idx) => total + holePayouts[idx]);
} 
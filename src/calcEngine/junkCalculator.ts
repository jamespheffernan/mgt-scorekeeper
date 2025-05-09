/**
 * Junk Calculator
 * 
 * Handles the junk event detection and calculations for the Millbrook Game.
 * Junk events include:
 * - Birdie: gross < par
 * - Sandie: bunker → par or better
 * - Greenie: Par-3 tee-ball on green + closest
 * - Penalty: Greenie candidate 3-putts
 * - LD10: Hole 17 long-drive in fair/green (fixed $10)
 */

// Types for junk event management
export type JunkType = 'Birdie' | 'Sandie' | 'Greenie' | 'Penalty' | 'LD10';

export interface JunkEvent {
  hole: number;       // 1-18
  playerId: string;   // For tracking who earned it
  teamId: 'Red' | 'Blue'; // Team that gets the money
  type: JunkType;
  value: number;      // Dollar amount
}

export interface JunkFlags {
  hadBunkerShot: boolean;  // For Sandie
  isOnGreenFromTee: boolean; // For Greenie
  isClosestOnGreen: boolean; // For Greenie (closest to pin) - DEPRECATED, now automatic with isOnGreenFromTee
  hadThreePutts: boolean;  // For Penalty
  isLongDrive: boolean;    // For LD10
}

/**
 * Detect birdie junk event
 * 
 * @param hole Hole number (1-18)
 * @param playerId Player ID
 * @param teamId Player's team (Red or Blue)
 * @param grossScore Player's gross score
 * @param par Par for the hole
 * @param base Current base amount for junk payout
 * @returns JunkEvent if a birdie was made, otherwise null
 */
export function detectBirdie(
  hole: number,
  playerId: string,
  teamId: 'Red' | 'Blue',
  grossScore: number,
  par: number,
  base: number
): JunkEvent | null {
  if (grossScore < par) {
    return {
      hole,
      playerId,
      teamId,
      type: 'Birdie',
      value: base
    };
  }
  return null;
}

/**
 * Detect sandie junk event (par or better after bunker shot)
 * 
 * @param hole Hole number (1-18)
 * @param playerId Player ID
 * @param teamId Player's team (Red or Blue)
 * @param grossScore Player's gross score
 * @param par Par for the hole
 * @param flags Flags indicating special conditions for the hole
 * @param base Current base amount for junk payout
 * @returns JunkEvent if a sandie was made, otherwise null
 */
export function detectSandie(
  hole: number,
  playerId: string,
  teamId: 'Red' | 'Blue',
  grossScore: number,
  par: number,
  flags: JunkFlags,
  base: number
): JunkEvent | null {
  if (flags.hadBunkerShot && grossScore <= par) {
    return {
      hole,
      playerId,
      teamId,
      type: 'Sandie',
      value: base
    };
  }
  return null;
}

/**
 * Detect greenie junk event (on green from tee on Par 3)
 * 
 * @param hole Hole number (1-18)
 * @param playerId Player ID
 * @param teamId Player's team (Red or Blue)
 * @param isPar3 Whether the hole is a Par 3
 * @param flags Flags indicating special conditions for the hole
 * @param base Current base amount for junk payout
 * @returns JunkEvent if a greenie was made, otherwise null
 */
export function detectGreenie(
  hole: number,
  playerId: string,
  teamId: 'Red' | 'Blue',
  isPar3: boolean,
  flags: JunkFlags,
  base: number
): JunkEvent | null {
  // Only need isOnGreenFromTee, removing dependency on isClosestOnGreen
  if (isPar3 && flags.isOnGreenFromTee) {
    return {
      hole,
      playerId,
      teamId,
      type: 'Greenie',
      value: base
    };
  }
  return null;
}

/**
 * Detect penalty junk event (3-putts after being on green from tee)
 * 
 * @param hole Hole number (1-18)
 * @param playerId Player ID
 * @param teamId Player's team (Red or Blue)
 * @param isPar3 Whether the hole is a Par 3
 * @param flags Flags indicating special conditions for the hole
 * @param base Current base amount for junk payout
 * @returns JunkEvent if a penalty was incurred, otherwise null
 */
export function detectPenalty(
  hole: number,
  playerId: string,
  teamId: 'Red' | 'Blue',
  isPar3: boolean,
  flags: JunkFlags,
  base: number
): JunkEvent | null {
  if (isPar3 && flags.isOnGreenFromTee && flags.hadThreePutts) {
    return {
      hole,
      playerId,
      teamId,
      type: 'Penalty',
      value: base
    };
  }
  return null;
}

/**
 * Detect LD10 junk event (long drive on hole 17)
 * 
 * @param hole Hole number (1-18)
 * @param playerId Player ID
 * @param teamId Player's team (Red or Blue)
 * @param flags Flags indicating special conditions for the hole
 * @returns JunkEvent if LD10 was achieved, otherwise null
 */
export function detectLD10(
  hole: number,
  playerId: string,
  teamId: 'Red' | 'Blue',
  flags: JunkFlags
): JunkEvent | null {
  if (hole === 17 && flags.isLongDrive) {
    return {
      hole,
      playerId,
      teamId,
      type: 'LD10',
      value: 10 // Fixed $10 amount
    };
  }
  return null;
}

/**
 * Evaluate all possible junk events for a player on a hole
 * 
 * @param hole Hole number (1-18)
 * @param playerId Player ID
 * @param teamId Player's team (Red or Blue)
 * @param grossScore Player's gross score
 * @param par Par for the hole
 * @param flags Junk event flags from the UI
 * @param base Base amount for the hole (for calculating payouts)
 * @returns Array of detected junk events
 */
export function evaluateJunkEvents(
  hole: number,
  playerId: string,
  teamId: 'Red' | 'Blue',
  grossScore: number,
  par: number,
  flags: JunkFlags,
  base: number
): JunkEvent[] {
  console.log(`[JUNK-DEBUG] Evaluating junk for hole ${hole} with base=${base}, par=${par}, grossScore=${grossScore}`);
  console.log(`[JUNK-DEBUG] Flags: onGreen=${flags.isOnGreenFromTee}, bunker=${flags.hadBunkerShot}, 3putt=${flags.hadThreePutts}`);
  
  const results: JunkEvent[] = [];
  
  // Detect Birdie
  const birdieEvent = detectBirdie(hole, playerId, teamId, grossScore, par, base);
  if (birdieEvent) {
    console.log(`[JUNK-DEBUG] Detected birdie: value=${birdieEvent.value}`);
    results.push(birdieEvent);
  }
  
  // Detect Sandie
  if (flags.hadBunkerShot) {
    const sandieEvent = detectSandie(hole, playerId, teamId, grossScore, par, flags, base);
    if (sandieEvent) {
      console.log(`[JUNK-DEBUG] Detected sandie: value=${sandieEvent.value}`);
      results.push(sandieEvent);
    }
  }
  
  // Detect Greenie for par 3 holes
  if (par === 3 && flags.isOnGreenFromTee) {
    console.log(`[JUNK-DEBUG] Par 3 with onGreen=true - checking greenie eligibility`);
    const greenieEvent = detectGreenie(hole, playerId, teamId, true, flags, base);
    if (greenieEvent) {
      console.log(`[JUNK-DEBUG] Detected greenie: value=${greenieEvent.value}`);
      results.push(greenieEvent);
    }
  } else if (par === 3) {
    console.log(`[JUNK-DEBUG] Par 3 hole but onGreen=false, no greenie check`);
  } else {
    console.log(`[JUNK-DEBUG] Not a par 3 hole (par=${par}), no greenie check`);
  }
  
  // Detect 3-Putt Penalty
  if (flags.hadThreePutts) {
    const penaltyEvent = detectPenalty(hole, playerId, teamId, par === 3, flags, base);
    if (penaltyEvent) {
      console.log(`[JUNK-DEBUG] Detected penalty: value=${penaltyEvent.value}`);
      results.push(penaltyEvent);
    }
  }
  
  // Detect LD10 (Long Drive on hole 17)
  if (flags.isLongDrive) {
    const ldEvent = detectLD10(hole, playerId, teamId, flags);
    if (ldEvent) {
      console.log(`[JUNK-DEBUG] Detected long drive: value=${ldEvent.value}`);
      results.push(ldEvent);
    }
  }
  
  return results;
} 
import { Player } from '../db/API-GameState';

/**
 * Get a player's full name from first and last name,
 * with fallback to legacy 'name' property if needed
 */
export function getFullName(player: Player | any): string {
  // Handle all possible scenarios
  if (player.first && player.last) return `${player.first} ${player.last}`.trim();
  if (player.first) return player.first;
  if (player.last) return player.last;
  if (player.name) return player.name;
  return '';
}

/**
 * Split a full name into first and last name parts
 */
export function splitNameParts(fullName: string | undefined | null): {first: string, last: string} {
  if (!fullName) return { first: '', last: '' };
  
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { first: parts[0], last: '' };
  }
  return {
    first: parts[0],
    last: parts.slice(1).join(' ')
  };
}

/**
 * Migrate a player object from having just 'name' to having 'first' and 'last'
 * Does not mutate the original object
 */
export function migratePlayerObject(player: any): Player {
  if (!player) return player;
  
  // Create a new object to avoid mutation
  const result = {...player};
  
  // Only process if we have a name but missing first/last
  if (player.name && (!player.first || !player.last)) {
    const { first, last } = splitNameParts(player.name);
    result.first = first;
    result.last = last;
  }
  
  return result;
}

/**
 * Type guard to check if player object has the required fields
 */
export function isCompletePlayer(player: any): player is Player {
  return player && 
         typeof player.id === 'string' && 
         typeof player.first === 'string' && 
         typeof player.last === 'string';
}

/**
 * Safely get a player's full name with error handling
 */
export function safeGetFullName(player: any): string {
  try {
    return getFullName(player);
  } catch (e) {
    console.error('Error getting player name:', e);
    return 'Unknown Player';
  }
}

/**
 * Validate player data and return any errors
 */
export function validatePlayerData(player: any): string[] {
  const errors = [];
  if (!player.id) errors.push('Missing player ID');
  if (!player.first && !player.last && !player.name) errors.push('Missing player name');
  return errors;
} 
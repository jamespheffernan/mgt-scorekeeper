import { Player } from '../db/API-GameState';

/**
 * Formats player first and last name into a full display name
 */
export const formatPlayerName = (player: Player): string => {
  if (!player.first && !player.last) {
    return player.name || ''; // Fallback to original name if both are empty
  }
  
  return `${player.first} ${player.last}`.trim();
};

/**
 * Formats name to title case for display
 */
export const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Splits full name into first and last components
 */
export const splitNameParts = (fullName: string): { first: string; last: string } => {
  const nameParts = fullName.trim().split(' ');
  if (nameParts.length >= 2) {
    return {
      first: nameParts[0],
      last: nameParts.slice(1).join(' ')
    };
  }
  return {
    first: fullName,
    last: ''
  };
};

/**
 * Ensures a player object has both legacy name and first/last fields
 * Use this when saving/updating player records
 */
export const ensurePlayerNameConsistency = (player: Player): Player => {
  // If we have first/last but no name, create it
  if (!player.name && (player.first || player.last)) {
    return {
      ...player,
      name: `${player.first} ${player.last}`.trim()
    };
  }
  
  // If we have name but no first/last, split it
  if (player.name && (!player.first && !player.last)) {
    const { first, last } = splitNameParts(player.name);
    return {
      ...player,
      first,
      last
    };
  }
  
  // If everything exists, ensure name matches first/last
  return {
    ...player,
    name: `${player.first} ${player.last}`.trim() || player.name
  };
}; 
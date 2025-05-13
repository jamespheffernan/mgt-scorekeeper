import { Player } from '../db/API-GameState';

/**
 * Sort players by last name, then first name
 */
export const sortPlayersByName = (players: Player[]): Player[] => {
  return [...players].sort((a, b) => {
    // First compare last names
    const lastNameA = (a.last || '').toLowerCase();
    const lastNameB = (b.last || '').toLowerCase();
    
    if (lastNameA !== lastNameB) {
      return lastNameA.localeCompare(lastNameB);
    }
    
    // If last names are equal, compare first names
    const firstNameA = (a.first || '').toLowerCase();
    const firstNameB = (b.first || '').toLowerCase();
    return firstNameA.localeCompare(firstNameB);
  });
};

/**
 * Sort players by most recently used
 */
export const sortPlayersByLastUsed = (players: Player[]): Player[] => {
  return [...players].sort((a, b) => {
    const dateA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
    const dateB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
    return dateB - dateA; // Descending order (most recent first)
  });
}; 
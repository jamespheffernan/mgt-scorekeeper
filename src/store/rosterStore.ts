import { create } from 'zustand';
import { millbrookDb } from '../db/millbrookDb';
import { Team, MatchRoster } from '../types/player';

/**
 * Utility function to migrate legacy team data from player.team
 * to the new MatchRoster structure
 */
export async function migrateLegacyTeams(): Promise<MatchRoster> {
  const players = await millbrookDb.getAllPlayers();
  const roster: MatchRoster = { red: [], blue: [] };
  
  // Find any players with defaultTeam and add them to the roster
  for (const player of players) {
    if (player.defaultTeam) {
      // Convert from Red/Blue to red/blue
      const team = player.defaultTeam.toLowerCase() as Team;
      roster[team].push(player.id);
      
      // Schedule removal of the legacy team property
      await millbrookDb.players.update(player.id, { 
        defaultTeam: undefined 
      });
    }
  }
  
  // Save the initial roster
  await millbrookDb.matchState.put({ 
    id: 'currentRoster', 
    roster 
  });
  
  return roster;
}

/**
 * Store to manage the match roster with red/blue team assignments
 */
export const useRosterStore = create<{
  roster: MatchRoster;
  setTeam: (id: string, team: Team) => void;
  remove: (id: string) => void;
  initialize: () => Promise<void>;
  resetRoster: () => void;
}>((set, get) => ({
  roster: { red: [], blue: [] },
  
  initialize: async () => {
    try {
      // Try to load roster from DB
      const savedState = await millbrookDb.matchState.get('currentRoster');
      
      if (savedState?.roster) {
        set({ roster: savedState.roster });
      } else {
        // If no roster exists, migrate from legacy teams
        const migratedRoster = await migrateLegacyTeams();
        set({ roster: migratedRoster });
      }
    } catch (error) {
      console.error('Failed to initialize roster:', error);
      set({ roster: { red: [], blue: [] } });
    }
  },
  
  setTeam: (id, team) => set(state => {
    // Remove from both teams first
    const red = state.roster.red.filter(playerId => playerId !== id);
    const blue = state.roster.blue.filter(playerId => playerId !== id);
    
    // Add to selected team
    const newRoster = { 
      red, 
      blue 
    };
    
    newRoster[team].push(id);
    
    // Persist to DB
    millbrookDb.matchState.put({ 
      id: 'currentRoster', 
      roster: newRoster 
    });
    
    return { roster: newRoster };
  }),
  
  remove: (id) => set(state => {
    const newRoster = {
      red: state.roster.red.filter(playerId => playerId !== id),
      blue: state.roster.blue.filter(playerId => playerId !== id)
    };
    
    // Persist to DB
    millbrookDb.matchState.put({ 
      id: 'currentRoster', 
      roster: newRoster 
    });
    
    return { roster: newRoster };
  }),
  
  resetRoster: () => set(() => {
    const newRoster = { red: [], blue: [] };
    millbrookDb.matchState.put({ id: 'currentRoster', roster: newRoster });
    return { roster: newRoster };
  })
})); 
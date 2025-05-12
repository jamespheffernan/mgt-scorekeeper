import { create } from 'zustand';
import { Player as RosterPlayer } from '../db/API-GameState';
import { Player as GamePlayer, Team as GameTeam } from '../store/gameStore';

// Type definitions for our store
interface SetupFlowState {
  // Player selection stage
  redTeamIds: string[];
  blueTeamIds: string[];
  
  // Course setup stage
  selectedCourseId: string;
  playerTeeIds: string[];
  bigGame: boolean;
  
  // Store actions
  setTeamPlayers: (redIds: string[], blueIds: string[]) => void;
  setCourseId: (id: string) => void;
  setPlayerTee: (playerIndex: number, teeId: string) => void;
  setAllTees: (teeIds: string[]) => void;
  setBigGame: (enabled: boolean) => void;
  reset: () => boolean;
  
  // Helper functions
  convertToGamePlayers: (rosterPlayers: RosterPlayer[]) => {
    players: GamePlayer[];
    teams: GameTeam[];
  };
}

// Initial state
const initialState = {
  redTeamIds: [],
  blueTeamIds: [],
  selectedCourseId: '',
  playerTeeIds: [],
  bigGame: false,
};

// Create the store
export const useSetupFlowStore = create<SetupFlowState>((set, get) => ({
  ...initialState,
  
  // Actions
  setTeamPlayers: (redIds, blueIds) => set({ redTeamIds: redIds, blueTeamIds: blueIds }),
  setCourseId: (id) => set({ selectedCourseId: id }),
  setPlayerTee: (playerIndex, teeId) => set(state => {
    const newTees = [...state.playerTeeIds];
    newTees[playerIndex] = teeId;
    return { playerTeeIds: newTees };
  }),
  setAllTees: (teeIds) => set({ playerTeeIds: teeIds }),
  setBigGame: (enabled) => set({ bigGame: enabled }),
  reset: () => {
    console.log('Resetting setupFlowStore to initial state...');
    console.log('Before reset:', get());
    set(initialState);
    console.log('After reset:', get());
    return true; // Indicate success
  },
  
  // Convert roster players to game players
  convertToGamePlayers: (rosterPlayers) => {
    const { redTeamIds, blueTeamIds } = get();
    const players: GamePlayer[] = [];
    const teams: GameTeam[] = [];
    
    // Add red team players
    redTeamIds.forEach(id => {
      const player = rosterPlayers.find(p => p.id === id);
      if (player) {
        players.push({
          id: player.id,
          name: player.name,
          index: player.index,
          first: player.first || '',
          last: player.last || '',
        });
        teams.push('Red');
      }
    });
    
    // Add blue team players
    blueTeamIds.forEach(id => {
      const player = rosterPlayers.find(p => p.id === id);
      if (player) {
        players.push({
          id: player.id,
          name: player.name,
          index: player.index,
          first: player.first || '',
          last: player.last || '',
        });
        teams.push('Blue');
      }
    });
    
    return { players, teams };
  }
})); 
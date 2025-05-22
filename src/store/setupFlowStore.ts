import { create } from 'zustand';
import { Player as RosterPlayer } from '../db/API-GameState';
import { Player as GamePlayer, Team as GameTeam } from '../store/gameStore';

// Type definitions for our store
interface SetupFlowState {
  // Player selection stage
  redTeamIds: string[];
  blueTeamIds: string[];
  
  // Ghost player state
  ghostPlayers: RosterPlayer[];
  addGhostPlayer: (ghost: RosterPlayer) => void;
  removeGhostPlayer: (ghostId: string) => void;
  getGhostPlayers: () => RosterPlayer[];
  
  // Course setup stage
  selectedCourseId: string;
  playerTeeIds: string[];
  bigGame: boolean;
  bigGameSpecificIndex?: number;
  
  // Store actions
  setTeamPlayers: (redIds: string[], blueIds: string[]) => void;
  setCourseId: (id: string) => void;
  setPlayerTee: (playerIndex: number, teeId: string) => void;
  setAllTees: (teeIds: string[]) => void;
  setBigGame: (enabled: boolean) => void;
  setBigGameSpecificIndex: (index?: number) => void;
  reset: () => void;
  
  // Helper functions
  convertToGamePlayers: (rosterPlayers: RosterPlayer[], ghostPlayers?: RosterPlayer[]) => {
    players: GamePlayer[];
    teams: GameTeam[];
  };
}

// Initial state
const initialState = {
  redTeamIds: [],
  blueTeamIds: [],
  ghostPlayers: [],
  selectedCourseId: '',
  playerTeeIds: ['', '', '', ''],
  bigGame: true,
  bigGameSpecificIndex: undefined,
};

// Create the store
export const useSetupFlowStore = create<SetupFlowState>((set, get) => ({
  ...initialState,
  
  // Ghost player actions
  addGhostPlayer: (ghost) => set(state => ({ ghostPlayers: [...state.ghostPlayers, ghost] })),
  removeGhostPlayer: (ghostId) => set(state => ({ ghostPlayers: state.ghostPlayers.filter(g => g.id !== ghostId) })),
  getGhostPlayers: () => get().ghostPlayers,
  
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
  setBigGameSpecificIndex: (index?: number) => set({ bigGameSpecificIndex: index }),
  reset: () => set({...initialState, bigGameSpecificIndex: undefined }),
  
  // Convert roster players to game players (now supports ghosts)
  convertToGamePlayers: (rosterPlayers, ghostPlayers = []) => {
    const { redTeamIds, blueTeamIds } = get();
    const players: GamePlayer[] = [];
    const teams: GameTeam[] = [];
    // Helper to find player by ID (ghosts take precedence)
    const findPlayer = (id: string) =>
      ghostPlayers.find(g => g.id === id) || rosterPlayers.find(p => p.id === id);
    // Add red team players
    redTeamIds.forEach(id => {
      const player = findPlayer(id);
      if (player) {
        players.push({
          id: player.id,
          name: player.name,
          index: player.index,
          first: player.first || '',
          last: player.last || '',
          isGhost: (player as any).isGhost || false,
          sourcePlayerId: (player as any).sourcePlayerId || undefined,
        });
        teams.push('Red');
      }
    });
    // Add blue team players
    blueTeamIds.forEach(id => {
      const player = findPlayer(id);
      if (player) {
        players.push({
          id: player.id,
          name: player.name,
          index: player.index,
          first: player.first || '',
          last: player.last || '',
          isGhost: (player as any).isGhost || false,
          sourcePlayerId: (player as any).sourcePlayerId || undefined,
        });
        teams.push('Blue');
      }
    });
    return { players, teams };
  }
})); 
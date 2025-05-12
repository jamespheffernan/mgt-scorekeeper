import { act } from 'react-dom/test-utils';
import { useRosterStore, migrateLegacyTeams } from '../store/rosterStore';
import { millbrookDb } from '../db/millbrookDb';

// Mock the Dexie database
jest.mock('../db/millbrookDb', () => ({
  millbrookDb: {
    getAllPlayers: jest.fn(),
    players: {
      update: jest.fn()
    },
    matchState: {
      get: jest.fn(),
      put: jest.fn()
    }
  }
}));

describe('Roster Store', () => {
  beforeEach(() => {
    // Reset the store state
    act(() => {
      useRosterStore.setState({ roster: { red: [], blue: [] } });
    });
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  test('should initialize with empty roster', () => {
    const state = useRosterStore.getState();
    expect(state.roster).toEqual({ red: [], blue: [] });
  });
  
  test('should add player to team', () => {
    const { setTeam } = useRosterStore.getState();
    
    act(() => {
      setTeam('player1', 'red');
    });
    
    const state = useRosterStore.getState();
    expect(state.roster.red).toContain('player1');
    expect(state.roster.blue).not.toContain('player1');
    expect(millbrookDb.matchState.put).toHaveBeenCalledWith({ 
      id: 'currentRoster', 
      roster: { red: ['player1'], blue: [] } 
    });
  });
  
  test('should move player between teams', () => {
    const { setTeam } = useRosterStore.getState();
    
    act(() => {
      setTeam('player1', 'red');
      setTeam('player2', 'blue');
    });
    
    let state = useRosterStore.getState();
    expect(state.roster.red).toEqual(['player1']);
    expect(state.roster.blue).toEqual(['player2']);
    
    // Move player1 from red to blue
    act(() => {
      setTeam('player1', 'blue');
    });
    
    state = useRosterStore.getState();
    expect(state.roster.red).toEqual([]);
    expect(state.roster.blue).toEqual(['player2', 'player1']);
  });
  
  test('should remove player from roster', () => {
    const { setTeam, remove } = useRosterStore.getState();
    
    act(() => {
      setTeam('player1', 'red');
      setTeam('player2', 'blue');
    });
    
    act(() => {
      remove('player1');
    });
    
    const state = useRosterStore.getState();
    expect(state.roster.red).toEqual([]);
    expect(state.roster.blue).toEqual(['player2']);
    expect(millbrookDb.matchState.put).toHaveBeenCalledWith({ 
      id: 'currentRoster', 
      roster: { red: [], blue: ['player2'] } 
    });
  });
  
  test('should migrate legacy teams', async () => {
    // Mock players with legacy team data
    (millbrookDb.getAllPlayers as jest.Mock).mockResolvedValue([
      { id: 'player1', name: 'Player 1', defaultTeam: 'Red' },
      { id: 'player2', name: 'Player 2', defaultTeam: 'Blue' },
      { id: 'player3', name: 'Player 3' } // No team
    ]);
    
    const result = await migrateLegacyTeams();
    
    // Should convert capitalized Red/Blue to lowercase red/blue
    expect(result).toEqual({
      red: ['player1'],
      blue: ['player2']
    });
    
    // Should clear the legacy team field
    expect(millbrookDb.players.update).toHaveBeenCalledWith('player1', { defaultTeam: undefined });
    expect(millbrookDb.players.update).toHaveBeenCalledWith('player2', { defaultTeam: undefined });
    
    // Should save the migrated roster
    expect(millbrookDb.matchState.put).toHaveBeenCalledWith({ 
      id: 'currentRoster', 
      roster: { red: ['player1'], blue: ['player2'] } 
    });
  });
  
  test('should initialize from stored roster', async () => {
    // Mock stored roster
    (millbrookDb.matchState.get as jest.Mock).mockResolvedValue({
      id: 'currentRoster',
      roster: { red: ['player1', 'player3'], blue: ['player2'] }
    });
    
    const { initialize } = useRosterStore.getState();
    await initialize();
    
    const state = useRosterStore.getState();
    expect(state.roster).toEqual({
      red: ['player1', 'player3'],
      blue: ['player2']
    });
    
    // Should not call migrateLegacyTeams if stored roster exists
    expect(millbrookDb.getAllPlayers).not.toHaveBeenCalled();
  });
}); 
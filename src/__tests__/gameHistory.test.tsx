import { act } from '@testing-library/react';
import { useGameStore } from '../store/gameStore';
import { millbrookDb } from '../db/millbrookDb';
import { Team } from '../db/API-GameState';

// Mock the DB functions
jest.mock('../db/millbrookDb', () => ({
  millbrookDb: {
    saveGameState: jest.fn().mockResolvedValue(undefined),
    saveMatch: jest.fn().mockResolvedValue(undefined),
    saveGameHistory: jest.fn().mockResolvedValue(undefined),
    getCourse: jest.fn().mockResolvedValue({ name: 'Test Course' }),
    savePlayer: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Game History and End Game Features', () => {
  const mockPlayer1 = { id: 'p1', first: 'Player', last: '1', name: 'Player 1', index: 10 };
  const mockPlayer2 = { id: 'p2', first: 'Player', last: '2', name: 'Player 2', index: 15 };
  const mockPlayer3 = { id: 'p3', first: 'Player', last: '3', name: 'Player 3', index: 8 };
  const mockPlayer4 = { id: 'p4', first: 'Player', last: '4', name: 'Player 4', index: 12 };
  
  const mockPlayers = [mockPlayer1, mockPlayer2, mockPlayer3, mockPlayer4];
  const mockTeams: Team[] = ['Red', 'Red', 'Blue', 'Blue'];

  beforeEach(() => {
    // Reset the store before each test
    const store = useGameStore.getState();
    store.resetGame();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('finishRound()', () => {
    it('should mark the match as finished and save game history', async () => {
      // Setup - create a match
      const store = useGameStore.getState();
      
      // Create a match
      store.createMatch(mockPlayers, mockTeams, {
        bigGame: true,
        courseId: 'test-course',
        playerTeeIds: ['t1', 't2', 't3', 't4']
      });
      
      // Mock some ledger data
      const initialState = useGameStore.getState();
      useGameStore.setState({
        ...initialState,
        ledger: [{
          hole: 1,
          base: 1,
          carryAfter: 0,
          doubles: 0,
          payout: 2,
          runningTotals: [1, 1, -1, -1]
        }]
      });
      
      // Execute - finish the round
      await act(async () => {
        await store.finishRound();
      });
      
      // Verify
      const state = useGameStore.getState();
      expect(state.match.state).toBe('finished');
      expect(state.match.endTime).toBeDefined();
      
      // Verify DB calls
      expect(millbrookDb.saveMatch).toHaveBeenCalledTimes(1);
      expect(millbrookDb.saveGameState).toHaveBeenCalledTimes(2);
      expect(millbrookDb.saveGameHistory).toHaveBeenCalledTimes(1);
      
      // Verify that game history contains correct data
      const historyCall = (millbrookDb.saveGameHistory as jest.Mock).mock.calls[0][0];
      
      // Check for playerInfo instead of playerNames/teamAssignments
      expect(historyCall.playerInfo).toBeDefined();
      expect(historyCall.playerInfo.length).toBe(4);
      expect(historyCall.playerInfo[0].first).toBe('Player');
      expect(historyCall.playerInfo[0].last).toBe('1');
      expect(historyCall.playerInfo[0].team).toBe('Red');
      
      // For backward compatibility, verify these are also set correctly
      if (historyCall.playerNames) {
        expect(historyCall.playerNames).toEqual(['Player 1', 'Player 2', 'Player 3', 'Player 4']);
      }
      if (historyCall.teamAssignments) {
        expect(historyCall.teamAssignments).toEqual(['Red', 'Red', 'Blue', 'Blue']);
      }
      
      expect(historyCall.teamTotals).toEqual([2, -2]); // Updated: Red team up 2, Blue team down 2
      expect(historyCall.isComplete).toBe(true);
    });
  });

  describe('cancelMatch()', () => {
    it('should mark the match as finished but set isComplete to false', async () => {
      // Setup - create a match
      const store = useGameStore.getState();
      
      // Create a match
      store.createMatch(mockPlayers, mockTeams, {
        bigGame: false,
        courseId: 'test-course',
        playerTeeIds: ['t1', 't2', 't3', 't4']
      });
      
      // Execute - cancel the match
      await act(async () => {
        await store.cancelMatch();
      });
      
      // Verify
      const state = useGameStore.getState();
      expect(state.match.state).toBe('finished');
      expect(state.match.endTime).toBeDefined();
      
      // Verify DB calls
      expect(millbrookDb.saveMatch).toHaveBeenCalledTimes(1);
      expect(millbrookDb.saveGameHistory).toHaveBeenCalledTimes(1);
      
      // Verify that game history contains correct data 
      const historyCall = (millbrookDb.saveGameHistory as jest.Mock).mock.calls[0][0];
      
      // Check for playerInfo instead of playerNames/teamAssignments
      expect(historyCall.playerInfo).toBeDefined();
      expect(historyCall.playerInfo.length).toBe(4);
      
      // For backward compatibility, verify legacy fields
      if (historyCall.playerNames) {
        expect(historyCall.playerNames).toEqual(['Player 1', 'Player 2', 'Player 3', 'Player 4']);
      }
      if (historyCall.teamAssignments) {
        expect(historyCall.teamAssignments).toEqual(['Red', 'Red', 'Blue', 'Blue']);
      }
      // finalScores is not set in the new logic for cancelled games
      // if (historyCall.finalScores) {
      //   expect(historyCall.finalScores).toEqual([0, 0, 0, 0]);
      // }
      expect(historyCall.isComplete).toBe(false);
    });
  });
  
  describe('resetGame()', () => {
    it('should reset the game state to defaults', () => {
      // Setup - create a match
      const store = useGameStore.getState();
      
      // Create a match
      store.createMatch(mockPlayers, mockTeams, {
        bigGame: true,
        courseId: 'test-course',
        playerTeeIds: ['t1', 't2', 't3', 't4']
      });
      
      // Execute - reset the game
      store.resetGame();
      
      // Verify
      const state = useGameStore.getState();
      expect(state.match.id).toBe('');
      expect(state.players).toHaveLength(0);
      expect(state.holeScores).toHaveLength(0);
      expect(state.ledger).toHaveLength(0);
    });
  });
}); 
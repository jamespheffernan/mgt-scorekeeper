import { useGameStore } from '../gameStore';
import { Player, Team } from '../../db/API-GameState';

describe('Ghost Reveal Functionality', () => {
  const mockPlayers: Player[] = [
    { id: '1', name: 'Alice', first: 'Alice', last: 'Smith', index: 10, isGhost: false },
    { id: 'ghost-2', name: 'Ghost (Bob)', first: 'Ghost', last: '(Bob)', index: 15, isGhost: true, sourcePlayerId: '2' },
    { id: '3', name: 'Charlie', first: 'Charlie', last: 'Brown', index: 8, isGhost: false },
    { id: 'ghost-4', name: 'Ghost (David)', first: 'Ghost', last: '(David)', index: 12, isGhost: true, sourcePlayerId: '4' }
  ];

  const mockTeams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
  
  const mockMatchOptions = {
    bigGame: false,
    courseId: 'test-course',
    playerTeeIds: ['tee1', 'tee1', 'tee1', 'tee1'] as [string, string, string, string]
  };

  beforeEach(() => {
    // Reset the store
    useGameStore.getState().resetGame();
  });

  describe('Ghost Reveal State Management', () => {
    it('should initialize ghost reveal state as empty for all ghosts', async () => {
      const { createMatch, ghostRevealState } = useGameStore.getState();
      
      await createMatch(mockPlayers, mockTeams, { bigGame: false });
      
      const state = useGameStore.getState();
      
      // Should have reveal state for ghost players
      expect(state.ghostRevealState).toHaveProperty('ghost-2');
      expect(state.ghostRevealState).toHaveProperty('ghost-4');
      
      // All holes should be hidden initially
      expect(state.ghostRevealState['ghost-2'].size).toBe(0);
      expect(state.ghostRevealState['ghost-4'].size).toBe(0);
    });

    it('should reveal individual ghost scores', async () => {
      const { createMatch, revealGhostScore, isGhostScoreRevealed } = useGameStore.getState();
      
      await createMatch(mockPlayers, mockTeams, { bigGame: false });
      
      // Initially hidden
      expect(isGhostScoreRevealed('ghost-2', 1)).toBe(false);
      
      // Reveal hole 1 for ghost-2
      revealGhostScore('ghost-2', 1);
      
      expect(isGhostScoreRevealed('ghost-2', 1)).toBe(true);
      expect(isGhostScoreRevealed('ghost-2', 2)).toBe(false);
      expect(isGhostScoreRevealed('ghost-4', 1)).toBe(false);
    });

    it('should hide revealed ghost scores', async () => {
      const { createMatch, revealGhostScore, hideGhostScore, isGhostScoreRevealed } = useGameStore.getState();
      
      await createMatch(mockPlayers, mockTeams, { bigGame: false });
      
      // Reveal and then hide
      revealGhostScore('ghost-2', 1);
      expect(isGhostScoreRevealed('ghost-2', 1)).toBe(true);
      
      hideGhostScore('ghost-2', 1);
      expect(isGhostScoreRevealed('ghost-2', 1)).toBe(false);
    });

    it('should reveal all holes for a ghost', async () => {
      const { createMatch, revealAllGhostScores, isGhostScoreRevealed } = useGameStore.getState();
      
      await createMatch(mockPlayers, mockTeams, { bigGame: false });
      
      // Reveal all holes for ghost-2
      revealAllGhostScores('ghost-2');
      
      // Check several holes are revealed
      expect(isGhostScoreRevealed('ghost-2', 1)).toBe(true);
      expect(isGhostScoreRevealed('ghost-2', 9)).toBe(true);
      expect(isGhostScoreRevealed('ghost-2', 18)).toBe(true);
      
      // Other ghost should still be hidden
      expect(isGhostScoreRevealed('ghost-4', 1)).toBe(false);
    });

    it('should handle reveal state for non-existent ghost players gracefully', () => {
      const { isGhostScoreRevealed } = useGameStore.getState();
      
      // Should return false for non-existent ghost
      expect(isGhostScoreRevealed('non-existent', 1)).toBe(false);
    });

    it('should persist reveal state across store updates', async () => {
      const { createMatch, revealGhostScore, isGhostScoreRevealed } = useGameStore.getState();
      
      await createMatch(mockPlayers, mockTeams, { bigGame: false });
      
      // Reveal some holes
      revealGhostScore('ghost-2', 1);
      revealGhostScore('ghost-2', 5);
      revealGhostScore('ghost-4', 3);
      
      // Check state is preserved
      expect(isGhostScoreRevealed('ghost-2', 1)).toBe(true);
      expect(isGhostScoreRevealed('ghost-2', 5)).toBe(true);
      expect(isGhostScoreRevealed('ghost-4', 3)).toBe(true);
      expect(isGhostScoreRevealed('ghost-2', 2)).toBe(false);
    });
  });

  describe('Integration with Game Flow', () => {
    it('should maintain reveal state during score entry', async () => {
      const { createMatch, revealGhostScore, enterHoleScores, isGhostScoreRevealed } = useGameStore.getState();
      
      await createMatch(mockPlayers, mockTeams, { bigGame: false });
      
      // Reveal hole 1 for ghost-2
      revealGhostScore('ghost-2', 1);
      
      // Enter scores for hole 1
      const junkFlags = Array(4).fill({
        hadBunkerShot: false,
        isOnGreenFromTee: false,
        isClosestOnGreen: false,
        hadThreePutts: false,
        isLongDrive: false
      });
      
      await enterHoleScores(1, [4, 5, 3, 6], junkFlags);
      
      // Reveal state should be preserved
      expect(isGhostScoreRevealed('ghost-2', 1)).toBe(true);
      expect(isGhostScoreRevealed('ghost-4', 1)).toBe(false);
    });

    it('should reset reveal state when game is reset', async () => {
      const { createMatch, revealGhostScore, resetGame, isGhostScoreRevealed } = useGameStore.getState();
      
      await createMatch(mockPlayers, mockTeams, { bigGame: false });
      
      // Reveal some holes
      revealGhostScore('ghost-2', 1);
      revealGhostScore('ghost-4', 5);
      
      // Reset game
      resetGame();
      
      // Ghost reveal state should be empty
      const state = useGameStore.getState();
      expect(Object.keys(state.ghostRevealState)).toHaveLength(0);
    });
  });

  describe('Persistence and Serialization', () => {
    it('should handle ghost reveal state when Sets are serialized as arrays', () => {
      const store = useGameStore.getState();
      
      // Create a match with ghosts
      store.createMatch(mockPlayers, mockTeams, mockMatchOptions);
      
      // Reveal some scores normally
      store.revealGhostScore('ghost-2', 1);
      store.revealGhostScore('ghost-2', 3);
      
      // Verify normal Set behavior works
      expect(store.isGhostScoreRevealed('ghost-2', 1)).toBe(true);
      expect(store.isGhostScoreRevealed('ghost-2', 3)).toBe(true);
      expect(store.isGhostScoreRevealed('ghost-2', 2)).toBe(false);
      
      // Simulate what happens when data is persisted and reloaded
      // Sets get serialized as arrays in localStorage
      // We'll use a type assertion to simulate the corrupted state
      useGameStore.setState({
        ghostRevealState: {
          'ghost-2': [1, 3] as any // Array instead of Set (simulate persistence corruption)
        }
      });
      
      // Verify that the functions still work with array data
      expect(store.isGhostScoreRevealed('ghost-2', 1)).toBe(true);
      expect(store.isGhostScoreRevealed('ghost-2', 3)).toBe(true);
      expect(store.isGhostScoreRevealed('ghost-2', 2)).toBe(false);
      
      // Verify that reveal/hide operations convert back to Sets
      store.revealGhostScore('ghost-2', 5);
      expect(store.isGhostScoreRevealed('ghost-2', 5)).toBe(true);
      
      store.hideGhostScore('ghost-2', 1);
      expect(store.isGhostScoreRevealed('ghost-2', 1)).toBe(false);
      expect(store.isGhostScoreRevealed('ghost-2', 3)).toBe(true);
    });

    it('should handle empty or undefined ghost reveal state', () => {
      const store = useGameStore.getState();
      
      // Test with completely empty state
      expect(store.isGhostScoreRevealed('nonexistent-ghost', 1)).toBe(false);
      
      // Create a match
      store.createMatch(mockPlayers, mockTeams, mockMatchOptions);
      
      // Test with ghost that has no reveal state yet
      expect(store.isGhostScoreRevealed('ghost-2', 1)).toBe(false);
      
      // Simulate corrupted state
      useGameStore.setState({
        ...useGameStore.getState(),
        ghostRevealState: {
          'ghost-2': null as any
        }
      });
      
      expect(store.isGhostScoreRevealed('ghost-2', 1)).toBe(false);
      
      // Should still be able to reveal after corrupted state
      store.revealGhostScore('ghost-2', 1);
      expect(store.isGhostScoreRevealed('ghost-2', 1)).toBe(true);
    });
  });
}); 
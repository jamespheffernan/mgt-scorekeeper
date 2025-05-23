import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlayersFourBox } from '../PlayersFourBox';
import { useGameStore } from '../../../../store/gameStore';

// Mock the game store
jest.mock('../../../../store/gameStore');
const mockUseGameStore = useGameStore as jest.MockedFunction<typeof useGameStore>;

describe('PlayersFourBox Score Display', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should display par for human players when gross score is 0', () => {
    // Mock store state with human players having 0 gross scores
    const mockState = {
      players: [
        { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A', isGhost: false },
        { id: 'p2', name: 'Bob', index: 12, first: 'Bob', last: 'B', isGhost: false },
        { id: 'g1', name: 'Ghost (Carol)', index: 8, isGhost: true, sourcePlayerId: 'p3' },
        { id: 'g2', name: 'Ghost (Dan)', index: 15, isGhost: true, sourcePlayerId: 'p4' }
      ],
      playerTeams: ['Red', 'Blue', 'Red', 'Blue'],
      match: {
        currentHole: 1,
        holePar: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
      },
      holeScores: [
        {
          hole: 1,
          gross: [0, 0, 5, 6], // Human players have 0, ghosts have generated scores
          net: [0, 0, 4, 5],
          teamNet: [0, 4]
        }
      ],
      ghostJunkEvents: {},
      revealGhostScore: jest.fn(),
      isGhostScoreRevealed: jest.fn().mockReturnValue(false)
    };

    mockUseGameStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      // Handle destructuring calls like { revealGhostScore, isGhostScoreRevealed }
      return {
        revealGhostScore: jest.fn(),
        isGhostScoreRevealed: jest.fn().mockReturnValue(false)
      };
    });

    const mockProps = {
      onScoreChange: jest.fn(),
      onJunkChange: jest.fn(),
      playerPars: [4, 4, 4, 4], // All players have par 4
      playerYardages: [400, 400, 400, 400],
      playerStrokeIndexes: [1, 2, 3, 4],
      playerStrokes: [0, 1, 0, 1],
      bigGameStrokesOnHole: [0, 0, 0, 0]
    };

    const { container } = render(<PlayersFourBox {...mockProps} />);

    // Check that human players (Alice and Bob) show "Gross 4" (par) instead of "Gross 0"
    const scoreTexts = container.querySelectorAll('.player-card-score-text');
    
    // Alice (index 0) should show par 4, not 0
    expect(scoreTexts[0]).toHaveTextContent('Gross 4');
    
    // Bob (index 1) should show par 4, not 0  
    expect(scoreTexts[1]).toHaveTextContent('Gross 4');
    
    // Ghost players should show their generated scores (5 and 6)
    // But they might be hidden, so we won't test those here
  });

  it('should display actual scores for human players when scores are entered', () => {
    // Mock store state with human players having actual scores
    const mockState = {
      players: [
        { id: 'p1', name: 'Alice', index: 10, first: 'Alice', last: 'A', isGhost: false },
        { id: 'p2', name: 'Bob', index: 12, first: 'Bob', last: 'B', isGhost: false }
      ],
      playerTeams: ['Red', 'Blue'],
      match: {
        currentHole: 1,
        holePar: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
      },
      holeScores: [
        {
          hole: 1,
          gross: [3, 5], // Alice has birdie, Bob has bogey
          net: [3, 4],
          teamNet: [3, 4]
        }
      ],
      ghostJunkEvents: {},
      revealGhostScore: jest.fn(),
      isGhostScoreRevealed: jest.fn().mockReturnValue(false)
    };

    mockUseGameStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      // Handle destructuring calls like { revealGhostScore, isGhostScoreRevealed }
      return {
        revealGhostScore: jest.fn(),
        isGhostScoreRevealed: jest.fn().mockReturnValue(false)
      };
    });

    const mockProps = {
      onScoreChange: jest.fn(),
      onJunkChange: jest.fn(),
      playerPars: [4, 4],
      playerYardages: [400, 400],
      playerStrokeIndexes: [1, 2],
      playerStrokes: [0, 1],
      bigGameStrokesOnHole: [0, 0]
    };

    const { container } = render(<PlayersFourBox {...mockProps} />);

    const scoreTexts = container.querySelectorAll('.player-card-score-text');
    
    // Alice should show her actual birdie score
    expect(scoreTexts[0]).toHaveTextContent('Gross 3');
    
    // Bob should show his actual bogey score
    expect(scoreTexts[1]).toHaveTextContent('Gross 5');
  });
}); 
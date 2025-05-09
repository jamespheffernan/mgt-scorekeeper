// import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
// import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import { useGameStore } from '../store/gameStore';
import { PlayersFourBox } from '../components/hole/mobile/PlayersFourBox';

// Mock the gameStore to avoid randomUUID issues
jest.mock('../store/gameStore', () => ({
  useGameStore: jest.fn()
}));

// Create a helper to initialise the store for tests
const setupStoreForTest = () => {
  const samplePlayers = [
    { id: 'p1', name: 'Jimmy', index: 0 },
    { id: 'p2', name: 'Fred', index: 0 },
    { id: 'p3', name: 'Neil', index: 0 },
    { id: 'p4', name: 'Oliver', index: 0 }
  ];

  (useGameStore as unknown as jest.Mock).mockImplementation((selector) => {
    if (selector === undefined) return {};
    return selector({
      players: samplePlayers,
      playerTeams: ['Red', 'Blue', 'Red', 'Blue'],
      match: { 
        currentHole: 3, 
        holePar: [4, 4, 5, 3, 4, 4, 4, 3, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5] 
      },
      holeScores: [] // Empty for testing
    });
  });
};

describe('PlayersFourBox', () => {
  beforeEach(() => {
    setupStoreForTest();
  });

  // Mock callback functions
  const mockScoreChange = jest.fn();
  const mockJunkChange = jest.fn();

  // Sample props required by PlayersFourBox
  const samplePars = [4, 4, 4, 4];
  const sampleYardages = [400, 405, 390, 410];
  const sampleStrokeIndexes = [1, 2, 3, 4];
  const sampleStrokes = [0, 0, 0, 0];

  it('renders four player cards', () => {
    render(
      <PlayersFourBox 
        onScoreChange={mockScoreChange} 
        onJunkChange={mockJunkChange} 
        playerPars={samplePars}
        playerYardages={sampleYardages}
        playerStrokeIndexes={sampleStrokeIndexes}
        playerStrokes={sampleStrokes}
      />
    );
    const cards = screen.getAllByTestId('player-card');
    expect(cards).toHaveLength(4);
  });

  it('opens bottom sheet when a player card is clicked', () => {
    render(
      <PlayersFourBox 
        onScoreChange={mockScoreChange} 
        onJunkChange={mockJunkChange} 
        playerPars={samplePars}
        playerYardages={sampleYardages}
        playerStrokeIndexes={sampleStrokeIndexes}
        playerStrokes={sampleStrokes}
      />
    );
    const jimmyCard = screen.getByText('Jimmy');
    fireEvent.click(jimmyCard);
    expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
  });
}); 
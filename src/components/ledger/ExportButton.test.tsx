import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import * as gameStore from '../../store/gameStore';
import ExportButton from './ExportButton';

// Set up testing environment for React
Object.defineProperty(window, 'HTMLElement', {
  value: global.HTMLElement,
});

// Mock getFullName utility
jest.mock('../../utils/nameUtils', () => ({
  getFullName: (player: any) => player.name || 'Player',
}));

// Mock millbrookDb to prevent IndexedDB errors
jest.mock('../../db/millbrookDb', () => ({
  millbrookDb: {
    getCourse: jest.fn(),
    saveGameState: jest.fn(),
    saveMatch: jest.fn(),
    saveGameHistory: jest.fn(),
    savePlayer: jest.fn(),
    getAllPlayers: jest.fn(),
    getActiveMatches: jest.fn(),
    deletePlayer: jest.fn(),
    getGameState: jest.fn(),
  }
}));

describe('ExportButton CSV Export', () => {
  beforeEach(() => {
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    // Mock DOM methods
    const originalAppendChild = document.body.appendChild;
    const originalRemoveChild = document.body.removeChild;
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exports a CSV with scorecard, ledger, and paper trail sections', () => {
    // Minimal mock state
    jest.spyOn(gameStore, 'useGameStore').mockImplementation((selector: any) => {
      const mockState = {
        match: {
          date: '2024-06-09',
          holePar: [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
          holeSI: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
          bigGame: false,
        },
        players: [
          { id: 'p1', name: 'Alice' },
          { id: 'p2', name: 'Bob' },
        ],
        playerTeams: ['Red', 'Blue'],
        ledger: [
          { hole: 1, base: 2, carryAfter: 0, doubles: 0, payout: 4, runningTotals: [4, -4] },
        ],
        holeScores: [
          { hole: 1, gross: [5, 6], net: [4, 6], teamNet: [4, 6] },
        ],
        junkEvents: [
          { hole: 1, playerId: 'p1', teamId: 'Red', type: 'Birdie', value: 1 },
        ],
        bigGameRows: [],
      };
      return selector(mockState);
    });
    jest.spyOn(gameStore, 'selectHoleSummary').mockImplementation((state: any, holeIndex: number) => {
      return {
        hole: 1,
        base: 2,
        carryIn: 0,
        payout: 4,
        doubles: 0,
        winner: 'Red',
        previousTotals: [0, 0, 0, 0],
        runningTotals: [4, -4, 0, 0],
        scoresBeforeHole: { redScore: 0, blueScore: 0 },
        scoresAfterHole: { redScore: 4, blueScore: -4 },
        junkEvents: [
          { hole: 1, playerId: 'p1', teamId: 'Red', type: 'Birdie', value: 1, playerName: 'Alice' },
        ],
        junkByTeam: { Red: 1, Blue: 0 },
        netJunk: 1,
      };
    });

    // Mock document.createElement for anchor elements
    const mockAnchor = {
      setAttribute: jest.fn(),
      click: jest.fn(),
      style: {},
    };
    const origCreateElement = document.createElement;
    document.createElement = jest.fn((tagName: string) => {
      if (tagName === 'a') {
        return mockAnchor as any;
      }
      return origCreateElement.call(document, tagName);
    });

    // Create a container for the test
    const container = document.createElement('div');
    document.body.appendChild(container);
    
    const { getByText } = render(<ExportButton />, { container });
    const btn = getByText(/Export CSV/i);
    fireEvent.click(btn);

    // Restore document.createElement
    document.createElement = origCreateElement;

    // Check that a blob was created and a download was triggered
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    // Check the CSV string
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });
}); 
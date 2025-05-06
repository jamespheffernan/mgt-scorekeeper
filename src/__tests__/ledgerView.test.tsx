import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LedgerView } from '../components/ledger/LedgerView';
import { useGameStore } from '../store/gameStore';

// Mock the gameStore
jest.mock('../store/gameStore', () => ({
  useGameStore: jest.fn()
}));

describe('LedgerView', () => {
  // Define mock data
  const mockMatch = {
    id: '123',
    date: new Date().toISOString(),
    bigGame: true,
    currentHole: 5,
    base: 4,
    doubles: 1,
    carry: 2,
    bigGameTotal: 42
  };

  const mockPlayers = [
    { id: 'p1', name: 'Alice', index: 8.4 },
    { id: 'p2', name: 'Bob', index: 12.7 },
    { id: 'p3', name: 'Charlie', index: 6.1 },
    { id: 'p4', name: 'Dave', index: 9.8 }
  ];

  const mockPlayerTeams = ['Red', 'Red', 'Blue', 'Blue'];

  const mockLedger = [
    { 
      hole: 1, 
      base: 1, 
      carryAfter: 0, 
      doubles: 0, 
      payout: 2, 
      runningTotals: [1, 1, -1, -1] 
    },
    { 
      hole: 2, 
      base: 2, 
      carryAfter: 0, 
      doubles: 0, 
      payout: 4, 
      runningTotals: [3, 3, -3, -3] 
    },
    { 
      hole: 3, 
      base: 2, 
      carryAfter: 2, 
      doubles: 0, 
      payout: 0, 
      runningTotals: [3, 3, -3, -3] 
    },
    { 
      hole: 4, 
      base: 4, 
      carryAfter: 0, 
      doubles: 1, 
      payout: 10, 
      runningTotals: [-2, -2, 2, 2] 
    }
  ];

  const mockJunkEvents = [
    { hole: 1, playerId: 'p1', type: 'Birdie', value: 1 },
    { hole: 2, playerId: 'p3', type: 'Greenie', value: 2 },
    { hole: 4, playerId: 'p2', type: 'Sandie', value: 4 }
  ];

  const mockBigGameRows = [
    { hole: 1, bestNet: [3, 4], subtotal: 7 },
    { hole: 2, bestNet: [4, 5], subtotal: 9 },
    { hole: 3, bestNet: [3, 4], subtotal: 7 },
    { hole: 4, bestNet: [4, 5], subtotal: 9 }
  ];

  const mockHoleScores = [
    { hole: 1, gross: [4, 5, 5, 6], net: [3, 4, 4, 5], teamNet: [3, 4] },
    { hole: 2, gross: [5, 5, 4, 5], net: [4, 4, 3, 4], teamNet: [4, 3] },
    { hole: 3, gross: [4, 5, 4, 5], net: [3, 4, 3, 4], teamNet: [3, 3] },
    { hole: 4, gross: [5, 6, 4, 5], net: [4, 5, 3, 4], teamNet: [4, 3] }
  ];

  // Setup for each test
  beforeEach(() => {
    // Mock the store with our test data
    (useGameStore as jest.Mock).mockImplementation(selector => {
      const state = {
        match: mockMatch,
        players: mockPlayers,
        playerTeams: mockPlayerTeams,
        ledger: mockLedger,
        junkEvents: mockJunkEvents,
        bigGameRows: mockBigGameRows,
        holeScores: mockHoleScores
      };
      return selector(state);
    });
  });

  test('TC-Ledger-01: Renders ledger header with correct team totals', () => {
    render(<LedgerView />);
    
    // Check that team totals are displayed
    expect(screen.getByText(/Red/)).toBeInTheDocument();
    expect(screen.getByText(/Blue/)).toBeInTheDocument();
    
    // Check that the Big Game total is displayed when enabled
    expect(screen.getByText(/Big Game: 42/)).toBeInTheDocument();
  });

  test('TC-Ledger-02: Toggles between collapsed and expanded state', () => {
    render(<LedgerView />);
    
    // Initially the drawer should be collapsed
    expect(screen.queryByText('Show Detailed View')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(screen.getByText('Running Totals'));
    
    // Now the controls should be visible
    expect(screen.getByText('Show Detailed View')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(screen.getByText('Running Totals'));
    
    // Controls should be hidden again
    expect(screen.queryByText('Show Detailed View')).not.toBeInTheDocument();
  });

  test('TC-Ledger-03: Toggles between compact and detailed view', () => {
    render(<LedgerView />);
    
    // Expand the drawer
    fireEvent.click(screen.getByText('Running Totals'));
    
    // Initially should be in compact view
    expect(screen.getByText('Show Detailed View')).toBeInTheDocument();
    
    // Switch to detailed view
    fireEvent.click(screen.getByText('Show Detailed View'));
    
    // Button text should change
    expect(screen.getByText('Show Compact View')).toBeInTheDocument();
    
    // Switch back to compact view
    fireEvent.click(screen.getByText('Show Compact View'));
    
    // Button text should change back
    expect(screen.getByText('Show Detailed View')).toBeInTheDocument();
  });

  test('TC-Ledger-04: Shows Big Game column when enabled', () => {
    render(<LedgerView />);
    
    // Expand the drawer
    fireEvent.click(screen.getByText('Running Totals'));
    
    // Big Game column should be visible
    expect(screen.getAllByText('Big Game').length).toBeGreaterThan(0);
  });

  test('TC-Ledger-05: Displays per-hole payouts correctly', () => {
    render(<LedgerView />);
    
    // Expand the drawer
    fireEvent.click(screen.getByText('Running Totals'));
    
    // Check the payout for hole 4
    expect(screen.getByText('$10')).toBeInTheDocument();
  });

  test('TC-Ledger-06: Displays running totals correctly', () => {
    render(<LedgerView />);
    
    // Expand the drawer
    fireEvent.click(screen.getByText('Running Totals'));
    
    // Final running totals should be displayed
    const finalTotals = mockLedger[mockLedger.length - 1].runningTotals;
    expect(screen.getByText(`Alice: -$2`)).toBeInTheDocument();
    expect(screen.getByText(`Bob: -$2`)).toBeInTheDocument();
    expect(screen.getByText(`Charlie: +$2`)).toBeInTheDocument();
    expect(screen.getByText(`Dave: +$2`)).toBeInTheDocument();
  });
}); 
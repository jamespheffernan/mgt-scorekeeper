import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useGameStore } from '../store/gameStore';
import { HoleViewMobile } from '../components/hole/mobile/HoleViewMobile';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../store/gameStore', () => ({
  useGameStore: jest.fn(),
  getPlayerStrokeIndexes: jest.fn(async () => [
    Array(18).fill(1),
    Array(18).fill(2),
    Array(18).fill(3),
    Array(18).fill(4)
  ]),
}));

jest.mock('../db/millbrookDb', () => ({
  millbrookDb: {
    getCourse: jest.fn()
  }
}));

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterAll(() => {
  (console.log as jest.Mock).mockRestore();
});

const stableMockState = {
  match: {
    base: 5,
    carry: 10,
    currentHole: 1,
    holePar: [4],
    playerTeeIds: ['t1', 't2', 't1', 't2'],
    courseId: 'c1',
    holeSI: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
  },
  players: [
    { id: 'p1', name: 'A', index: 0 },
    { id: 'p2', name: 'B', index: 1 },
    { id: 'p3', name: 'C', index: 2 },
    { id: 'p4', name: 'D', index: 3 },
  ],
  playerTeams: ['Red', 'Blue', 'Red', 'Blue'],
  isDoubleAvailable: false,
  trailingTeam: null,
  enterHoleScores: jest.fn(),
  callDouble: jest.fn(),
  cancelMatch: jest.fn(),
  ledger: [
    { runningTotals: [0, 0, 0, 0], carryAfter: 0 }
  ],
  holeScores: [],
};

const stableBigGameMockState = {
  match: {
    base: 5,
    carry: 10,
    currentHole: 1,
    holePar: [5], // Par 5 for the test
    playerTeeIds: ['t1', 't2', 't1', 't2'],
    courseId: 'c1',
    bigGame: true,
    bigGameTotal: 8,
    holeSI: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
  },
  players: [
    { id: 'p1', name: 'A', index: 0 },
    { id: 'p2', name: 'B', index: 1 },
    { id: 'p3', name: 'C', index: 2 },
    { id: 'p4', name: 'D', index: 3 },
  ],
  playerTeams: ['Red', 'Blue', 'Red', 'Blue'],
  isDoubleAvailable: false,
  trailingTeam: null,
  enterHoleScores: jest.fn(),
  callDouble: jest.fn(),
  cancelMatch: jest.fn(),
  ledger: [
    { runningTotals: [0, 0, 0, 0], carryAfter: 0 }
  ],
  holeScores: [],
  bigGameRows: [
    { hole: 1, bestNet: [3, 5], subtotal: 8 },
  ],
};

describe('HoleViewMobile pot-summary-item layout', () => {
  beforeEach(() => {
    (useGameStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector ? selector(stableMockState) : stableMockState;
    });
  });

  it('renders left and right pot-summary-item with label and dollar amount in two lines', () => {
    render(
      <MemoryRouter>
        <HoleViewMobile />
      </MemoryRouter>
    );
    const left = screen.getByText(/Hole Value/i).closest('.pot-summary-item-left');
    const right = screen.getByText(/Carrying/i).closest('.pot-summary-item-right');
    expect(left).toBeInTheDocument();
    expect(right).toBeInTheDocument();
    // Check for label and dollar amount in separate lines (block elements)
    // This will fail until the component is updated to use two-line layout
    expect(left?.children.length).toBe(2);
    expect(left?.children[0].textContent).toMatch(/Hole Value/i);
    expect(left?.children[1].textContent).toMatch(/\$[0-9]+/);
    expect(right?.children.length).toBe(2);
    expect(right?.children[0].textContent).toMatch(/Carrying/i);
    expect(right?.children[1].textContent).toMatch(/\$[0-9]+/);
  });

  it('renders Big Game pill with correct score and to-par when bigGame is enabled', () => {
    (useGameStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector ? selector(stableBigGameMockState) : stableBigGameMockState;
    });

    render(
      <MemoryRouter>
        <HoleViewMobile />
      </MemoryRouter>
    );
    // The pill should show BG: 8 (2) for par 5, subtotal 8, to-par = 8-10 = -2
    const bgPill = screen.getByText(/BG: 8 \(-2\)/i);
    expect(bgPill).toBeInTheDocument();
    // Optionally check for green background style
    expect(bgPill).toHaveStyle('background-color: #166534');
  });
}); 
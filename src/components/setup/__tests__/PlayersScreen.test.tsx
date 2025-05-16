import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayersScreen } from '../PlayersScreen';

const mockRoster = { red: ['1'], blue: ['2'] };
jest.mock('../../../store/rosterStore', () => ({
  useRosterStore: () => ({
    roster: mockRoster,
    setTeam: jest.fn(),
    remove: jest.fn(),
    initialize: jest.fn(),
  }),
}));

// Mock useFirestorePlayers and useRosterStore
jest.mock('../../../hooks/useFirestorePlayers', () => ({
  useFirestorePlayers: () => ({
    players: [
      { id: '1', first: 'Jim', last: 'Heffernan', name: 'Jim Heffernan', index: 4.2 },
      { id: '2', first: 'Neil', last: 'Howland', name: 'Neil Howland', index: 7.1 },
    ],
    isLoading: false,
    error: null,
    createPlayer: jest.fn(),
  }),
}));

jest.mock('../../../db/millbrookDb', () => ({
  millbrookDb: {
    getAllPlayers: jest.fn(),
    savePlayer: jest.fn(),
    deletePlayer: jest.fn(),
    getAllCourses: jest.fn(),
    getCourse: jest.fn(),
    saveCourse: jest.fn(),
    deleteCourse: jest.fn(),
    initializeIfEmpty: jest.fn(),
    // Add any other methods as needed for tests
  }
}));

describe('PlayersScreen', () => {
  it('opens edit modal when player name is clicked', () => {
    render(<PlayersScreen />);
    // Find player name
    const jimName = screen.getByText('Jim Heffernan');
    fireEvent.click(jimName);
    // Modal should appear
    expect(screen.getByText('Edit Player')).toBeInTheDocument();
    // Modal should show correct player data
    expect(screen.getByDisplayValue('Jim')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Heffernan')).toBeInTheDocument();
  });
}); 
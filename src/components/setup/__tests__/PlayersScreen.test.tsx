// Setup mocks FIRST
let players = [
  { id: '1', first: 'Jim', last: 'Heffernan', name: 'Jim Heffernan', index: 4.2 },
  { id: '2', first: 'Neil', last: 'Howland', name: 'Neil Howland', index: 7.1 },
];
const updatePlayer = jest.fn((updatedPlayer) => {
  players = players.map(p => p.id === updatedPlayer.id ? { ...updatedPlayer } : p);
});

jest.mock('../../../hooks/useFirestorePlayers', () => ({
  useFirestorePlayers: () => ({
    players,
    isLoading: false,
    error: null,
    createPlayer: jest.fn(),
    updatePlayer,
  }),
  __esModule: true,
  updatePlayer,
}));

// THEN import everything else
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlayersScreen } from '../PlayersScreen';
import '@testing-library/jest-dom';
import { Player } from '../../../db/API-GameState';

const mockRoster = { red: ['1'], blue: ['2'] };
jest.mock('../../../store/rosterStore', () => {
  const mockState = {
    roster: { red: ['1'], blue: ['2'] },
    setTeam: jest.fn(),
    remove: jest.fn(),
    initialize: jest.fn(),
  };
  return {
    useRosterStore: (selector: (state: typeof mockState) => any) => selector ? selector(mockState) : mockState,
  };
});

function setupMocks() {
  jest.mock('../../../hooks/useFirestorePlayers', () => ({
    useFirestorePlayers: () => ({
      players,
      isLoading: false,
      error: null,
      createPlayer: jest.fn(),
      updatePlayer,
    }),
    __esModule: true,
    updatePlayer,
  }));
}
setupMocks();

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
  beforeEach(() => {
    players = [
      { id: '1', first: 'Jim', last: 'Heffernan', name: 'Jim Heffernan', index: 4.2 },
      { id: '2', first: 'Neil', last: 'Howland', name: 'Neil Howland', index: 7.1 },
    ];
    updatePlayer.mockClear();
  });

  it('opens edit modal when player name is clicked', () => {
    render(
      <MemoryRouter>
        <PlayersScreen />
      </MemoryRouter>
    );
    // Find player name
    const jimName = screen.getByText('Jim Heffernan');
    fireEvent.click(jimName);
    // Modal should appear
    expect(screen.getByText('Edit Player')).toBeInTheDocument();
    // Modal should show correct player data
    expect(screen.getByDisplayValue('Jim')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Heffernan')).toBeInTheDocument();
  });

  it('saves last name changes and calls updatePlayer', () => {
    const { updatePlayer } = require('../../../hooks/useFirestorePlayers');
    render(
      <MemoryRouter>
        <PlayersScreen />
      </MemoryRouter>
    );
    const jimName = screen.getByText('Jim Heffernan');
    fireEvent.click(jimName);
    const lastNameInput = screen.getByLabelText('Last Name:');
    fireEvent.change(lastNameInput, { target: { value: 'Smith' } });
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    expect(updatePlayer).toHaveBeenCalledWith(expect.objectContaining({
      id: '1',
      first: 'Jim',
      last: 'Smith',
    }));
  });

  test('editing a player does not create a duplicate in the roster', async () => {
    // Arrange: Render PlayersScreen and simulate editing a player
    const { findAllByText, findByLabelText, rerender } = render(
      <MemoryRouter>
        <PlayersScreen />
      </MemoryRouter>
    );

    // Wait for both players to appear
    const player1 = await findAllByText(/Jim Heffernan/);
    expect(player1.length).toBe(1);

    // Simulate clicking the edit button for Jim Heffernan
    const editButton = await findByLabelText('Edit Jim Heffernan');
    fireEvent.click(editButton);

    // Simulate changing the name in the QuickHandicapEditor
    const firstNameInput = await findByLabelText(/First Name/i);
    const lastNameInput = await findByLabelText(/Last Name/i);
    fireEvent.change(firstNameInput, { target: { value: 'James' } });
    fireEvent.change(lastNameInput, { target: { value: 'Heffernan' } });

    // Simulate saving the player
    const saveButton = await findByLabelText(/Save/i);
    fireEvent.click(saveButton);

    // Rerender to reflect updated state
    rerender(
      <MemoryRouter>
        <PlayersScreen />
      </MemoryRouter>
    );

    // Assert: Only one player with the new name appears, and no duplicate with the old name
    const updatedPlayers = await findAllByText(/James Heffernan/);
    expect(updatedPlayers.length).toBe(1);
    const oldPlayers = screen.queryAllByText(/Jim Heffernan/);
    expect(oldPlayers.length).toBe(0);
  });
}); 
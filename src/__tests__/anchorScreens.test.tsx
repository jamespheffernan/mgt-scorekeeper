import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { jest } from '@jest/globals';

// Stable mock players array to avoid new reference on every render
const stableMockPlayers: any[] = [];

// Mock Firestore players hook
jest.mock('../hooks/useFirestorePlayers', () => ({
  useFirestorePlayers: () => ({
    players: stableMockPlayers,
    isLoading: false,
    createPlayer: jest.fn(),
    updatePlayer: jest.fn(),
    deletePlayerById: jest.fn(),
    error: null,
  }),
}));

// Mock Auth context
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: null,
    loading: false,
    error: null,
    signUp: async () => null,
    logIn: async () => null,
    logOut: async () => {},
    authInitialized: true,
  }),
}));

import MatchSetup from '../components/setup/MatchSetup';
import { HoleView } from '../components/hole/HoleView';
import { LedgerView } from '../components/ledger/LedgerView';
import SettlementView from '../components/ledger/SettlementView';

// Mock scrollTo for jsdom environment
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: jest.fn(),
  });
});

describe('Snapshot tests for anchor screens', () => {
  it('renders MatchSetup correctly', () => {
    const { asFragment } = render(
      <MemoryRouter>
        <MatchSetup />
      </MemoryRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders HoleView correctly', () => {
    const { asFragment } = render(
      <MemoryRouter>
        <HoleView />
      </MemoryRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders LedgerView correctly', () => {
    const { asFragment } = render(
      <MemoryRouter>
        <LedgerView />
      </MemoryRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders SettlementView correctly', () => {
    const { asFragment } = render(
      <MemoryRouter>
        <SettlementView matchId="test" />
      </MemoryRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });
}); 
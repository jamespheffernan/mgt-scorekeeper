import { renderHook, act, waitFor } from '@testing-library/react';
import { useFirestorePlayers } from '../useFirestorePlayers';
import { db } from '../../firebase';
import { Player } from '../../db/API-GameState';
import { millbrookDb } from '../../db/millbrookDb';
import { useAuth } from '../../context/AuthContext';
import { collection, doc, getDocs, addDoc, setDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';

// Mock Firebase
jest.mock('../../firebase', () => ({
  db: {},
}));

// Mock Firestore methods
jest.mock('firebase/firestore', () => {
  return {
    collection: jest.fn(),
    doc: jest.fn(),
    addDoc: jest.fn(),
    setDoc: jest.fn(),
    deleteDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
  };
});

// Mock Dexie
jest.mock('../../db/millbrookDb', () => ({
  millbrookDb: {
    savePlayer: jest.fn().mockResolvedValue(undefined),
    getAllPlayers: jest.fn(),
    deletePlayer: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock useAuth
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('useFirestorePlayers', () => {
  const mockUser = { uid: 'test-user-123' };
  const mockPlayers: Player[] = [
    { id: 'player1', name: 'Player 1', index: 10 },
    { id: 'player2', name: 'Player 2', index: 5 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: mockUser,
    });

    // Mock collection reference
    (collection as jest.Mock).mockReturnValue('players-collection-ref');
    (doc as jest.Mock).mockReturnValue('player-doc-ref');
    (query as jest.Mock).mockImplementation((_ref, _orderByParam) => 'players-query');
    (orderBy as jest.Mock).mockReturnValue('order-by-name');
    
    // Mock query snapshot
    const mockQuerySnapshot = {
      forEach: jest.fn((callback) => {
        mockPlayers.forEach((player) => {
          callback({
            id: player.id,
            data: () => ({ ...player }),
          });
        });
      }),
    };
    (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

    // Mock Dexie response
    (millbrookDb.getAllPlayers as jest.Mock).mockResolvedValue(mockPlayers);
  });

  test('should fetch players from Firestore when user is logged in', async () => {
    const { result } = renderHook(() => useFirestorePlayers());
    
    // Ensure mock data is loaded in the hook state
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.players.length).toBeGreaterThan(0);
    });
    
    expect(collection).toHaveBeenCalledWith(db, `users/${mockUser.uid}/players`);
    expect(query).toHaveBeenCalledWith('players-collection-ref', expect.anything());
    expect(getDocs).toHaveBeenCalledWith('players-query');
    expect(result.current.players).toEqual(mockPlayers);
  });

  test('should fetch players from Dexie when user is not logged in', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: null,
    });
    
    const { result } = renderHook(() => useFirestorePlayers());
    
    // Wait for mock data to be loaded into state
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(millbrookDb.getAllPlayers).toHaveBeenCalled();
    expect(result.current.players).toEqual(mockPlayers);
  });

  test('should create a player in Firestore when user is logged in', async () => {
    (addDoc as jest.Mock).mockResolvedValue({ id: 'new-player' });
    
    const { result } = renderHook(() => useFirestorePlayers());
    
    await waitFor(() => !result.current.isLoading);
    
    const newPlayer = { name: 'New Player', index: 7 };
    
    await act(async () => {
      await result.current.createPlayer(newPlayer);
    });
    
    expect(collection).toHaveBeenCalledWith(db, `users/${mockUser.uid}/players`);
    expect(addDoc).toHaveBeenCalledWith('players-collection-ref', expect.objectContaining({
      name: 'New Player',
      index: 7,
    }));
    expect(millbrookDb.savePlayer).toHaveBeenCalled();
  });

  test('should update a player in Firestore when user is logged in', async () => {
    (setDoc as jest.Mock).mockResolvedValue({});
    
    const { result } = renderHook(() => useFirestorePlayers());
    
    await waitFor(() => !result.current.isLoading);
    
    const updatedPlayer = { id: 'player1', name: 'Updated Player', index: 8 };
    
    await act(async () => {
      await result.current.updatePlayer(updatedPlayer);
    });
    
    expect(doc).toHaveBeenCalledWith(db, `users/${mockUser.uid}/players/player1`);
    expect(setDoc).toHaveBeenCalledWith('player-doc-ref', expect.objectContaining({
      id: 'player1',
      name: 'Updated Player',
      index: 8,
    }));
    expect(millbrookDb.savePlayer).toHaveBeenCalledWith(updatedPlayer);
  });

  test('should delete a player from Firestore when user is logged in', async () => {
    (deleteDoc as jest.Mock).mockResolvedValue({});
    
    const { result } = renderHook(() => useFirestorePlayers());
    
    await waitFor(() => !result.current.isLoading);
    
    await act(async () => {
      await result.current.deletePlayerById('player1');
    });
    
    expect(doc).toHaveBeenCalledWith(db, `users/${mockUser.uid}/players/player1`);
    expect(deleteDoc).toHaveBeenCalledWith('player-doc-ref');
    expect(millbrookDb.deletePlayer).toHaveBeenCalledWith('player1');
  });
}); 
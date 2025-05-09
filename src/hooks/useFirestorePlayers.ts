import { useState, useEffect } from 'react';
import { collection, doc, getDocs, addDoc, setDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { millbrookDb } from '../db/millbrookDb';
import { Player } from '../db/API-GameState';
import { useAuth } from '../context/AuthContext';
import { generateUUID } from '../utils/uuid';

/**
 * Hook to provide Firestore database access for players with Dexie fallback
 */
export function useFirestorePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  // Load player data on mount or when user auth state changes
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setIsLoading(true);
        
        if (currentUser) {
          // User is logged in - fetch from Firestore
          const playersRef = collection(db, `users/${currentUser.uid}/players`);
          const q = query(playersRef, orderBy('name'));
          const snapshot = await getDocs(q);
          
          const loadedPlayers: Player[] = [];
          snapshot.forEach(doc => {
            loadedPlayers.push({ id: doc.id, ...doc.data() } as Player);
          });
          
          setPlayers(loadedPlayers);
          
          // Also save to local DB for offline access
          for (const player of loadedPlayers) {
            await millbrookDb.savePlayer(player);
          }
        } else {
          // No user - fetch from local DB
          const localPlayers = await millbrookDb.getAllPlayers();
          setPlayers(localPlayers);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading players:', err);
        setError('Failed to load players');
        
        // Fallback to local DB if Firestore fails
        if (currentUser) {
          try {
            const localPlayers = await millbrookDb.getAllPlayers();
            setPlayers(localPlayers);
          } catch (localErr) {
            console.error('Local DB fallback failed:', localErr);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPlayers();
  }, [currentUser]);

  // Create a new player
  const createPlayer = async (playerData: Omit<Player, 'id'>): Promise<Player> => {
    const newPlayer: Player = {
      ...playerData,
      id: generateUUID()
    };

    try {
      setIsLoading(true);
      
      // Save to Firestore if user is logged in
      if (currentUser) {
        const playersRef = collection(db, `users/${currentUser.uid}/players`);
        
        const docRef = await addDoc(playersRef, {
          ...newPlayer,
          createdAt: new Date().toISOString()
        });
        
        // Update the ID to use Firestore's ID
        newPlayer.id = docRef.id;
      }
      
      // Always save to local DB for offline access
      await millbrookDb.savePlayer(newPlayer);
      
      setPlayers(prevPlayers => [...prevPlayers, newPlayer]);
      return newPlayer;
    } catch (err) {
      console.error('Error creating player:', err);
      setError('Failed to create player');
      throw new Error('Failed to create player');
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing player
  const updatePlayer = async (player: Player): Promise<Player> => {
    try {
      setIsLoading(true);
      
      // Update in Firestore if user is logged in
      if (currentUser) {
        const playerRef = doc(db, `users/${currentUser.uid}/players/${player.id}`);
        await setDoc(playerRef, {
          ...player,
          updatedAt: new Date().toISOString()
        });
      }
      
      // Always update in local DB
      await millbrookDb.savePlayer(player);
      
      setPlayers(prevPlayers => 
        prevPlayers.map(p => p.id === player.id ? player : p)
      );
      
      return player;
    } catch (err) {
      console.error('Error updating player:', err);
      setError('Failed to update player');
      throw new Error('Failed to update player');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a player by ID
  const deletePlayerById = async (playerId: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Delete from Firestore if user is logged in
      if (currentUser) {
        const playerRef = doc(db, `users/${currentUser.uid}/players/${playerId}`);
        await deleteDoc(playerRef);
      }
      
      // Always delete from local DB
      await millbrookDb.deletePlayer(playerId);
      
      setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== playerId));
    } catch (err) {
      console.error('Error deleting player:', err);
      setError('Failed to delete player');
      throw new Error('Failed to delete player');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    players,
    isLoading,
    error,
    createPlayer,
    updatePlayer,
    deletePlayerById
  };
} 
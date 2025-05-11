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

  // Define the global players collection path
  const globalPlayersCollection = 'sharedPlayers';

  // Load player data on mount or when user auth state changes
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        console.log('[useFirestorePlayers] Setting isLoading to true');
        setIsLoading(true);
        
        // Always try to load from Firestore first, regardless of authentication state
        console.log('[useFirestorePlayers] Fetching from global sharedPlayers collection');
        // User is logged in - fetch from Firestore global collection
        const playersRef = collection(db, globalPlayersCollection);
        const q = query(playersRef, orderBy('name'));
        
        try {
          const snapshot = await getDocs(q);
          
          const loadedPlayers: Player[] = [];
          snapshot.forEach(doc => {
            loadedPlayers.push({ id: doc.id, ...doc.data() } as Player);
          });
          
          setPlayers(loadedPlayers);
          console.log('[useFirestorePlayers] Players loaded from Firestore:', loadedPlayers);
          
          // Also save to local DB for offline access
          for (const player of loadedPlayers) {
            await millbrookDb.savePlayer(player);
          }
        } catch (firestoreErr) {
          console.error('Error loading from Firestore:', firestoreErr);
          
          // Fallback to local DB if Firestore fails
          console.log('[useFirestorePlayers] Firestore failed, attempting local DB fallback');
          const localPlayers = await millbrookDb.getAllPlayers();
          setPlayers(localPlayers);
          console.log('[useFirestorePlayers] Players loaded from local DB after fallback:', localPlayers);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading players:', err);
        setError('Failed to load players');
        
        // Final fallback - try local DB if everything else fails
        try {
          console.log('[useFirestorePlayers] Attempting final fallback to local DB');
          const localPlayers = await millbrookDb.getAllPlayers();
          setPlayers(localPlayers);
        } catch (localErr) {
          console.error('Local DB fallback failed:', localErr);
        }
      } finally {
        console.log('[useFirestorePlayers] Setting isLoading to false in finally block');
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
      
      // Always try to save to Firestore, regardless of authentication
      try {
        const playersRef = collection(db, globalPlayersCollection);
        
        const docRef = await addDoc(playersRef, {
          ...newPlayer,
          createdAt: new Date().toISOString()
        });
        
        // Update the ID to use Firestore's ID
        newPlayer.id = docRef.id;
      } catch (firestoreErr) {
        console.error('Failed to save to Firestore:', firestoreErr);
        // Continue with local save only
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
      
      // Create a shallow copy to modify for Firestore
      const playerToSave: { [key: string]: any } = { ...player };

      // Remove undefined fields before saving to Firestore
      for (const key in playerToSave) {
        if (playerToSave[key] === undefined) {
          delete playerToSave[key];
        }
      }

      // Always try to update in Firestore, regardless of authentication
      try {
        const playerRef = doc(db, globalPlayersCollection, player.id);
        // Use the cleaned playerToSave object and merge: true
        await setDoc(playerRef, {
          ...playerToSave,
          updatedAt: new Date().toISOString() // Ensure updatedAt is always fresh
        }, { merge: true });
      } catch (firestoreErr) {
        console.error('Failed to update in Firestore:', firestoreErr);
        // Continue with local update only
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
      
      // Always try to delete from Firestore, regardless of authentication
      try {
        const playerRef = doc(db, globalPlayersCollection, playerId);
        await deleteDoc(playerRef);
      } catch (firestoreErr) {
        console.error('Failed to delete from Firestore:', firestoreErr);
        // Continue with local delete only
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
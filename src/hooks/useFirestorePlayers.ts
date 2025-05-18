import { useState, useEffect } from 'react';
import { collection, doc, getDocs, addDoc, setDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { millbrookDb } from '../db/millbrookDb';
import { Player } from '../db/API-GameState';
import { useAuth } from '../context/AuthContext';
import { generateUUID } from '../utils/uuid';
import { splitNameParts } from '../utils/nameFormatter';
import { ensurePlayerNameConsistency } from '../utils/nameFormatter';

/**
 * Hook to provide Firestore database access for players with Dexie fallback
 */
export function useFirestorePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, authInitialized, loading: authLoading } = useAuth();

  // Define the global players collection path
  const globalPlayersCollection = 'sharedPlayers';

  // Load player data on mount or when user auth state changes
  useEffect(() => {
    const loadPlayers = async () => {
      console.log('[useFirestorePlayers] loadPlayers called. Auth initialized:', authInitialized, 'Auth loading:', authLoading, 'User:', currentUser?.uid);
      setIsLoading(true);
      setError(null);

      if (!authInitialized) {
        console.log('[useFirestorePlayers] Auth not initialized yet. Waiting...');
        // isLoading is already true, or will be set by authLoading effect.
        // We don't set players or error here, just wait for auth to initialize.
        return;
      }

      try {
        if (currentUser) {
          // User is logged in - fetch from Firestore global collection
          console.log('[useFirestorePlayers] Fetching from global sharedPlayers collection (user authenticated)');
          const playersRef = collection(db, globalPlayersCollection);
          // Consider ordering by a specific field, e.g., lastName, then firstName for consistency
          const q = query(playersRef, orderBy('last', 'asc'), orderBy('first', 'asc'));
          
          try {
            const snapshot = await getDocs(q);
            const loadedPlayers: Player[] = [];
            snapshot.forEach(doc => {
              loadedPlayers.push({ id: doc.id, ...doc.data() } as Player);
            });
            
            setPlayers(loadedPlayers);
            console.log('[useFirestorePlayers] Players loaded from Firestore:', loadedPlayers.length);
            
            // Also save to local DB for offline access
            for (const player of loadedPlayers) {
              await millbrookDb.savePlayer(player);
            }
            console.log('[useFirestorePlayers] Synced Firestore players to local DB.');
          } catch (firestoreErr: any) {
            console.error('[useFirestorePlayers] Error loading from Firestore (user authenticated):', firestoreErr);
            setError(`Firestore error: ${firestoreErr.message || 'Failed to load players.'}`);
            // Fallback to local DB if Firestore fails even with auth
            console.log('[useFirestorePlayers] Firestore failed with auth, attempting local DB fallback');
            const localPlayers = await millbrookDb.getAllPlayers();
            setPlayers(localPlayers);
            console.log('[useFirestorePlayers] Players loaded from local DB after Firestore fail (auth):', localPlayers.length);
          }
        } else {
          // No authenticated user, but auth is initialized (e.g., anonymous login failed or not used)
          // Load directly from local DB only.
          console.log('[useFirestorePlayers] No authenticated user (auth initialized). Loading from local DB only.');
          const localPlayers = await millbrookDb.getAllPlayers();
          setPlayers(localPlayers);
          console.log('[useFirestorePlayers] Players loaded from local DB (no auth user):', localPlayers.length);
        }
      } catch (err: any) {
        console.error('[useFirestorePlayers] General error in loadPlayers:', err);
        setError(`Load players error: ${err.message || 'Failed to load players'}`);
        // Final fallback if any other error occurs
        try {
          console.log('[useFirestorePlayers] Attempting final fallback to local DB due to general error');
          const localPlayers = await millbrookDb.getAllPlayers();
          setPlayers(localPlayers);
        } catch (localErr: any) {
          console.error('[useFirestorePlayers] Final local DB fallback failed:', localErr);
          setError((prevError) => prevError + `; Local DB fallback also failed: ${localErr.message || 'Unknown error'}`);
        }
      } finally {
        console.log('[useFirestorePlayers] Setting isLoading to false in loadPlayers finally block');
        setIsLoading(false);
      }
    };

    loadPlayers();
  }, [currentUser, authInitialized, authLoading]); // Depend on authInitialized and authLoading

  // Adjust isLoading based on authLoading
  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
    }
    // If auth is done loading AND we are not already loading players via loadPlayers, 
    // then internal isLoading can be false. loadPlayers will manage its own loading state.
    // This prevents premature flicker if auth finishes quickly but loadPlayers takes time.
  }, [authLoading]);

  // Create a new player
  const createPlayer = async (playerData: Omit<Player, 'id'>): Promise<Player> => {
    // Make sure we have first/last fields
    let { first, last, name } = playerData;
    
    // If we have a name but no first/last, split it
    if (name && (!first || !last)) {
      const nameParts = splitNameParts(name);
      first = nameParts.first;
      last = nameParts.last;
    }
    
    // If we have first/last but no name, generate it
    if (!name && (first || last)) {
      name = `${first} ${last}`.trim();
    }
    
    const newPlayerBase: Omit<Player, 'id'> = {
      ...playerData,
      first: first || '',
      last: last || '',
      name: name || ''
    };

    // Generate a local UUID first. This will be overwritten if Firestore save is successful.
    let newPlayer: Player = { ...newPlayerBase, id: generateUUID() };

    setIsLoading(true);
    setError(null);
    try {
      if (currentUser) {
        console.log('[useFirestorePlayers] Attempting to save new player to Firestore (user authenticated).');
        const playersRef = collection(db, globalPlayersCollection);
        const firestorePlayerData: any = { 
          ...newPlayerBase, // Use base without the local ID
          index: newPlayerBase.index || 0, // Ensure index is not undefined for Firestore
          createdAt: new Date().toISOString(),
          userId: currentUser.uid // Optional: associate player with user if desired
        };
         // Remove undefined fields before saving to Firestore
        for (const key in firestorePlayerData) {
          if (firestorePlayerData[key] === undefined) {
            delete firestorePlayerData[key];
          }
        }

        try {
          const docRef = await addDoc(playersRef, firestorePlayerData);
          newPlayer.id = docRef.id; // Update with Firestore-generated ID
          console.log('[useFirestorePlayers] New player saved to Firestore with ID:', newPlayer.id);
        } catch (firestoreErr: any) {
          console.error('[useFirestorePlayers] Failed to save new player to Firestore (user authenticated):', firestoreErr);
          setError(`Firestore save error: ${firestoreErr.message || 'Failed to save player.'}`);
          // Do not rethrow here, allow fallback to local save with UUID
          console.log('[useFirestorePlayers] Proceeding with local save only for new player, using generated ID:', newPlayer.id);
        }
      } else {
        console.log('[useFirestorePlayers] No authenticated user. New player will be saved locally only with generated ID:', newPlayer.id);
      }
      
      // Always save to local DB (either with Firestore ID or generated UUID)
      await millbrookDb.savePlayer(newPlayer);
      console.log('[useFirestorePlayers] New player saved to local DB with ID:', newPlayer.id);
      
      setPlayers(prevPlayers => [...prevPlayers, newPlayer]);
      return newPlayer;
    } catch (err: any) {
      console.error('[useFirestorePlayers] Error creating player (after Firestore attempt/local save):', err);
      setError(`Create player error: ${err.message || 'Failed to create player'}`);
      throw new Error('Failed to create player');
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing player
  const updatePlayer = async (player: Player): Promise<Player> => {
    setIsLoading(true);
    setError(null);
    try {
      // Ensure name field stays in sync with first/last
      const updatedPlayer = ensurePlayerNameConsistency(player);
      
      // Create a shallow copy to modify for Firestore
      const playerToSave: { [key: string]: any } = { ...updatedPlayer };

      // Remove undefined fields before saving to Firestore
      for (const key in playerToSave) {
        if (playerToSave[key] === undefined) {
          delete playerToSave[key];
        }
      }
      // Ensure index is not undefined for Firestore
      if (playerToSave.index === undefined) playerToSave.index = 0;

      if (currentUser && player.id) { // Check for player.id to ensure it's a valid Firestore doc path
        console.log('[useFirestorePlayers] Attempting to update player in Firestore (user authenticated):', player.id);
        try {
          const playerRef = doc(db, globalPlayersCollection, player.id);
          await setDoc(playerRef, {
            ...playerToSave, // playerToSave already has id removed if it was part of spread
            updatedAt: new Date().toISOString()
          }, { merge: true });
          console.log('[useFirestorePlayers] Player updated in Firestore:', player.id);
        } catch (firestoreErr: any) {
          console.error('[useFirestorePlayers] Failed to update player in Firestore (user authenticated):', firestoreErr);
          setError(`Firestore update error: ${firestoreErr.message || 'Failed to update player.'}`);
          // Do not rethrow, allow local update to proceed
          console.log('[useFirestorePlayers] Proceeding with local update only for player:', player.id);
        }
      } else {
        console.log(`[useFirestorePlayers] No authenticated user or missing player ID ('${player.id}'). Player update will be local only.`);
      }
      
      // Always update in local DB
      await millbrookDb.savePlayer(updatedPlayer);
      console.log('[useFirestorePlayers] Player updated in local DB:', updatedPlayer.id);
      
      setPlayers(prevPlayers => 
        prevPlayers.map(p => p.id === updatedPlayer.id ? updatedPlayer : p)
      );
      
      return updatedPlayer;
    } catch (err: any) {
      console.error('[useFirestorePlayers] Error updating player (after Firestore attempt/local save):', err);
      setError(`Update player error: ${err.message || 'Failed to update player'}`);
      throw new Error('Failed to update player');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a player by ID
  const deletePlayerById = async (playerId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      if (currentUser && playerId) {
        console.log('[useFirestorePlayers] Attempting to delete player from Firestore (user authenticated):', playerId);
        try {
          const playerRef = doc(db, globalPlayersCollection, playerId);
          await deleteDoc(playerRef);
          console.log('[useFirestorePlayers] Player deleted from Firestore:', playerId);
        } catch (firestoreErr: any) {
          console.error('[useFirestorePlayers] Failed to delete player from Firestore (user authenticated):', firestoreErr);
          setError(`Firestore delete error: ${firestoreErr.message || 'Failed to delete player.'}`);
          // Do not rethrow, allow local delete to proceed
          console.log('[useFirestorePlayers] Proceeding with local delete only for player:', playerId);
        }
      } else {
        console.log(`[useFirestorePlayers] No authenticated user or missing player ID ('${playerId}'). Player delete will be local only.`);
      }
      
      // Always delete from local DB
      await millbrookDb.deletePlayer(playerId);
      console.log('[useFirestorePlayers] Player deleted from local DB:', playerId);
      
      setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== playerId));
    } catch (err: any) {
      console.error('[useFirestorePlayers] Error deleting player (after Firestore attempt/local save):', err);
      setError(`Delete player error: ${err.message || 'Failed to delete player'}`);
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
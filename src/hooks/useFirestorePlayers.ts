import { useState, useEffect } from 'react';
import { collection, doc, getDocs, addDoc, setDoc, deleteDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
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
    // console.log('[useFirestorePlayers] Effect triggered. Auth initialized:', authInitialized, 'Auth loading:', authLoading, 'User:', currentUser?.uid);
    setIsLoading(true);
    setError(null);

    if (!authInitialized) {
      console.log('[useFirestorePlayers] Auth not initialized yet. Waiting...');
      // setIsLoading(true) is already set above or will be handled by authLoading effect
      return;
    }

    let unsubscribe = () => {}; // Initialize unsubscribe to a no-op

    if (currentUser) {
      console.log('[useFirestorePlayers] Setting up Firestore snapshot listener (user authenticated).');
      const playersRef = collection(db, globalPlayersCollection);
      const q = query(playersRef, orderBy('last', 'asc'), orderBy('first', 'asc'));

      unsubscribe = onSnapshot(q, 
        async (snapshot) => {
          // console.log('[useFirestorePlayers] Snapshot received from Firestore.');
          setIsLoading(true); // Indicate processing of new snapshot
          const loadedPlayers: Player[] = [];
          snapshot.forEach(doc => {
            loadedPlayers.push({ id: doc.id, ...doc.data() } as Player);
          });
          
          setPlayers(loadedPlayers);
          // console.log('[useFirestorePlayers] Players updated from Firestore snapshot:', loadedPlayers.length);
          
          try {
            // Consider optimizing Dexie sync if it becomes a bottleneck.
            // For now, keep existing behavior of full sync on update.
            // console.log('[useFirestorePlayers] Syncing snapshot players to local DB.');
            for (const player of loadedPlayers) {
              await millbrookDb.savePlayer(player);
            }
            // console.log('[useFirestorePlayers] Synced snapshot players to local DB finished.');
          } catch (dexieErr: any) {
            console.error('[useFirestorePlayers] Error syncing snapshot to Dexie:', dexieErr);
            // Optionally set a specific error for Dexie sync failure
          }
          setError(null); // Clear previous errors on successful snapshot
          setIsLoading(false);
        }, 
        (snapshotError) => {
          console.error('[useFirestorePlayers] Firestore snapshot error:', snapshotError);
          setError(`Firestore listener error: ${snapshotError.message || 'Failed to listen to players.'}`);
          // Fallback to local DB if listener fails
          millbrookDb.getAllPlayers().then(localPlayers => {
            setPlayers(localPlayers);
            // console.log('[useFirestorePlayers] Players loaded from local DB after snapshot error:', localPlayers.length);
          }).catch(localErr => {
            console.error('[useFirestorePlayers] Local DB fallback failed after snapshot error:', localErr);
            setError(prevError => prevError + '; Local DB fallback failed: ' + localErr.message);
          }).finally(() => {
            setIsLoading(false);
          });
        }
      );
    } else {
      // No authenticated user, but auth is initialized
      console.log('[useFirestorePlayers] No authenticated user (auth initialized). Loading from local DB only.');
      setIsLoading(true);
      millbrookDb.getAllPlayers().then(localPlayers => {
        setPlayers(localPlayers);
        // console.log('[useFirestorePlayers] Players loaded from local DB (no auth user):', localPlayers.length);
      }).catch(err => {
        console.error('[useFirestorePlayers] Error loading from local DB (no auth user):', err);
        setError(`Local DB error: ${err.message || 'Failed to load players.'}`);
      }).finally(() => {
        setIsLoading(false);
      });
    }

    return () => {
      // console.log('[useFirestorePlayers] Cleanup: Unsubscribing from Firestore snapshot listener.');
      unsubscribe();
    };
  }, [currentUser, authInitialized]); // Removed authLoading, handled by separate effect if needed for isLoading

  // This effect can remain if authLoading should independently control a global isLoading flag,
  // but the primary player loading logic is now tied to currentUser and authInitialized.
  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
    }
    // If auth is done loading and the main effect hasn't set isLoading to false yet,
    // this might cause a flicker. The main effect now manages isLoading more directly.
    // Consider removing or simplifying if the main effect handles isLoading sufficiently.
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
    setError(null);
    try {
      // Optimistic update of the local state for immediate UI feedback
      setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== playerId));
      console.log('[useFirestorePlayers] Optimistically updated local players state after delete for ID:', playerId);

      if (currentUser && playerId) {
        console.log('[useFirestorePlayers] Attempting to delete player from Firestore (user authenticated):', playerId);
        const playerRef = doc(db, globalPlayersCollection, playerId);
        await deleteDoc(playerRef); // Firestore delete will trigger snapshot listener
        console.log('[useFirestorePlayers] Player delete command sent to Firestore:', playerId);
      }
      
      // Always delete from local Dexie DB
      // This is crucial for offline mode and as a backup.
      // If online, the snapshot listener will be the primary source of truth for UI updates from Firestore.
      await millbrookDb.deletePlayer(playerId);
      console.log('[useFirestorePlayers] Player deleted from local DB:', playerId);

      // If no currentUser, the snapshot listener isn't active. The optimistic update above handled the UI.
      // If currentUser, the snapshot listener will provide the authoritative state from Firestore,
      // reconciling with the optimistic update.

    } catch (err: any) {
      console.error('[useFirestorePlayers] Error deleting player:', err);
      setError(`Delete player error: ${err.message || 'Failed to delete player'}`);
      // Consider strategies to revert optimistic update if Firestore/Dexie delete fails,
      // e.g., by re-fetching or adding the player back to the state.
      // For now, the snapshot listener should correct inconsistencies if online and Firestore operation failed.
      throw new Error('Failed to delete player');
    } finally {
      // isLoading is managed by the snapshot listener when online, or the load from local DB when offline/no-auth.
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
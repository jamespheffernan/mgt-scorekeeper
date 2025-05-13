import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { splitNameParts } from './nameFormatter';
import { millbrookDb } from '../db/millbrookDb';
import { Player } from '../db/API-GameState';
import { splitNameParts as nameUtilsSplitNameParts } from './nameUtils';

/**
 * Migrates all Firestore player records to include first/last name fields
 */
export const migrateFirestorePlayers = async (): Promise<{ migrated: number; errors: number }> => {
  const globalPlayersCollection = 'sharedPlayers';
  const result = { migrated: 0, errors: 0 };
  
  try {
    const playersRef = collection(db, globalPlayersCollection);
    const snapshot = await getDocs(playersRef);
    
    const migrationPromises = snapshot.docs.map(async docSnapshot => {
      const player = docSnapshot.data();
      
      // Skip if already migrated
      if (player.first && player.last) return;
      
      try {
        const { first, last } = splitNameParts(player.name || '');
        
        await updateDoc(doc(db, globalPlayersCollection, docSnapshot.id), {
          first,
          last,
          updatedAt: new Date().toISOString()
        });
        
        result.migrated++;
      } catch (error) {
        console.error(`Error migrating player ${docSnapshot.id}:`, error);
        result.errors++;
      }
    });
    
    await Promise.all(migrationPromises);
    return result;
  } catch (error) {
    console.error('Firestore migration failed:', error);
    throw error;
  }
};

/**
 * Migrates all players in the database from name-only to first/last structure
 * This should be run once during a version upgrade
 */
export async function migratePlayerNames(): Promise<{
  migrated: number;
  errors: number;
  total: number;
}> {
  try {
    console.log('Starting player name migration...');
    // Get all players
    const players = await millbrookDb.getAllPlayers();
    
    let migrated = 0;
    let errors = 0;
    const updates = [];
    
    // Identify players needing migration
    for (const player of players) {
      try {
        if (player.name && (!player.first || !player.last)) {
          const { first, last } = splitNameParts(player.name);
          updates.push({
            id: player.id,
            changes: { 
              first,
              last,
              // Keep name for backward compatibility
              name: player.name 
            }
          });
          migrated++;
        }
      } catch (err) {
        console.error(`Error processing player ${player.id}:`, err);
        errors++;
      }
    }
    
    // Process updates individually since we don't have batch update
    if (updates.length > 0) {
      for (const update of updates) {
        try {
          // Use individual updates since batchUpdatePlayers doesn't exist
          // First get the player by ID if we have that method
          let existingPlayer: Player | null = null;
          
          try {
            // Try to get player with getPlayer if it exists
            // @ts-ignore - Method may exist in some environments
            existingPlayer = await millbrookDb.getPlayer?.(update.id);
          } catch (err) {
            // Fallback: find the player in the array we already have
            existingPlayer = players.find(p => p.id === update.id) || null;
          }
          
          if (existingPlayer) {
            await millbrookDb.savePlayer({
              ...existingPlayer,
              ...update.changes
            });
          }
        } catch (err) {
          console.error(`Error updating player ${update.id}:`, err);
          errors++;
        }
      }
    }
    
    console.log(`Player name migration complete: ${migrated} players migrated, ${errors} errors`);
    
    return {
      migrated,
      errors,
      total: players.length
    };
  } catch (err) {
    console.error('Failed to migrate player names:', err);
    throw err;
  }
}

/**
 * Migrates GameHistory objects to use playerInfo instead of playerNames/teamAssignments
 */
export async function migrateGameHistory(): Promise<{
  migrated: number;
  errors: number;
  total: number;
}> {
  try {
    console.log('Starting game history migration...');
    // Get all game history records
    const historyRecords = await millbrookDb.getAllGameHistory();
    
    let migrated = 0;
    let errors = 0;
    
    // Process each history record
    for (const record of historyRecords) {
      try {
        // Skip if already migrated
        if (record.playerInfo && record.playerInfo.length > 0) {
          continue;
        }
        
        // Check if we have the legacy properties
        // @ts-ignore - Handling backward compatibility
        if (record.playerNames && record.teamAssignments) {
          // Create playerInfo array
          const playerInfo = [];
          
          // @ts-ignore - Handling backward compatibility
          for (let i = 0; i < record.playerNames.length; i++) {
            // @ts-ignore - Handling backward compatibility
            const name = record.playerNames[i];
            const { first, last } = splitNameParts(name);
            
            playerInfo.push({
              id: `legacy-player-${i}`, // Generate a dummy ID
              first,
              last,
              // @ts-ignore - Handling backward compatibility
              team: record.teamAssignments[i]
            });
          }
          
          // Update the record
          if (playerInfo.length > 0) {
            record.playerInfo = playerInfo;
            await millbrookDb.saveGameHistory(record);
            migrated++;
          }
        }
      } catch (err) {
        console.error(`Error migrating game history ${record.id}:`, err);
        errors++;
      }
    }
    
    console.log(`Game history migration complete: ${migrated} records migrated, ${errors} errors`);
    
    return {
      migrated,
      errors,
      total: historyRecords.length
    };
  } catch (err) {
    console.error('Failed to migrate game history:', err);
    throw err;
  }
}

/**
 * Run all migrations in the correct order
 */
export async function runAllMigrations(): Promise<boolean> {
  try {
    const playerResult = await migratePlayerNames();
    const historyResult = await migrateGameHistory();
    
    return playerResult.errors === 0 && historyResult.errors === 0;
  } catch (err) {
    console.error('Migration failed:', err);
    return false;
  }
} 
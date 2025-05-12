import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { splitNameParts } from './nameFormatter';

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
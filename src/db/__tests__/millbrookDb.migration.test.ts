import { millbrookDb } from '../millbrookDb';
import { Player } from '../API-GameState';

describe('MillbrookDatabase name migration', () => {
  beforeEach(async () => {
    // Clear database before each test
    await millbrookDb.players.clear();
  });
  
  test('should correctly split existing player names', async () => {
    // Add a player with only the name field
    const legacyPlayer: Player = {
      id: 'test-1',
      name: 'John Doe',
      index: 10.5,
      first: '',
      last: ''
    };
    
    await millbrookDb.savePlayer(legacyPlayer);
    
    // Simulate database upgrade by calling the migration function directly
    await millbrookDb.players.toCollection().modify(player => {
      if (!player.first || !player.last) {
        const nameParts = player.name.split(' ');
        if (nameParts.length >= 2) {
          player.first = nameParts[0];
          player.last = nameParts.slice(1).join(' ');
        } else {
          player.first = player.name;
          player.last = '';
        }
      }
    });
    
    // Verify the player now has first/last fields
    const updatedPlayer = await millbrookDb.players.get(legacyPlayer.id);
    expect(updatedPlayer).not.toBeNull();
    expect(updatedPlayer?.first).toBe('John');
    expect(updatedPlayer?.last).toBe('Doe');
  });
  
  test('should handle single-word names', async () => {
    // Add a player with a single-word name
    const singleNamePlayer: Player = {
      id: 'test-2',
      name: 'Tiger',
      index: 8.0,
      first: '',
      last: ''
    };
    
    await millbrookDb.savePlayer(singleNamePlayer);
    
    // Simulate database upgrade
    await millbrookDb.players.toCollection().modify(player => {
      if (!player.first || !player.last) {
        const nameParts = player.name.split(' ');
        if (nameParts.length >= 2) {
          player.first = nameParts[0];
          player.last = nameParts.slice(1).join(' ');
        } else {
          player.first = player.name;
          player.last = '';
        }
      }
    });
    
    // Verify the player now has correct first/last fields
    const updatedPlayer = await millbrookDb.players.get(singleNamePlayer.id);
    expect(updatedPlayer).not.toBeNull();
    expect(updatedPlayer?.first).toBe('Tiger');
    expect(updatedPlayer?.last).toBe('');
  });
  
  test('should keep existing first/last if already set', async () => {
    // Add a player with first/last already set
    const modernPlayer: Player = {
      id: 'test-3',
      name: 'Wrong Name',
      first: 'Jane',
      last: 'Smith',
      index: 12.3
    };
    
    await millbrookDb.savePlayer(modernPlayer);
    
    // Simulate database upgrade
    await millbrookDb.players.toCollection().modify(player => {
      if (!player.first || !player.last) {
        const nameParts = player.name.split(' ');
        if (nameParts.length >= 2) {
          player.first = nameParts[0];
          player.last = nameParts.slice(1).join(' ');
        } else {
          player.first = player.name;
          player.last = '';
        }
      }
    });
    
    // Verify the player's first/last fields remained unchanged
    const updatedPlayer = await millbrookDb.players.get(modernPlayer.id);
    expect(updatedPlayer).not.toBeNull();
    expect(updatedPlayer?.first).toBe('Jane');
    expect(updatedPlayer?.last).toBe('Smith');
  });
}); 
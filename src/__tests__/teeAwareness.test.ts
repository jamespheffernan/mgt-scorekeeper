import { allocateStrokesMultiTee } from '../calcEngine/strokeAllocator';
import { getPlayerStrokeIndexes } from '../store/gameStore';

// Mock the millbrookDb since we don't want to hit the database in tests
jest.mock('../db/millbrookDb', () => ({
  millbrookDb: {
    getCourse: jest.fn()
  }
}));

// Import the mocked module
import { millbrookDb } from '../db/millbrookDb';

describe('Tee Awareness Feature', () => {
  // Mock data
  const mockCourse = {
    id: 'course-1',
    name: 'Test Course',
    location: 'Test Location',
    teeOptions: [
      {
        id: 'tee-blue',
        name: 'Blue',
        color: 'Blue',
        gender: 'M',
        rating: 72.1,
        slope: 131,
        holes: Array(18).fill(0).map((_, idx) => ({
          number: idx + 1,
          par: idx % 3 === 0 ? 3 : idx % 3 === 1 ? 4 : 5,
          yardage: 100 + (idx * 20),
          strokeIndex: [7, 15, 5, 11, 1, 13, 3, 17, 9, 2, 14, 6, 18, 10, 4, 16, 8, 12][idx]
        }))
      },
      {
        id: 'tee-white',
        name: 'White',
        color: 'White',
        gender: 'M',
        rating: 70.5,
        slope: 128,
        holes: Array(18).fill(0).map((_, idx) => ({
          number: idx + 1,
          par: idx % 3 === 0 ? 3 : idx % 3 === 1 ? 4 : 5,
          yardage: 100 + (idx * 15),
          strokeIndex: [5, 17, 7, 13, 1, 9, 3, 15, 11, 2, 16, 8, 18, 12, 4, 10, 6, 14][idx]
        }))
      },
      {
        id: 'tee-red',
        name: 'Red',
        color: 'Red',
        gender: 'F',
        rating: 68.2,
        slope: 119,
        holes: Array(18).fill(0).map((_, idx) => ({
          number: idx + 1,
          par: idx % 3 === 0 ? 3 : idx % 3 === 1 ? 4 : 5,
          yardage: 100 + (idx * 10),
          strokeIndex: [9, 13, 3, 17, 1, 5, 7, 15, 11, 2, 6, 10, 18, 16, 4, 12, 8, 14][idx]
        }))
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup the mock to return our test course
    (millbrookDb.getCourse as jest.Mock).mockResolvedValue(mockCourse);
  });

  describe('allocateStrokesMultiTee Function', () => {
    test('TC-06: Allocates strokes correctly with multiple tees', () => {
      const indexes = [6.1, 8.4, 9.3, 10.2];
      
      // Different tees have different stroke indexes
      const playerSIs = [
        [7, 15, 5, 11, 1, 13, 3, 17, 9, 2, 14, 6, 18, 10, 4, 16, 8, 12], // Blue
        [5, 17, 7, 13, 1, 9, 3, 15, 11, 2, 16, 8, 18, 12, 4, 10, 6, 14], // White
        [7, 15, 5, 11, 1, 13, 3, 17, 9, 2, 14, 6, 18, 10, 4, 16, 8, 12], // Blue
        [9, 13, 3, 17, 1, 5, 7, 15, 11, 2, 6, 10, 18, 16, 4, 12, 8, 14]  // Red
      ];
      
      const result = allocateStrokesMultiTee(indexes, playerSIs);
      
      // Verify total stroke counts
      expect(result[0].reduce((sum, count) => sum + count, 0)).toBe(0); // Lowest index player
      expect(result[1].reduce((sum, count) => sum + count, 0)).toBe(2);
      expect(result[2].reduce((sum, count) => sum + count, 0)).toBe(3);
      expect(result[3].reduce((sum, count) => sum + count, 0)).toBe(4);
      
      // Verify strokes are on the correct holes based on player's SI
      for (let playerIdx = 1; playerIdx < 4; playerIdx++) {
        const playerSI = playerSIs[playerIdx];
        const playerStrokes = playerIdx === 1 ? 2 : playerIdx === 2 ? 3 : 4;
        
        // Get sorted hole indexes by SI
        const sortedHoleIndexes = [...Array(18).keys()]
          .sort((a, b) => playerSI[a] - playerSI[b]);
        
        // The n lowest SI holes should have strokes
        for (let i = 0; i < playerStrokes; i++) {
          expect(result[playerIdx][sortedHoleIndexes[i]]).toBe(1);
        }
      }
    });
  });
  
  describe('getPlayerStrokeIndexes Function', () => {
    test('TC-07: Returns correct SI arrays for each player', async () => {
      const playerTeeIds = ['tee-blue', 'tee-white', 'tee-blue', 'tee-red'];
      
      const result = await getPlayerStrokeIndexes('course-1', playerTeeIds, 1);
      
      // Verify we have 4 players' worth of SI arrays
      expect(result).toHaveLength(4);
      
      // Verify each player's SI array matches their tee
      // Blue tees (players 0 and 2)
      expect(result?.[0]).toEqual(mockCourse.teeOptions[0].holes.map(h => h.strokeIndex));
      expect(result?.[2]).toEqual(mockCourse.teeOptions[0].holes.map(h => h.strokeIndex));
      
      // White tees (player 1)
      expect(result?.[1]).toEqual(mockCourse.teeOptions[1].holes.map(h => h.strokeIndex));
      
      // Red tees (player 3)
      expect(result?.[3]).toEqual(mockCourse.teeOptions[2].holes.map(h => h.strokeIndex));
    });
    
    test('TC-08: Handles missing course data gracefully', async () => {
      (millbrookDb.getCourse as jest.Mock).mockResolvedValue(null);
      
      const result = await getPlayerStrokeIndexes('invalid-course', ['tee-1', 'tee-2', 'tee-3', 'tee-4'], 1);
      
      expect(result).toBeNull();
    });
    
    test('TC-09: Returns null for missing course or tee IDs', async () => {
      // Test with undefined courseId
      let result = await getPlayerStrokeIndexes(undefined, ['tee-1', 'tee-2', 'tee-3', 'tee-4'], 1);
      expect(result).toBeNull();
      
      // Test with undefined playerTeeIds
      result = await getPlayerStrokeIndexes('course-1', undefined, 1);
      expect(result).toBeNull();
    });
  });
}); 
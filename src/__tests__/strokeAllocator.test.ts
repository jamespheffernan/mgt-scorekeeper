import { allocateStrokes, allocateStrokesMultiTee } from '../calcEngine/strokeAllocator';

describe('Stroke Allocator', () => {
  // Standard stroke index table (1-18)
  const standardSI = [7, 15, 5, 11, 1, 13, 3, 17, 9, 2, 14, 6, 18, 10, 4, 16, 8, 12];
  
  // Tests for allocateStrokes function
  describe('Standard Allocation', () => {
    test('TC-01: Identical indexes should result in no strokes', () => {
      const indexes = [10.0, 10.0, 10.0, 10.0];
      const result = allocateStrokes(indexes, standardSI);
      
      // All players should have no strokes on any hole
      expect(result.every(playerStrokes => 
        playerStrokes.every(holeStroke => holeStroke === 0)
      )).toBe(true);
    });
    
    test('TC-02: Indexes 6.1/8.4/9.3/10.2 should produce correct stroke counts', () => {
      const indexes = [6.1, 8.4, 9.3, 10.2];
      const result = allocateStrokes(indexes, standardSI);
      
      // Player 0 is the lowest, should get 0 strokes
      expect(result[0].reduce((sum, count) => sum + count, 0)).toBe(0);
      
      // Player 1 should get 2 strokes (8.4 - 6.1 = 2.3 -> floor -> 2)
      expect(result[1].reduce((sum, count) => sum + count, 0)).toBe(2);
      
      // Player 2 should get 3 strokes (9.3 - 6.1 = 3.2 -> floor -> 3)
      expect(result[2].reduce((sum, count) => sum + count, 0)).toBe(3);
      
      // Player 3 should get 4 strokes (10.2 - 6.1 = 4.1 -> floor -> 4)
      expect(result[3].reduce((sum, count) => sum + count, 0)).toBe(4);
      
      // Verify strokes are on the correct holes (lowest SI first)
      // The first n holes by SI should be 1 for each player
      const sortedHoleIndexes = [...Array(18).keys()]
        .sort((a, b) => standardSI[a] - standardSI[b]);
      
      // For player 1 (2 strokes)
      for (let i = 0; i < 2; i++) {
        expect(result[1][sortedHoleIndexes[i]]).toBe(1);
      }
      
      // For player 2 (3 strokes)
      for (let i = 0; i < 3; i++) {
        expect(result[2][sortedHoleIndexes[i]]).toBe(1);
      }
      
      // For player 3 (4 strokes)
      for (let i = 0; i < 4; i++) {
        expect(result[3][sortedHoleIndexes[i]]).toBe(1);
      }
    });
    
    test('TC-03: Handles strokes > 18 correctly (second round allocation)', () => {
      // Player with handicap 20 higher than lowest
      const indexes = [5.0, 25.0];
      const result = allocateStrokes(indexes, standardSI);
      
      // Player 1 should get 20 strokes (25.0 - 5.0 = 20)
      // That's 18 strokes for first round + 2 for second round
      expect(result[1].reduce((sum, count) => sum + count, 0)).toBe(20);
      
      // Get sorted hole indexes by SI
      const sortedHoleIndexes = [...Array(18).keys()]
        .sort((a, b) => standardSI[a] - standardSI[b]);
      
      // All 18 holes should have at least one stroke
      for (let i = 0; i < 18; i++) {
        expect(result[1][sortedHoleIndexes[i]]).toBeGreaterThanOrEqual(1);
      }
      
      // The first 2 holes by SI should have two strokes each
      expect(result[1][sortedHoleIndexes[0]]).toBe(2);
      expect(result[1][sortedHoleIndexes[1]]).toBe(2);
      
      // The rest should have exactly 1 stroke
      for (let i = 2; i < 18; i++) {
        expect(result[1][sortedHoleIndexes[i]]).toBe(1);
      }
    });
  });

  // Tests for allocateStrokesMultiTee function
  describe('Multi-Tee Allocation', () => {
    test('TC-04: Each player can have different stroke indexes', () => {
      const indexes = [6.1, 8.4, 9.3, 10.2];
      
      // Different tees have different stroke indexes
      const playerSIs = [
        [7, 15, 5, 11, 1, 13, 3, 17, 9, 2, 14, 6, 18, 10, 4, 16, 8, 12], // Blue tees
        [5, 17, 7, 13, 1, 9, 3, 15, 11, 2, 16, 8, 18, 12, 4, 10, 6, 14], // White tees
        [7, 15, 5, 11, 1, 13, 3, 17, 9, 2, 14, 6, 18, 10, 4, 16, 8, 12], // Blue tees
        [9, 13, 3, 17, 1, 5, 7, 15, 11, 2, 6, 10, 18, 16, 4, 12, 8, 14]  // Gold tees
      ];
      
      const result = allocateStrokesMultiTee(indexes, playerSIs);
      
      // Player 0 is the lowest, should get 0 strokes
      expect(result[0].reduce((sum, count) => sum + count, 0)).toBe(0);
      
      // Player 1 should get 2 strokes
      expect(result[1].reduce((sum, count) => sum + count, 0)).toBe(2);
      
      // Player 2 should get 3 strokes
      expect(result[2].reduce((sum, count) => sum + count, 0)).toBe(3);
      
      // Player 3 should get 4 strokes
      expect(result[3].reduce((sum, count) => sum + count, 0)).toBe(4);
      
      // For each player, verify strokes are on the correct holes based on THEIR SI
      for (let playerIdx = 1; playerIdx < 4; playerIdx++) {
        const playerSI = playerSIs[playerIdx];
        const playerStrokes = playerIdx === 1 ? 2 : playerIdx === 2 ? 3 : 4;
        
        // Get this player's holes sorted by SI
        const sortedHoleIndexes = [...Array(18).keys()]
          .sort((a, b) => playerSI[a] - playerSI[b]);
        
        // Check the right holes got strokes based on this player's SI
        for (let i = 0; i < playerStrokes; i++) {
          expect(result[playerIdx][sortedHoleIndexes[i]]).toBe(1);
        }
        
        // Other holes should have no strokes
        for (let i = playerStrokes; i < 18; i++) {
          expect(result[playerIdx][sortedHoleIndexes[i]]).toBe(0);
        }
      }
    });
    
    test('TC-05: Higher handicaps still get multiple strokes per hole', () => {
      const indexes = [5.0, 25.0];
      const playerSIs = [
        [7, 15, 5, 11, 1, 13, 3, 17, 9, 2, 14, 6, 18, 10, 4, 16, 8, 12], // Player 1
        [9, 13, 3, 17, 1, 5, 7, 15, 11, 2, 6, 10, 18, 16, 4, 12, 8, 14]  // Player 2
      ];
      
      const result = allocateStrokesMultiTee(indexes, playerSIs);
      
      // Player 1 should get 20 strokes (25.0 - 5.0 = 20)
      expect(result[1].reduce((sum, count) => sum + count, 0)).toBe(20);
      
      // Get player 2's holes sorted by SI
      const sortedHoleIndexes = [...Array(18).keys()]
        .sort((a, b) => playerSIs[1][a] - playerSIs[1][b]);
      
      // All 18 holes should have at least one stroke
      for (let i = 0; i < 18; i++) {
        expect(result[1][sortedHoleIndexes[i]]).toBeGreaterThanOrEqual(1);
      }
      
      // The first 2 holes by SI should have two strokes each
      expect(result[1][sortedHoleIndexes[0]]).toBe(2);
      expect(result[1][sortedHoleIndexes[1]]).toBe(2);
    });
  });
}); 
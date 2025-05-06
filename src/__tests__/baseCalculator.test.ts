import {
  DoublingState,
  getInitialDoublingState,
  calculateBase,
  callDouble,
  advanceToNextHole
} from '../calcEngine/baseCalculator';

describe('Base Calculator', () => {
  
  test('TC-01: Initial base values for holes 1 and 2', () => {
    expect(calculateBase(1, 0)).toBe(1);
    expect(calculateBase(2, 0)).toBe(2); // Fixed at 2 for hole 2 with no doubles
  });
  
  test('TC-02: Base formula works correctly for holes 2 and 3+', () => {
    // hole 2: base = 2 (unless explicitly doubled)
    expect(calculateBase(2, 0)).toBe(2);  // Fixed at 2
    expect(calculateBase(2, 1)).toBe(4);  // 2 * 2^1 = 4 (after doubling)
    
    // hole 3+: base = 2 * 2^doubles
    expect(calculateBase(3, 0)).toBe(2);  // 2 * 2^0 = 2
    expect(calculateBase(3, 1)).toBe(4);  // 2 * 2^1 = 4
    expect(calculateBase(3, 2)).toBe(8);  // 2 * 2^2 = 8
    expect(calculateBase(3, 3)).toBe(16); // 2 * 2^3 = 16
    
    // Hole number doesn't matter after hole 2
    expect(calculateBase(4, 2)).toBe(8);
    expect(calculateBase(10, 2)).toBe(8);
    expect(calculateBase(18, 2)).toBe(8);
  });
  
  test('TC-03: Doubling only works for trailing team', () => {
    // Start with hole 3, base = 2, Red is leading
    const state: DoublingState = {
      currentHole: 3,
      base: 2,
      doubles: 0,
      carry: 0,
      leadingTeam: 'Red',
      doubleUsedThisHole: false
    };
    
    // Red can't double because they're leading
    const redAttempt = callDouble(state, 'Red');
    expect(redAttempt).toEqual(state); // Unchanged
    
    // Blue can double because they're trailing
    const blueAttempt = callDouble(state, 'Blue');
    expect(blueAttempt.doubles).toBe(1);
    expect(blueAttempt.base).toBe(4);
    expect(blueAttempt.doubleUsedThisHole).toBe(true);
  });
  
  test('TC-04: Can only double once per hole', () => {
    // Start with hole 3, base = 2, Blue is leading
    const state: DoublingState = {
      currentHole: 3,
      base: 2,
      doubles: 0,
      carry: 0,
      leadingTeam: 'Blue',
      doubleUsedThisHole: false
    };
    
    // Red doubles
    const afterDouble = callDouble(state, 'Red');
    expect(afterDouble.doubles).toBe(1);
    expect(afterDouble.base).toBe(4);
    
    // Try to double again
    const afterSecondDouble = callDouble(afterDouble, 'Red');
    expect(afterSecondDouble).toEqual(afterDouble); // Unchanged
  });
  
  test('TC-05: Base progression matches sequence 1,2,2,2,2,2,4,4,...', () => {
    let state = getInitialDoublingState();
    
    // Check initial state
    expect(state.currentHole).toBe(1);
    expect(state.base).toBe(1);
    
    // Advance to hole 2
    state = advanceToNextHole(state, 'Red');
    expect(state.currentHole).toBe(2);
    expect(state.base).toBe(2);
    
    // Advance to hole 3 (no doubles yet)
    state = advanceToNextHole(state, 'Blue');
    expect(state.currentHole).toBe(3);
    expect(state.base).toBe(2);
    
    // Advance to holes 4, 5, 6 without doubles
    state = advanceToNextHole(state, 'Blue');
    expect(state.currentHole).toBe(4);
    expect(state.base).toBe(2);
    
    state = advanceToNextHole(state, 'Blue');
    expect(state.currentHole).toBe(5);
    expect(state.base).toBe(2);
    
    state = advanceToNextHole(state, 'Blue');
    expect(state.currentHole).toBe(6);
    expect(state.base).toBe(2);
    
    // Call a double and advance to hole 7
    state = callDouble(state, 'Red');
    expect(state.base).toBe(4);
    expect(state.doubles).toBe(1);
    
    state = advanceToNextHole(state, 'Blue');
    expect(state.currentHole).toBe(7);
    expect(state.base).toBe(4);
    
    state = advanceToNextHole(state, 'Blue');
    expect(state.currentHole).toBe(8);
    expect(state.base).toBe(4);
    
    // This matches the expected progression: 1,2,2,2,2,2,4,4,...
  });
  
  test('TC-06: Push carries forward the base amount', () => {
    const state: DoublingState = {
      currentHole: 5,
      base: 2,
      doubles: 0,
      carry: 0,
      leadingTeam: 'Blue',
      doubleUsedThisHole: false
    };
    
    // Push on hole 5
    const afterPush = advanceToNextHole(state, 'Push');
    
    // The carry should be the base amount
    expect(afterPush.currentHole).toBe(6);
    expect(afterPush.carry).toBe(2);
    expect(afterPush.base).toBe(2);
    
    // Another push on hole 6
    const afterSecondPush = advanceToNextHole(afterPush, 'Push');
    
    // The carry should now be the previous carry + the base amount
    expect(afterSecondPush.currentHole).toBe(7);
    expect(afterSecondPush.carry).toBe(4); // 2 (prev carry) + 2 (base)
    expect(afterSecondPush.base).toBe(2);
    
    // Now Red wins hole 7
    const afterWin = advanceToNextHole(afterSecondPush, 'Red');
    
    // The carry is reset to 0
    expect(afterWin.currentHole).toBe(8);
    expect(afterWin.carry).toBe(0);
    expect(afterWin.leadingTeam).toBe('Red');
  });
  
  test('TC-07: Additional carry from junk is added correctly', () => {
    const state: DoublingState = {
      currentHole: 9,
      base: 4,
      doubles: 1,
      carry: 2, // Some existing carry
      leadingTeam: 'Red',
      doubleUsedThisHole: false
    };
    
    // Push with additional carry from junk
    const afterPush = advanceToNextHole(state, 'Push', 3);
    
    // Carry should include: previous carry + base + additional
    expect(afterPush.carry).toBe(9); // 2 (prev) + 4 (base) + 3 (additional)
  });
  
  test('TC-08: Hole 2 base calculation with doubling', () => {
    // Test the new logic for hole 2 base calculation
    expect(calculateBase(2, 0)).toBe(2);  // 2 (fixed base for hole 2)
    expect(calculateBase(2, 1)).toBe(4);  // 2 * 2^(1-1) * 2 = 4 (doubled once)
    expect(calculateBase(2, 2)).toBe(8);  // 2 * 2^(2-1) * 2 = 8 (doubled twice)
    
    // Compare with hole 3+ for same number of doubles
    expect(calculateBase(3, 0)).toBe(2);  // 2 * 2^0 = 2
    expect(calculateBase(3, 1)).toBe(4);  // 2 * 2^1 = 4 
    expect(calculateBase(3, 2)).toBe(8);  // 2 * 2^2 = 8
  });
}); 
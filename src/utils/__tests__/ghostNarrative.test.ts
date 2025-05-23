import { generateGhostNarrative, getGhostRevealSummary } from '../ghostNarrative';
import { Player } from '../../db/API-GameState';
import { JunkFlags } from '../../store/gameStore';

describe('Ghost Narrative Generation', () => {
  const mockGhostPlayer: Player = {
    id: 'ghost-1',
    name: 'Ghost (Alice)',
    first: 'Ghost',
    last: '(Alice)',
    index: 15,
    isGhost: true,
    sourcePlayerId: '1'
  };

  describe('generateGhostNarrative', () => {
    it('should generate hole-in-one narrative', () => {
      const narrative = generateGhostNarrative({
        player: mockGhostPlayer,
        grossScore: 1,
        par: 3,
        hole: 5,
        yardage: 150
      });

      expect(narrative).toContain('HOLE-IN-ONE');
      expect(narrative).toContain('Alice');
      expect(narrative).toContain('150-yard');
      expect(narrative).toContain('par 3');
    });

    it('should generate eagle narrative', () => {
      const narrative = generateGhostNarrative({
        player: mockGhostPlayer,
        grossScore: 3,
        par: 5,
        hole: 12
      });

      expect(narrative).toContain('Eagle');
      expect(narrative).toContain('Alice');
      expect(narrative).toContain('2 under par');
      expect(narrative).toContain('brilliant 3');
    });

    it('should generate birdie narrative', () => {
      const narrative = generateGhostNarrative({
        player: mockGhostPlayer,
        grossScore: 3,
        par: 4,
        hole: 8
      });

      expect(narrative).toContain('Alice');
      expect(narrative).toMatch(/birdie|putt|Sweet/i);
    });

    it('should generate par narrative', () => {
      const narrative = generateGhostNarrative({
        player: mockGhostPlayer,
        grossScore: 4,
        par: 4,
        hole: 10
      });

      expect(narrative).toContain('Alice');
      expect(narrative).toMatch(/par|steady|book|target/i);
    });

    it('should generate bogey narrative', () => {
      const narrative = generateGhostNarrative({
        player: mockGhostPlayer,
        grossScore: 5,
        par: 4,
        hole: 6
      });

      expect(narrative).toContain('Alice');
      expect(narrative).toMatch(/bogey|battles|stroke/i);
    });

    it('should generate double bogey narrative', () => {
      const narrative = generateGhostNarrative({
        player: mockGhostPlayer,
        grossScore: 6,
        par: 4,
        hole: 14
      });

      expect(narrative).toContain('Alice');
      expect(narrative).toContain('Double bogey');
    });

    it('should include junk event narratives', () => {
      const junkFlags: JunkFlags = {
        hadBunkerShot: true,
        isOnGreenFromTee: true,
        isClosestOnGreen: false,
        hadThreePutts: false,
        isLongDrive: false
      };

      const narrative = generateGhostNarrative({
        player: mockGhostPlayer,
        grossScore: 2,
        par: 3,
        hole: 17,
        junkFlags
      });

      expect(narrative).toContain('Escapes the sand with style');
      expect(narrative).toContain('Finds the green from the tee');
    });

    it('should handle long drive on hole 17', () => {
      const junkFlags: JunkFlags = {
        hadBunkerShot: false,
        isOnGreenFromTee: false,
        isClosestOnGreen: false,
        hadThreePutts: false,
        isLongDrive: true
      };

      const narrative = generateGhostNarrative({
        player: mockGhostPlayer,
        grossScore: 4,
        par: 4,
        hole: 17,
        junkFlags
      });

      expect(narrative).toContain('Crushes the long drive on 17');
    });

    it('should handle multiple junk events', () => {
      const junkFlags: JunkFlags = {
        hadBunkerShot: true,
        isOnGreenFromTee: false,
        isClosestOnGreen: true,
        hadThreePutts: false,
        isLongDrive: false
      };

      const narrative = generateGhostNarrative({
        player: mockGhostPlayer,
        grossScore: 3,
        par: 4,
        hole: 8,
        junkFlags
      });

      expect(narrative).toContain('Escapes the sand with style');
      expect(narrative).toContain('Sticks it closest to the pin');
    });

    it('should handle ghost with undefined name gracefully', () => {
      const ghostWithUndefinedName: Player = {
        ...mockGhostPlayer,
        name: undefined
      };

      const narrative = generateGhostNarrative({
        player: ghostWithUndefinedName,
        grossScore: 4,
        par: 4,
        hole: 1
      });

      expect(narrative).toContain('Ghost');
      expect(narrative).not.toContain('undefined');
    });
  });

  describe('getGhostRevealSummary', () => {
    it('should generate eagle summary', () => {
      const summary = getGhostRevealSummary(3, 5, 'Ghost (Bob)');
      expect(summary).toBe('Bob: 3 (Eagle!)');
    });

    it('should generate birdie summary', () => {
      const summary = getGhostRevealSummary(3, 4, 'Ghost (Charlie)');
      expect(summary).toBe('Charlie: 3 (Birdie)');
    });

    it('should generate par summary', () => {
      const summary = getGhostRevealSummary(4, 4, 'Ghost (David)');
      expect(summary).toBe('David: 4 (Par)');
    });

    it('should generate bogey summary', () => {
      const summary = getGhostRevealSummary(5, 4, 'Ghost (Eve)');
      expect(summary).toBe('Eve: 5 (Bogey)');
    });

    it('should generate double bogey summary', () => {
      const summary = getGhostRevealSummary(6, 4, 'Ghost (Frank)');
      expect(summary).toBe('Frank: 6 (Double)');
    });

    it('should generate triple+ bogey summary', () => {
      const summary = getGhostRevealSummary(8, 4, 'Ghost (Grace)');
      expect(summary).toBe('Grace: 8 (+4)');
    });

    it('should handle name without parentheses', () => {
      const summary = getGhostRevealSummary(4, 4, 'Invalid Ghost Name');
      expect(summary).toBe('Ghost: 4 (Par)');
    });

    it('should handle undefined name gracefully', () => {
      const summary = getGhostRevealSummary(4, 4, undefined as any);
      expect(summary).toBe('Ghost: 4 (Par)');
    });
  });
}); 
import { generateGhostScores, generateGhostJunkEvents, GhostJunkEvents } from '../ghostScoreGenerator';
import { HoleInfo } from '../../db/courseModel';

// Mock course data for testing
const mockCourse = {
  holes: Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: i % 3 === 0 ? 3 : i % 3 === 1 ? 4 : 5, // Mix of pars
    strokeIndex: i + 1,
    yardage: 400,
    description: `Hole ${i + 1}`
  })) as HoleInfo[]
};

describe('generateGhostJunkEvents', () => {
  it('should generate consistent junk events for the same seed', () => {
    const grossScores = generateGhostScores(10, mockCourse, 42);
    const junkEvents1 = generateGhostJunkEvents(10, grossScores, mockCourse, 42);
    const junkEvents2 = generateGhostJunkEvents(10, grossScores, mockCourse, 42);
    
    expect(junkEvents1).toEqual(junkEvents2);
  });

  it('should generate different events for different seeds', () => {
    const grossScores = generateGhostScores(10, mockCourse, 42);
    const junkEvents1 = generateGhostJunkEvents(10, grossScores, mockCourse, 42);
    const junkEvents2 = generateGhostJunkEvents(10, grossScores, mockCourse, 43);
    
    expect(junkEvents1).not.toEqual(junkEvents2);
  });

  it('should generate events for all 18 holes', () => {
    const grossScores = generateGhostScores(10, mockCourse, 42);
    const junkEvents = generateGhostJunkEvents(10, grossScores, mockCourse, 42);
    
    expect(Object.keys(junkEvents)).toHaveLength(18);
    for (let i = 1; i <= 18; i++) {
      expect(junkEvents[i]).toBeDefined();
      expect(junkEvents[i]).toHaveProperty('hadBunkerShot');
      expect(junkEvents[i]).toHaveProperty('isOnGreenFromTee');
      expect(junkEvents[i]).toHaveProperty('hadThreePutts');
      expect(junkEvents[i]).toHaveProperty('isLongDrive');
    }
  });

  it('should only generate LD10 on hole 17', () => {
    const grossScores = generateGhostScores(5, mockCourse, 42);
    let hasLD10OnOtherHoles = false;
    let hasLD10OnHole17 = false;
    
    // Run multiple iterations to check distribution
    for (let seed = 0; seed < 100; seed++) {
      const junkEvents = generateGhostJunkEvents(5, grossScores, mockCourse, seed);
      
      for (let hole = 1; hole <= 18; hole++) {
        if (junkEvents[hole].isLongDrive) {
          if (hole === 17) {
            hasLD10OnHole17 = true;
          } else {
            hasLD10OnOtherHoles = true;
          }
        }
      }
    }
    
    expect(hasLD10OnOtherHoles).toBe(false);
    expect(hasLD10OnHole17).toBe(true);
  });

  it('should only generate greenies on par-3 holes', () => {
    const grossScores = generateGhostScores(5, mockCourse, 42);
    
    // Run multiple iterations
    for (let seed = 0; seed < 50; seed++) {
      const junkEvents = generateGhostJunkEvents(5, grossScores, mockCourse, seed);
      
      for (let hole = 1; hole <= 18; hole++) {
        const par = mockCourse.holes[hole - 1].par;
        if (junkEvents[hole].isOnGreenFromTee && par !== 3) {
          fail(`Greenie generated on non-par-3 hole ${hole} (par ${par})`);
        }
      }
    }
  });

  it('should not generate sandies on scores worse than par', () => {
    const grossScores = generateGhostScores(20, mockCourse, 42); // High handicap likely to score over par
    
    for (let seed = 0; seed < 50; seed++) {
      const junkEvents = generateGhostJunkEvents(20, grossScores, mockCourse, seed);
      
      for (let hole = 1; hole <= 18; hole++) {
        const par = mockCourse.holes[hole - 1].par;
        const score = grossScores[hole - 1];
        
        if (junkEvents[hole].hadBunkerShot && score > par) {
          fail(`Sandie generated on score ${score} (par ${par}) on hole ${hole}`);
        }
      }
    }
  });

  describe('statistical validation', () => {
    it('should generate appropriate birdie rates by handicap', () => {
      const iterations = 1000;
      const handicaps = [0, 10, 20];
      
      handicaps.forEach(handicap => {
        let totalBirdies = 0;
        let totalHoles = 0;
        
        for (let i = 0; i < iterations; i++) {
          const grossScores = generateGhostScores(handicap, mockCourse, i);
          
          // Count birdies (scores under par)
          grossScores.forEach((score, holeIndex) => {
            const par = mockCourse.holes[holeIndex].par;
            if (score < par) {
              totalBirdies++;
            }
            totalHoles++;
          });
        }
        
        const birdieRate = totalBirdies / totalHoles;
        
        // Expected birdie rates from research
        if (handicap === 0) {
          expect(birdieRate).toBeGreaterThan(0.08); // Should be around 13%
          expect(birdieRate).toBeLessThan(0.18);
        } else if (handicap === 10) {
          expect(birdieRate).toBeGreaterThan(0.02); // Should be around 4%
          expect(birdieRate).toBeLessThan(0.08);
        } else if (handicap === 20) {
          expect(birdieRate).toBeGreaterThan(0.005); // Should be around 2%
          expect(birdieRate).toBeLessThan(0.04);
        }
      });
    });

    it('should generate realistic junk event frequencies', () => {
      const iterations = 500;
      const handicap = 10;
      
      let sandieCount = 0;
      let greenieCount = 0;
      let ld10Count = 0;
      
      for (let i = 0; i < iterations; i++) {
        const grossScores = generateGhostScores(handicap, mockCourse, i);
        const junkEvents = generateGhostJunkEvents(handicap, grossScores, mockCourse, i);
        
        for (let hole = 1; hole <= 18; hole++) {
          if (junkEvents[hole].hadBunkerShot) sandieCount++;
          if (junkEvents[hole].isOnGreenFromTee && mockCourse.holes[hole - 1].par === 3) greenieCount++;
          if (junkEvents[hole].isLongDrive) ld10Count++;
        }
      }
      
      const avgSandiesPerRound = sandieCount / iterations;
      const avgGreeniesPerRound = greenieCount / iterations;
      const avgLD10PerRound = ld10Count / iterations;
      
      // Based on research data for 10-handicap:
      // Sandies: ~0.8 per round
      // Greenies: ~1.1 per round (on 4 par-3s)
      // LD10: ~0.125 per round (25% chance on hole 17)
      
      expect(avgSandiesPerRound).toBeGreaterThan(0.25);
      expect(avgSandiesPerRound).toBeLessThan(1.5);
      
      expect(avgGreeniesPerRound).toBeGreaterThan(0.5);
      expect(avgGreeniesPerRound).toBeLessThan(2.0);
      
      expect(avgLD10PerRound).toBeGreaterThan(0.05);
      expect(avgLD10PerRound).toBeLessThan(0.3);
    });
  });
});

describe('generateGhostScores', () => {
  it('should generate 18 scores', () => {
    const scores = generateGhostScores(10, mockCourse, 42);
    expect(scores).toHaveLength(18);
  });

  it('should generate consistent scores for the same seed', () => {
    const scores1 = generateGhostScores(10, mockCourse, 42);
    const scores2 = generateGhostScores(10, mockCourse, 42);
    expect(scores1).toEqual(scores2);
  });

  it('should generate different scores for different handicaps', () => {
    const scores1 = generateGhostScores(5, mockCourse, 42);
    const scores2 = generateGhostScores(20, mockCourse, 42);
    expect(scores1).not.toEqual(scores2);
  });

  it('should respect score bounds', () => {
    const scores = generateGhostScores(15, mockCourse, 42);
    scores.forEach((score, i) => {
      const par = mockCourse.holes[i].par;
      expect(score).toBeGreaterThanOrEqual(par - 2); // No better than eagle
      expect(score).toBeLessThanOrEqual(par + 4);    // No worse than par+4
    });
  });
}); 
import { scorecardParser } from '../scorecardParser';
import type { OCRWord } from '../../types/ocr';

describe('ScorecardParser', () => {
  const mockWords: OCRWord[] = [
    { text: 'Test', confidence: 85, bbox: { x0: 0, y0: 0, x1: 50, y1: 20 } }
  ];

  describe('parseScorecard', () => {
    it('should parse basic course information', () => {
      const rawText = `
        Millbrook Golf & Tennis Club
        Millbrook, NY
        Date: 06/15/2024
        Player: John Doe
      `;

      const result = scorecardParser.parseScorecard(rawText, mockWords);

      expect(result.courseName).toBe('Millbrook Golf & Tennis Club');
      expect(result.courseLocation).toBe('Millbrook, NY');
      expect(result.date).toBe('06/15/2024');
    });

    it('should parse hole data from tabular format', () => {
      const rawText = `
        Hole    Par    Yardage    HCP
        1       4      385        5
        2       3      165        17
        3       5      520        3
      `;

      const result = scorecardParser.parseScorecard(rawText, mockWords);

      expect(result.holes).toHaveLength(3);
      expect(result.holes![0]).toEqual({
        number: 1,
        par: 4,
        yardage: 385,
        handicap: 5,
        confidence: 0.8
      });
      expect(result.holes![1]).toEqual({
        number: 2,
        par: 3,
        yardage: 165,
        handicap: 17,
        confidence: 0.8
      });
    });

    it('should parse tee information', () => {
      const rawText = `
        Blue Tees: Rating 72.1, Slope 131, 6450 yards
        White Tees: Rating 69.8, Slope 125, 6100 yards
        Red Tees: Rating 68.2, Slope 118, 5200 yards
      `;

      const result = scorecardParser.parseScorecard(rawText, mockWords);

      expect(result.tees).toHaveLength(3);
      expect(result.tees![0]).toEqual({
        name: 'Blue',
        color: 'blue',
        rating: 72.1,
        slope: 131,
        yardage: 6450,
        confidence: 0.7
      });
    });

    it('should calculate totals correctly', () => {
      const rawText = `
        1    4    385    5
        2    3    165    17
        3    5    520    3
        4    4    410    7
        5    3    180    15
        6    4    395    9
        7    5    535    1
        8    3    175    13
        9    4    420    11
      `;

      const result = scorecardParser.parseScorecard(rawText, mockWords);

      expect(result.totalPar).toBe(35); // 4+3+5+4+3+4+5+3+4
      expect(result.totalYardage).toBe(3185); // Sum of all yardages
    });

    it('should handle empty or invalid input', () => {
      const result = scorecardParser.parseScorecard('', mockWords);

      expect(result.holes).toEqual([]);
      expect(result.tees).toEqual([]);
      expect(result.courseName).toBeUndefined();
    });
  });

  describe('course information extraction', () => {
    it('should extract course names with golf keywords', () => {
      const testCases = [
        'Pebble Beach Golf Links',
        'Augusta National Golf Club',
        'Pine Valley Country Club',
        'Bethpage Black Course'
      ];

      testCases.forEach(courseName => {
        const result = scorecardParser.parseScorecard(courseName, mockWords);
        expect(result.courseName).toBeTruthy();
      });
    });

    it('should extract dates in various formats', () => {
      const testCases = [
        { input: 'Date: 06/15/2024', expected: '06/15/2024' },
        { input: 'June 15, 2024', expected: 'June 15, 2024' },
        { input: '15 Jun 2024', expected: '15 Jun 2024' },
        { input: '6-15-24', expected: '6-15-24' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = scorecardParser.parseScorecard(input, mockWords);
        expect(result.date).toBe(expected);
      });
    });

    it('should extract location with state abbreviations', () => {
      const rawText = `
        Pebble Beach Golf Links
        Pebble Beach, CA
      `;

      const result = scorecardParser.parseScorecard(rawText, mockWords);
      expect(result.courseLocation).toBe('Pebble Beach, CA');
    });
  });

  describe('hole data extraction', () => {
    it('should parse line-by-line hole data', () => {
      const rawText = `
        Hole 1: Par 4, 385 yards, Handicap 5
        Hole 2: Par 3, 165 yards, Handicap 17
      `;

      const result = scorecardParser.parseScorecard(rawText, mockWords);

      expect(result.holes).toHaveLength(2);
      expect(result.holes![0]).toEqual({
        number: 1,
        par: 4,
        yardage: 385,
        handicap: 5,
        confidence: 0.6
      });
    });

    it('should handle missing hole data gracefully', () => {
      const rawText = `
        1    4         5
        2         165    17
        3    5    520
      `;

      const result = scorecardParser.parseScorecard(rawText, mockWords);

      expect(result.holes).toHaveLength(3);
      expect(result.holes![0].yardage).toBeUndefined();
      expect(result.holes![1].par).toBeUndefined();
      expect(result.holes![2].handicap).toBeUndefined();
    });

    it('should sort holes by number', () => {
      const rawText = `
        3    5    520    3
        1    4    385    5
        2    3    165    17
      `;

      const result = scorecardParser.parseScorecard(rawText, mockWords);

      expect(result.holes![0].number).toBe(1);
      expect(result.holes![1].number).toBe(2);
      expect(result.holes![2].number).toBe(3);
    });

    it('should limit to 18 holes', () => {
      const holes = Array.from({ length: 25 }, (_, i) => `${i + 1}    4    400    ${i + 1}`).join('\n');
      
      const result = scorecardParser.parseScorecard(holes, mockWords);

      expect(result.holes).toHaveLength(18);
    });
  });

  describe('tee information extraction', () => {
    it('should extract tee colors', () => {
      const colors = ['black', 'blue', 'white', 'gold', 'red', 'green', 'silver'];
      
      colors.forEach(color => {
        const rawText = `${color} tees: 6500 yards`;
        const result = scorecardParser.parseScorecard(rawText, mockWords);
        
        expect(result.tees).toHaveLength(1);
        expect(result.tees![0].color).toBe(color);
        expect(result.tees![0].name).toBe(color.charAt(0).toUpperCase() + color.slice(1));
      });
    });

    it('should extract tee names', () => {
      const names = ['championship', 'mens', 'ladies', 'senior'];
      
      names.forEach(name => {
        const rawText = `${name} tees: 6500 yards`;
        const result = scorecardParser.parseScorecard(rawText, mockWords);
        
        expect(result.tees).toHaveLength(1);
        expect(result.tees![0].name).toBe(name.charAt(0).toUpperCase() + name.slice(1));
      });
    });

    it('should extract ratings and slopes', () => {
      const rawText = `Blue Tees: Rating 72.5, Slope 135`;
      
      const result = scorecardParser.parseScorecard(rawText, mockWords);
      
      expect(result.tees![0].rating).toBe(72.5);
      expect(result.tees![0].slope).toBe(135);
    });

    it('should not extract tees without meaningful data', () => {
      const rawText = `Some random text with blue color mentioned`;
      
      const result = scorecardParser.parseScorecard(rawText, mockWords);
      
      expect(result.tees).toHaveLength(0);
    });
  });

  describe('confidence calculation', () => {
    it('should calculate overall confidence based on extracted data', () => {
      const rawText = `
        Pebble Beach Golf Links
        Pebble Beach, CA
        Date: 06/15/2024
        1    4    385    5
        2    3    165    17
        Blue Tees: Rating 72.1, Slope 131
      `;

      const result = scorecardParser.parseScorecard(rawText, mockWords);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should have low confidence for minimal data', () => {
      const rawText = `Some random text`;
      
      const result = scorecardParser.parseScorecard(rawText, mockWords);
      
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('validateScorecardData', () => {
    it('should validate complete scorecard data', () => {
      const data = {
        courseName: 'Test Golf Course',
        holes: [
          { number: 1, par: 4, yardage: 400, handicap: 5, confidence: 0.8 },
          { number: 2, par: 3, yardage: 150, handicap: 17, confidence: 0.8 }
        ],
        totalPar: 7,
        confidence: 0.8
      };

      const validation = scorecardParser.validateScorecardData(data);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing course name', () => {
      const data = {
        holes: [{ number: 1, par: 4, confidence: 0.8 }],
        confidence: 0.8
      };

      const validation = scorecardParser.validateScorecardData(data);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Course name is missing or too short');
    });

    it('should detect missing hole data', () => {
      const data = {
        courseName: 'Test Course',
        confidence: 0.8
      };

      const validation = scorecardParser.validateScorecardData(data);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('No hole data found');
    });

    it('should warn about unusual par values', () => {
      const data = {
        courseName: 'Test Course',
        holes: [
          { number: 1, par: 2, confidence: 0.8 }, // Unusual par
          { number: 2, par: 6, confidence: 0.8 }  // Unusual par
        ],
        confidence: 0.8
      };

      const validation = scorecardParser.validateScorecardData(data);

      expect(validation.warnings).toContain('Hole 1 has unusual par value: 2');
      expect(validation.warnings).toContain('Hole 2 has unusual par value: 6');
    });

    it('should warn about unusual total par', () => {
      const data = {
        courseName: 'Test Course',
        holes: [{ number: 1, par: 4, confidence: 0.8 }],
        totalPar: 90, // Unusual total
        confidence: 0.8
      };

      const validation = scorecardParser.validateScorecardData(data);

      expect(validation.warnings).toContain('Total par 90 is outside typical range (60-80)');
    });

    it('should warn about missing holes', () => {
      const data = {
        courseName: 'Test Course',
        holes: [
          { number: 1, par: 4, confidence: 0.8 },
          { number: 3, par: 4, confidence: 0.8 } // Missing hole 2
        ],
        confidence: 0.8
      };

      const validation = scorecardParser.validateScorecardData(data);

      expect(validation.warnings).toContain('Hole 2 is missing');
    });

    it('should warn about unusual tee ratings and slopes', () => {
      const data = {
        courseName: 'Test Course',
        holes: [{ number: 1, par: 4, confidence: 0.8 }],
        tees: [
          { rating: 50, slope: 50, confidence: 0.7 }, // Both unusual
          { rating: 85, slope: 160, confidence: 0.7 } // Both unusual
        ],
        confidence: 0.8
      };

      const validation = scorecardParser.validateScorecardData(data);

      expect(validation.warnings).toContain('Tee 1 has unusual rating: 50');
      expect(validation.warnings).toContain('Tee 1 has unusual slope: 50');
      expect(validation.warnings).toContain('Tee 2 has unusual rating: 85');
      expect(validation.warnings).toContain('Tee 2 has unusual slope: 160');
    });
  });
}); 
import type { ScorecardData, ScorecardHole, ScorecardTee, OCRWord } from '../types/ocr';

/**
 * Service for parsing OCR text into structured scorecard data
 * Implements layout detection, data extraction, and confidence scoring
 */
export class ScorecardParser {
  
  /**
   * Parse OCR text and words into structured scorecard data
   */
  parseScorecard(rawText: string, words: OCRWord[]): ScorecardData {
    const lines = this.splitIntoLines(rawText);
    
    const scorecardData: ScorecardData = {
      holes: [],
      tees: [],
      confidence: 0
    };

    // Extract course information
    this.extractCourseInfo(lines, scorecardData);
    
    // Extract hole data
    this.extractHoleData(lines, scorecardData);
    
    // Extract tee information
    this.extractTeeInfo(lines, scorecardData);
    
    // Calculate overall confidence
    this.calculateOverallConfidence(scorecardData);
    
    return scorecardData;
  }

  /**
   * Split raw text into logical lines for processing
   */
  private splitIntoLines(rawText: string): string[] {
    return rawText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  /**
   * Extract course name, location, and date from text
   */
  private extractCourseInfo(lines: string[], data: ScorecardData): void {
    const courseNamePatterns = [
      /^([A-Za-z\s&]+(?:golf|country|club|course)(?:\s+[A-Za-z\s&]*)?)/i, // Include words after golf/club/course
      /^([A-Za-z\s&]{3,})\s*$/,
    ];

    const datePatterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /(\d{1,2}\s+\w+\s+\d{2,4})/,
      /((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{2,4})/i,
      /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{2,4})/i
    ];

    // Look for course name in first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      
      // Try course name patterns
      for (const pattern of courseNamePatterns) {
        const match = line.match(pattern);
        if (match && !data.courseName) {
          data.courseName = this.cleanText(match[1]);
          break;
        }
      }

      // Try date patterns - preserve special characters in dates
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match && !data.date) {
          data.date = match[1].trim(); // Don't use cleanText for dates
          break;
        }
      }
    }

    // Extract location - prioritize simple standalone location lines
    for (const line of lines.slice(0, 5)) {
      if (!data.courseLocation) {
        // Skip lines that look like course names
        const looksLikeCourse = /golf|country|club|course/i.test(line);
        
        // First try: simple line with city, state format (but not course name lines)
        if (!looksLikeCourse) {
          const standaloneLocationMatch = line.match(/^([A-Za-z\s,]+(?:NY|CA|FL|TX|PA|OH|IL|MI|NC|VA|GA|NJ|WA|AZ|MA|TN|IN|MO|MD|WI|MN|CO|AL|SC|LA|KY|OR|OK|CT|IA|MS|AR|KS|UT|NV|NM|WV|NE|ID|NH|HI|ME|RI|MT|DE|SD|ND|AK|VT|WY))\s*$/i);
          if (standaloneLocationMatch) {
            data.courseLocation = standaloneLocationMatch[1].trim();
            break;
          }
        }
        
        // Second try: embedded in course name line
        if (data.courseName) {
          const embeddedLocationMatch = line.match(/^[A-Za-z\s&]+(?:golf|country|club|course)[,\s]+([A-Za-z\s,]+(?:NY|CA|FL|TX|PA|OH|IL|MI|NC|VA|GA|NJ|WA|AZ|MA|TN|IN|MO|MD|WI|MN|CO|AL|SC|LA|KY|OR|OK|CT|IA|MS|AR|KS|UT|NV|NM|WV|NE|ID|NH|HI|ME|RI|MT|DE|SD|ND|AK|VT|WY))/i);
          if (embeddedLocationMatch) {
            // Make sure the match actually contains a state abbreviation and isn't just a single word
            const potentialLocation = embeddedLocationMatch[1].trim();
            const hasStateAbbrev = /\b(?:NY|CA|FL|TX|PA|OH|IL|MI|NC|VA|GA|NJ|WA|AZ|MA|TN|IN|MO|MD|WI|MN|CO|AL|SC|LA|KY|OR|OK|CT|IA|MS|AR|KS|UT|NV|NM|WV|NE|ID|NH|HI|ME|RI|MT|DE|SD|ND|AK|VT|WY)\b/i.test(potentialLocation);
            if (hasStateAbbrev) {
              data.courseLocation = potentialLocation;
              break;
            }
          }
        }
      }
    }
  }

  /**
   * Extract hole data (numbers, par, yardage, handicap)
   */
  private extractHoleData(lines: string[], data: ScorecardData): void {
    const holes: ScorecardHole[] = [];
    
    // Look for hole number patterns
    const holeNumberPattern = /(?:hole|#)?\s*(\d{1,2})/i;
    const parPattern = /par\s*(\d)/i;
    const yardagePattern = /(\d{2,4})\s*(?:yds?|yards?)?/i;
    const handicapPattern = /(?:hcp|handicap|hdcp)\s*(\d{1,2})/i;

    // Look for tabular data (common in scorecards)
    const tableLines = this.findTableLines(lines);
    
    for (const tableLine of tableLines) {
      const cells = this.splitTableCells(tableLine);
      
      // Try to identify hole data rows
      if (this.isHoleDataRow(cells)) {
        const hole = this.parseHoleRow(cells);
        if (hole) {
          holes.push(hole);
        }
      }
    }

    // If no tabular data found, try line-by-line parsing
    if (holes.length === 0) {
      for (const line of lines) {
        const hole = this.parseHoleLine(line);
        if (hole) {
          holes.push(hole);
        }
      }
    }

    // Sort holes by number and validate
    holes.sort((a, b) => a.number - b.number);
    data.holes = holes.slice(0, 18); // Limit to 18 holes

    // Calculate totals
    if (data.holes.length > 0) {
      data.totalPar = data.holes.reduce((sum, hole) => sum + (hole.par || 0), 0);
      data.totalYardage = data.holes.reduce((sum, hole) => sum + (hole.yardage || 0), 0);
    }
  }

  /**
   * Extract tee information (colors, names, ratings, slopes)
   */
  private extractTeeInfo(lines: string[], data: ScorecardData): void {
    const tees: ScorecardTee[] = [];
    const teeColors = ['black', 'blue', 'white', 'gold', 'red', 'green', 'silver'];
    const teeNames = ['championship', 'mens', 'ladies', 'senior', 'forward', 'back', 'middle'];

    for (const line of lines) {
      const tee = this.parsTeeLine(line, teeColors, teeNames);
      if (tee) {
        tees.push(tee);
      }
    }

    data.tees = tees;
  }

  /**
   * Find lines that appear to contain tabular data
   */
  private findTableLines(lines: string[]): string[] {
    return lines.filter(line => {
      // Look for lines with multiple numbers separated by spaces/tabs
      const numberCount = (line.match(/\d+/g) || []).length;
      const hasMultipleSpaces = /\s{2,}/.test(line);
      const hasTabChars = /\t/.test(line);
      
      return numberCount >= 3 && (hasMultipleSpaces || hasTabChars);
    });
  }

  /**
   * Split a table line into cells
   */
  private splitTableCells(line: string): string[] {
    // Split on multiple spaces or tabs
    return line.split(/\s{2,}|\t/).map(cell => cell.trim()).filter(cell => cell.length > 0);
  }

  /**
   * Check if a row appears to contain hole data
   */
  private isHoleDataRow(cells: string[]): boolean {
    if (cells.length < 3) return false;
    
    // First cell should be a hole number (1-18)
    const firstCell = cells[0];
    const holeNumber = parseInt(firstCell);
    
    return !isNaN(holeNumber) && holeNumber >= 1 && holeNumber <= 18;
  }

  /**
   * Parse a table row into hole data
   */
  private parseHoleRow(cells: string[]): ScorecardHole | null {
    if (cells.length < 2) return null;

    const holeNumber = parseInt(cells[0]);
    if (isNaN(holeNumber) || holeNumber < 1 || holeNumber > 18) return null;

    const hole: ScorecardHole = {
      number: holeNumber,
      confidence: 0.8 // Base confidence for tabular data
    };

    // Try to identify par, yardage, and handicap from remaining cells
    for (let i = 1; i < cells.length; i++) {
      const cell = cells[i];
      const num = parseInt(cell);
      
      if (!isNaN(num)) {
        if (num >= 3 && num <= 5 && !hole.par) {
          // Likely par value
          hole.par = num;
        } else if (num >= 50 && num <= 800 && !hole.yardage) {
          // Likely yardage
          hole.yardage = num;
        } else if (num >= 1 && num <= 18 && !hole.handicap) {
          // Likely handicap/stroke index
          hole.handicap = num;
        }
      }
    }

    return hole;
  }

  /**
   * Parse a single line for hole information
   */
  private parseHoleLine(line: string): ScorecardHole | null {
    const holeMatch = line.match(/(?:hole\s*)?(\d{1,2})/i);
    if (!holeMatch) return null;

    const holeNumber = parseInt(holeMatch[1]);
    if (holeNumber < 1 || holeNumber > 18) return null;

    const hole: ScorecardHole = {
      number: holeNumber,
      confidence: 0.6 // Lower confidence for line parsing
    };

    // Extract par
    const parMatch = line.match(/par\s*(\d)/i);
    if (parMatch) {
      hole.par = parseInt(parMatch[1]);
    }

    // Extract yardage
    const yardageMatch = line.match(/(\d{2,4})\s*(?:yds?|yards?)?/i);
    if (yardageMatch) {
      hole.yardage = parseInt(yardageMatch[1]);
    }

    // Extract handicap
    const handicapMatch = line.match(/(?:hcp|handicap|hdcp)\s*(\d{1,2})/i);
    if (handicapMatch) {
      hole.handicap = parseInt(handicapMatch[1]);
    }

    return hole;
  }

  /**
   * Parse a line for tee information
   */
  private parsTeeLine(line: string, teeColors: string[], teeNames: string[]): ScorecardTee | null {
    const lowerLine = line.toLowerCase();
    
    // Check if line contains tee-related keywords
    const hasTeeKeyword = teeColors.some(color => lowerLine.includes(color)) ||
                         teeNames.some(name => lowerLine.includes(name)) ||
                         /tee|rating|slope/.test(lowerLine);
    
    if (!hasTeeKeyword) return null;

    const tee: ScorecardTee = {
      confidence: 0.7
    };

    // Extract tee color
    for (const color of teeColors) {
      if (lowerLine.includes(color)) {
        tee.color = color;
        tee.name = color.charAt(0).toUpperCase() + color.slice(1);
        break;
      }
    }

    // Extract tee name if no color found
    if (!tee.name) {
      for (const name of teeNames) {
        if (lowerLine.includes(name)) {
          tee.name = name.charAt(0).toUpperCase() + name.slice(1);
          break;
        }
      }
    }

    // Extract rating (typically 60-80)
    const ratingMatch = line.match(/rating[:\s]*(\d{2}\.\d|\d{2})/i);
    if (ratingMatch) {
      tee.rating = parseFloat(ratingMatch[1]);
    }

    // Extract slope (typically 55-155)
    const slopeMatch = line.match(/slope[:\s]*(\d{2,3})/i);
    if (slopeMatch) {
      tee.slope = parseInt(slopeMatch[1]);
    }

    // Extract yardage for this tee
    const yardageMatch = line.match(/(\d{4,5})\s*(?:yds?|yards?)?/i);
    if (yardageMatch) {
      tee.yardage = parseInt(yardageMatch[1]);
    }

    // Only return if we found meaningful numerical data (not just color/name)
    const hasMeaningfulData = !!(tee.rating || tee.slope || tee.yardage);
    return hasMeaningfulData ? tee : null;
  }

  /**
   * Calculate overall confidence score for the extracted data
   */
  private calculateOverallConfidence(data: ScorecardData): void {
    let totalConfidence = 0;
    let itemCount = 0;

    // Course info confidence
    if (data.courseName) {
      totalConfidence += 0.8;
      itemCount++;
    }
    if (data.courseLocation) {
      totalConfidence += 0.6;
      itemCount++;
    }
    if (data.date) {
      totalConfidence += 0.5;
      itemCount++;
    }

    // Holes confidence - heavily weighted
    if (data.holes && data.holes.length > 0) {
      const holeConfidence = data.holes.reduce((sum, hole) => sum + hole.confidence, 0) / data.holes.length;
      totalConfidence += holeConfidence * 2; // Weight holes heavily
      itemCount += 2;
    }

    // Tees confidence
    if (data.tees && data.tees.length > 0) {
      const teeConfidence = data.tees.reduce((sum, tee) => sum + tee.confidence, 0) / data.tees.length;
      totalConfidence += teeConfidence;
      itemCount++;
    }

    // Calculate base confidence
    const baseConfidence = itemCount > 0 ? totalConfidence / itemCount : 0;
    
    // Apply penalties for minimal data
    let finalConfidence = baseConfidence;
    
    // Penalty for very few items extracted
    if (itemCount < 3) {
      finalConfidence *= 0.6; // Reduce confidence significantly for minimal data
    }
    
    // Penalty for no hole data (most important for scorecards)
    if (!data.holes || data.holes.length === 0) {
      finalConfidence *= 0.3; // Very low confidence without hole data
    }

    data.confidence = Math.min(finalConfidence, 1.0);
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s&\-.,]/g, '');
  }

  /**
   * Validate extracted scorecard data
   */
  validateScorecardData(data: ScorecardData): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate course name
    if (!data.courseName || data.courseName.length < 3) {
      errors.push('Course name is missing or too short');
    }

    // Validate holes
    if (!data.holes || data.holes.length === 0) {
      errors.push('No hole data found');
    } else {
      if (data.holes.length < 9) {
        warnings.push(`Only ${data.holes.length} holes found (expected 9 or 18)`);
      }

      // Check for missing hole numbers
      const holeNumbers = data.holes.map(h => h.number).sort((a, b) => a - b);
      for (let i = 1; i <= Math.max(...holeNumbers); i++) {
        if (!holeNumbers.includes(i)) {
          warnings.push(`Hole ${i} is missing`);
        }
      }

      // Validate par values
      data.holes.forEach(hole => {
        if (hole.par && (hole.par < 3 || hole.par > 5)) {
          warnings.push(`Hole ${hole.number} has unusual par value: ${hole.par}`);
        }
      });
    }

    // Validate total par
    if (data.totalPar) {
      if (data.totalPar < 60 || data.totalPar > 80) {
        warnings.push(`Total par ${data.totalPar} is outside typical range (60-80)`);
      }
    }

    // Validate tees
    if (data.tees && data.tees.length > 0) {
      data.tees.forEach((tee, index) => {
        if (tee.rating && (tee.rating < 60 || tee.rating > 80)) {
          warnings.push(`Tee ${index + 1} has unusual rating: ${tee.rating}`);
        }
        if (tee.slope && (tee.slope < 55 || tee.slope > 155)) {
          warnings.push(`Tee ${index + 1} has unusual slope: ${tee.slope}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export singleton instance
export const scorecardParser = new ScorecardParser(); 
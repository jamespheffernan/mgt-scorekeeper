import { formatPlayerName, toTitleCase, splitNameParts, ensurePlayerNameConsistency } from '../nameFormatter';

describe('Name formatter utilities', () => {
  describe('formatPlayerName', () => {
    it('should combine first and last name correctly', () => {
      const player = {
        id: '123',
        first: 'John',
        last: 'Doe',
        name: 'Outdated Name',
        index: 10.5
      };
      expect(formatPlayerName(player)).toBe('John Doe');
    });
    
    it('should handle missing last name', () => {
      const player = {
        id: '123',
        first: 'Tiger',
        last: '',
        name: 'Tiger Woods',
        index: 10.5
      };
      expect(formatPlayerName(player)).toBe('Tiger');
    });
    
    it('should fall back to name field if first/last missing', () => {
      const player = {
        id: '123',
        name: 'Legacy Player',
        first: '',
        last: '',
        index: 10.5
      };
      expect(formatPlayerName(player)).toBe('Legacy Player');
    });
  });
  
  describe('toTitleCase', () => {
    it('should convert text to title case', () => {
      expect(toTitleCase('john doe')).toBe('John Doe');
      expect(toTitleCase('JANE SMITH')).toBe('Jane Smith');
      expect(toTitleCase('robert j. williams')).toBe('Robert J. Williams');
    });
    
    it('should handle empty strings', () => {
      expect(toTitleCase('')).toBe('');
      expect(toTitleCase(undefined as any)).toBe('');
    });
  });
  
  describe('splitNameParts', () => {
    it('should split full name into first and last', () => {
      expect(splitNameParts('John Doe')).toEqual({ first: 'John', last: 'Doe' });
    });
    
    it('should handle multi-word last names', () => {
      expect(splitNameParts('Mary Ann Smith Jones')).toEqual({ first: 'Mary', last: 'Ann Smith Jones' });
    });
    
    it('should handle single name', () => {
      expect(splitNameParts('Tiger')).toEqual({ first: 'Tiger', last: '' });
    });
    
    it('should handle empty strings', () => {
      expect(splitNameParts('')).toEqual({ first: '', last: '' });
    });
  });
  
  describe('ensurePlayerNameConsistency', () => {
    it('should update name from first/last when name is missing', () => {
      const player = {
        id: '123',
        first: 'John',
        last: 'Doe',
        name: '',
        index: 10.5
      };
      
      const result = ensurePlayerNameConsistency(player);
      expect(result.name).toBe('John Doe');
    });
    
    it('should update first/last from name when they are missing', () => {
      const player = {
        id: '123',
        first: '',
        last: '',
        name: 'Mary Smith',
        index: 10.5
      };
      
      const result = ensurePlayerNameConsistency(player);
      expect(result.first).toBe('Mary');
      expect(result.last).toBe('Smith');
    });
    
    it('should ensure name matches first/last when all fields exist', () => {
      const player = {
        id: '123',
        first: 'John',
        last: 'Doe',
        name: 'John Smith', // Different from first/last
        index: 10.5
      };
      
      const result = ensurePlayerNameConsistency(player);
      expect(result.name).toBe('John Doe');
    });
  });
}); 
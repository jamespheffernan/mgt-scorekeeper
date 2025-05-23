/**
 * Tests for Course Validation Utilities
 */

import { 
  validateCourse, 
  validateTeeOption, 
  validateHoleInfo, 
  validateCourseData,
  sanitizeCourseData 
} from '../courseValidation';
import { Course, TeeOption, HoleInfo } from '../courseModel';

describe('Course Validation', () => {
  describe('validateHoleInfo', () => {
    it('should validate a correct hole', () => {
      const hole: HoleInfo = {
        number: 1,
        par: 4,
        yardage: 400,
        strokeIndex: 10
      };

      const result = validateHoleInfo(hole);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid hole number', () => {
      const hole: HoleInfo = {
        number: 0,
        par: 4,
        yardage: 400,
        strokeIndex: 10
      };

      const result = validateHoleInfo(hole);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'HOLE_NUMBER_OUT_OF_RANGE'
        })
      );
    });

    it('should reject invalid par', () => {
      const hole: HoleInfo = {
        number: 1,
        par: 6,
        yardage: 400,
        strokeIndex: 10
      };

      const result = validateHoleInfo(hole);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'PAR_OUT_OF_RANGE'
        })
      );
    });

    it('should warn about unusual yardage', () => {
      const hole: HoleInfo = {
        number: 1,
        par: 4,
        yardage: 800,
        strokeIndex: 10
      };

      const result = validateHoleInfo(hole);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'UNUSUAL_YARDAGE'
        })
      );
    });

    it('should warn about unusual par-specific yardage', () => {
      const hole: HoleInfo = {
        number: 1,
        par: 3,
        yardage: 400,
        strokeIndex: 10
      };

      const result = validateHoleInfo(hole);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'UNUSUAL_PAR3_YARDAGE'
        })
      );
    });
  });

  describe('validateTeeOption', () => {
    const validHoles: HoleInfo[] = Array.from({ length: 18 }, (_, i) => ({
      number: i + 1,
      par: 4,
      yardage: 400,
      strokeIndex: i + 1
    }));

    it('should validate a correct tee option', () => {
      const tee: TeeOption = {
        id: 'test-id',
        name: 'Championship',
        color: 'Black',
        gender: 'M',
        rating: 72.0,
        slope: 130,
        holes: validHoles
      };

      const result = validateTeeOption(tee);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid slope rating', () => {
      const tee: TeeOption = {
        id: 'test-id',
        name: 'Championship',
        color: 'Black',
        gender: 'M',
        rating: 72.0,
        slope: 200,
        holes: validHoles
      };

      const result = validateTeeOption(tee);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_SLOPE_RANGE'
        })
      );
    });

    it('should reject incorrect hole count', () => {
      const tee: TeeOption = {
        id: 'test-id',
        name: 'Championship',
        color: 'Black',
        gender: 'M',
        rating: 72.0,
        slope: 130,
        holes: validHoles.slice(0, 9) // Only 9 holes
      };

      const result = validateTeeOption(tee);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INCORRECT_HOLE_COUNT'
        })
      );
    });

    it('should reject duplicate hole numbers', () => {
      const duplicateHoles = [...validHoles];
      duplicateHoles[1] = { ...duplicateHoles[1], number: 1 }; // Duplicate hole 1

      const tee: TeeOption = {
        id: 'test-id',
        name: 'Championship',
        color: 'Black',
        gender: 'M',
        rating: 72.0,
        slope: 130,
        holes: duplicateHoles
      };

      const result = validateTeeOption(tee);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_HOLE_NUMBERS'
        })
      );
    });

    it('should reject duplicate stroke indexes', () => {
      const duplicateSIHoles = [...validHoles];
      duplicateSIHoles[1] = { ...duplicateSIHoles[1], strokeIndex: 1 }; // Duplicate SI 1

      const tee: TeeOption = {
        id: 'test-id',
        name: 'Championship',
        color: 'Black',
        gender: 'M',
        rating: 72.0,
        slope: 130,
        holes: duplicateSIHoles
      };

      const result = validateTeeOption(tee);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_STROKE_INDEXES'
        })
      );
    });

    it('should warn about unusual course rating', () => {
      const tee: TeeOption = {
        id: 'test-id',
        name: 'Championship',
        color: 'Black',
        gender: 'M',
        rating: 45.0,
        slope: 130,
        holes: validHoles
      };

      const result = validateTeeOption(tee);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'UNUSUAL_RATING'
        })
      );
    });
  });

  describe('validateCourse', () => {
    const validTeeOption: TeeOption = {
      id: 'tee-id',
      name: 'Championship',
      color: 'Black',
      gender: 'M',
      rating: 72.0,
      slope: 130,
      holes: Array.from({ length: 18 }, (_, i) => ({
        number: i + 1,
        par: 4,
        yardage: 400,
        strokeIndex: i + 1
      }))
    };

    it('should validate a correct course', () => {
      const course: Course = {
        id: 'course-id',
        name: 'Test Golf Course',
        location: 'Test City, ST',
        teeOptions: [validTeeOption]
      };

      const result = validateCourse(course);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject course without name', () => {
      const course: Course = {
        id: 'course-id',
        name: '',
        location: 'Test City, ST',
        teeOptions: [validTeeOption]
      };

      const result = validateCourse(course);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_NAME'
        })
      );
    });

    it('should reject course without location', () => {
      const course: Course = {
        id: 'course-id',
        name: 'Test Golf Course',
        location: '',
        teeOptions: [validTeeOption]
      };

      const result = validateCourse(course);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_LOCATION'
        })
      );
    });

    it('should reject course without tee options', () => {
      const course: Course = {
        id: 'course-id',
        name: 'Test Golf Course',
        location: 'Test City, ST',
        teeOptions: []
      };

      const result = validateCourse(course);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'NO_TEE_OPTIONS'
        })
      );
    });

    it('should warn about duplicate tee names', () => {
      const tee2 = { ...validTeeOption, id: 'tee-id-2', name: 'Championship' };
      const course: Course = {
        id: 'course-id',
        name: 'Test Golf Course',
        location: 'Test City, ST',
        teeOptions: [validTeeOption, tee2]
      };

      const result = validateCourse(course);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'DUPLICATE_TEE_NAMES'
        })
      );
    });

    it('should warn about very long course name', () => {
      const longName = 'A'.repeat(101);
      const course: Course = {
        id: 'course-id',
        name: longName,
        location: 'Test City, ST',
        teeOptions: [validTeeOption]
      };

      const result = validateCourse(course);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'LONG_NAME'
        })
      );
    });
  });

  describe('validateCourseData', () => {
    it('should reject non-object data', () => {
      const result = validateCourseData('not an object');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_COURSE_DATA'
        })
      );
    });

    it('should reject null data', () => {
      const result = validateCourseData(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_COURSE_DATA'
        })
      );
    });
  });

  describe('sanitizeCourseData', () => {
    it('should sanitize valid course data', () => {
      const inputData = {
        id: 'test-id',
        name: '  Test Course  ',
        location: '  Test City  ',
        teeOptions: [{
          id: 'tee-id',
          name: '  Championship  ',
          color: '  Black  ',
          gender: 'M',
          rating: 72.0,
          slope: 130,
          holes: [{
            number: 1,
            par: 4,
            yardage: 400,
            strokeIndex: 1
          }]
        }]
      };

      const result = sanitizeCourseData(inputData);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Course');
      expect(result?.location).toBe('Test City');
      expect(result?.teeOptions[0]?.name).toBe('Championship');
      expect(result?.teeOptions[0]?.color).toBe('Black');
    });

    it('should return null for invalid data', () => {
      expect(sanitizeCourseData(null)).toBeNull();
      expect(sanitizeCourseData('not an object')).toBeNull();
      expect(sanitizeCourseData(123)).toBeNull();
    });

    it('should sanitize invalid slope ratings', () => {
      const inputData = {
        name: 'Test Course',
        location: 'Test City',
        teeOptions: [{
          name: 'Championship',
          color: 'Black',
          gender: 'M',
          rating: 72.0,
          slope: 200, // Invalid - should be clamped to 155
          holes: []
        }]
      };

      const result = sanitizeCourseData(inputData);
      expect(result?.teeOptions[0]?.slope).toBe(155);
    });

    it('should provide defaults for missing required fields', () => {
      const inputData = {
        // Missing most fields
      };

      const result = sanitizeCourseData(inputData);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('');
      expect(result?.location).toBe('');
      expect(typeof result?.id).toBe('string');
      expect(result?.dateAdded).toBeInstanceOf(Date);
    });
  });
}); 
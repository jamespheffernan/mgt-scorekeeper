/**
 * Course Validation Utilities
 * Provides comprehensive validation for golf course data
 */

import { Course, TeeOption, HoleInfo, Gender } from './courseModel';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

/**
 * Validates a complete course object
 */
export function validateCourse(course: Course): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate basic course info
  if (!course.id || typeof course.id !== 'string') {
    errors.push({
      field: 'id',
      message: 'Course ID is required and must be a string',
      code: 'INVALID_ID'
    });
  }

  if (!course.name || typeof course.name !== 'string' || course.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Course name is required and cannot be empty',
      code: 'INVALID_NAME'
    });
  } else if (course.name.length > 100) {
    warnings.push({
      field: 'name',
      message: 'Course name is very long (over 100 characters)',
      code: 'LONG_NAME'
    });
  }

  if (!course.location || typeof course.location !== 'string' || course.location.trim().length === 0) {
    errors.push({
      field: 'location',
      message: 'Course location is required and cannot be empty',
      code: 'INVALID_LOCATION'
    });
  }

  // Validate tee options
  if (!course.teeOptions || !Array.isArray(course.teeOptions)) {
    errors.push({
      field: 'teeOptions',
      message: 'Course must have at least one tee option',
      code: 'NO_TEE_OPTIONS'
    });
  } else {
    if (course.teeOptions.length === 0) {
      errors.push({
        field: 'teeOptions',
        message: 'Course must have at least one tee option',
        code: 'NO_TEE_OPTIONS'
      });
    }

    // Validate each tee option
    course.teeOptions.forEach((tee, index) => {
      const teeResult = validateTeeOption(tee, `teeOptions[${index}]`);
      errors.push(...teeResult.errors);
      warnings.push(...teeResult.warnings);
    });

    // Check for duplicate tee names
    const teeNames = course.teeOptions.map(tee => tee.name.toLowerCase());
    const duplicateNames = teeNames.filter((name, index) => teeNames.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      warnings.push({
        field: 'teeOptions',
        message: `Duplicate tee names found: ${duplicateNames.join(', ')}`,
        code: 'DUPLICATE_TEE_NAMES'
      });
    }
  }

  // Validate optional dates
  if (course.dateAdded && !(course.dateAdded instanceof Date)) {
    errors.push({
      field: 'dateAdded',
      message: 'dateAdded must be a valid Date object',
      code: 'INVALID_DATE_ADDED'
    });
  }

  if (course.lastPlayed && !(course.lastPlayed instanceof Date)) {
    errors.push({
      field: 'lastPlayed',
      message: 'lastPlayed must be a valid Date object',
      code: 'INVALID_LAST_PLAYED'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates a tee option
 */
export function validateTeeOption(tee: TeeOption, fieldPrefix: string = 'teeOption'): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate basic tee info
  if (!tee.id || typeof tee.id !== 'string') {
    errors.push({
      field: `${fieldPrefix}.id`,
      message: 'Tee ID is required and must be a string',
      code: 'INVALID_TEE_ID'
    });
  }

  if (!tee.name || typeof tee.name !== 'string' || tee.name.trim().length === 0) {
    errors.push({
      field: `${fieldPrefix}.name`,
      message: 'Tee name is required and cannot be empty',
      code: 'INVALID_TEE_NAME'
    });
  }

  if (!tee.color || typeof tee.color !== 'string' || tee.color.trim().length === 0) {
    errors.push({
      field: `${fieldPrefix}.color`,
      message: 'Tee color is required and cannot be empty',
      code: 'INVALID_TEE_COLOR'
    });
  }

  // Validate gender
  const validGenders: Gender[] = ['M', 'F', 'Any'];
  if (!validGenders.includes(tee.gender)) {
    errors.push({
      field: `${fieldPrefix}.gender`,
      message: 'Gender must be M, F, or Any',
      code: 'INVALID_GENDER'
    });
  }

  // Validate course rating (typically 60-80)
  if (typeof tee.rating !== 'number' || isNaN(tee.rating)) {
    errors.push({
      field: `${fieldPrefix}.rating`,
      message: 'Course rating must be a valid number',
      code: 'INVALID_RATING'
    });
  } else {
    if (tee.rating < 50 || tee.rating > 85) {
      warnings.push({
        field: `${fieldPrefix}.rating`,
        message: `Course rating ${tee.rating} is outside typical range (50-85)`,
        code: 'UNUSUAL_RATING'
      });
    }
  }

  // Validate slope rating (55-155)
  if (typeof tee.slope !== 'number' || isNaN(tee.slope)) {
    errors.push({
      field: `${fieldPrefix}.slope`,
      message: 'Slope rating must be a valid number',
      code: 'INVALID_SLOPE'
    });
  } else {
    if (tee.slope < 55 || tee.slope > 155) {
      errors.push({
        field: `${fieldPrefix}.slope`,
        message: `Slope rating ${tee.slope} must be between 55 and 155`,
        code: 'INVALID_SLOPE_RANGE'
      });
    }
  }

  // Validate holes
  if (!tee.holes || !Array.isArray(tee.holes)) {
    errors.push({
      field: `${fieldPrefix}.holes`,
      message: 'Tee must have hole information',
      code: 'NO_HOLES'
    });
  } else {
    if (tee.holes.length !== 18) {
      errors.push({
        field: `${fieldPrefix}.holes`,
        message: `Expected 18 holes, found ${tee.holes.length}`,
        code: 'INCORRECT_HOLE_COUNT'
      });
    }

    // Validate each hole
    tee.holes.forEach((hole, index) => {
      const holeResult = validateHoleInfo(hole, `${fieldPrefix}.holes[${index}]`);
      errors.push(...holeResult.errors);
      warnings.push(...holeResult.warnings);
    });

    // Check for correct hole numbering (1-18)
    const expectedNumbers = Array.from({ length: 18 }, (_, i) => i + 1);
    const actualNumbers = tee.holes.map(hole => hole.number).sort((a, b) => a - b);
    if (JSON.stringify(expectedNumbers) !== JSON.stringify(actualNumbers)) {
      errors.push({
        field: `${fieldPrefix}.holes`,
        message: 'Holes must be numbered 1-18 without duplicates',
        code: 'INVALID_HOLE_NUMBERS'
      });
    }

    // Check for correct stroke index allocation (1-18)
    const expectedSIs = Array.from({ length: 18 }, (_, i) => i + 1);
    const actualSIs = tee.holes.map(hole => hole.strokeIndex).sort((a, b) => a - b);
    if (JSON.stringify(expectedSIs) !== JSON.stringify(actualSIs)) {
      errors.push({
        field: `${fieldPrefix}.holes`,
        message: 'Stroke indexes must be 1-18 without duplicates',
        code: 'INVALID_STROKE_INDEXES'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates a single hole's information
 */
export function validateHoleInfo(hole: HoleInfo, fieldPrefix: string = 'hole'): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate hole number (1-18)
  if (typeof hole.number !== 'number' || isNaN(hole.number)) {
    errors.push({
      field: `${fieldPrefix}.number`,
      message: 'Hole number must be a valid number',
      code: 'INVALID_HOLE_NUMBER'
    });
  } else if (hole.number < 1 || hole.number > 18) {
    errors.push({
      field: `${fieldPrefix}.number`,
      message: 'Hole number must be between 1 and 18',
      code: 'HOLE_NUMBER_OUT_OF_RANGE'
    });
  }

  // Validate par (3-5)
  if (typeof hole.par !== 'number' || isNaN(hole.par)) {
    errors.push({
      field: `${fieldPrefix}.par`,
      message: 'Par must be a valid number',
      code: 'INVALID_PAR'
    });
  } else if (hole.par < 3 || hole.par > 5) {
    errors.push({
      field: `${fieldPrefix}.par`,
      message: 'Par must be between 3 and 5',
      code: 'PAR_OUT_OF_RANGE'
    });
  }

  // Validate yardage
  if (typeof hole.yardage !== 'number' || isNaN(hole.yardage)) {
    errors.push({
      field: `${fieldPrefix}.yardage`,
      message: 'Yardage must be a valid number',
      code: 'INVALID_YARDAGE'
    });
  } else {
    if (hole.yardage < 50 || hole.yardage > 700) {
      warnings.push({
        field: `${fieldPrefix}.yardage`,
        message: `Yardage ${hole.yardage} is outside typical range (50-700 yards)`,
        code: 'UNUSUAL_YARDAGE'
      });
    }

    // Par-specific yardage warnings
    if (hole.par === 3 && (hole.yardage < 90 || hole.yardage > 250)) {
      warnings.push({
        field: `${fieldPrefix}.yardage`,
        message: `Par 3 yardage ${hole.yardage} is outside typical range (90-250 yards)`,
        code: 'UNUSUAL_PAR3_YARDAGE'
      });
    } else if (hole.par === 4 && (hole.yardage < 250 || hole.yardage > 470)) {
      warnings.push({
        field: `${fieldPrefix}.yardage`,
        message: `Par 4 yardage ${hole.yardage} is outside typical range (250-470 yards)`,
        code: 'UNUSUAL_PAR4_YARDAGE'
      });
    } else if (hole.par === 5 && (hole.yardage < 450 || hole.yardage > 600)) {
      warnings.push({
        field: `${fieldPrefix}.yardage`,
        message: `Par 5 yardage ${hole.yardage} is outside typical range (450-600 yards)`,
        code: 'UNUSUAL_PAR5_YARDAGE'
      });
    }
  }

  // Validate stroke index (1-18)
  if (typeof hole.strokeIndex !== 'number' || isNaN(hole.strokeIndex)) {
    errors.push({
      field: `${fieldPrefix}.strokeIndex`,
      message: 'Stroke index must be a valid number',
      code: 'INVALID_STROKE_INDEX'
    });
  } else if (hole.strokeIndex < 1 || hole.strokeIndex > 18) {
    errors.push({
      field: `${fieldPrefix}.strokeIndex`,
      message: 'Stroke index must be between 1 and 18',
      code: 'STROKE_INDEX_OUT_OF_RANGE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates course data from unknown source (e.g., imports)
 */
export function validateCourseData(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Basic type checking
  if (!data || typeof data !== 'object') {
    errors.push({
      field: 'course',
      message: 'Course data must be an object',
      code: 'INVALID_COURSE_DATA'
    });
    return { isValid: false, errors, warnings };
  }

  try {
    // Cast to course and validate
    const course = data as Course;
    return validateCourse(course);
  } catch (error) {
    errors.push({
      field: 'course',
      message: `Invalid course data structure: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code: 'MALFORMED_COURSE_DATA'
    });
    return { isValid: false, errors, warnings };
  }
}

/**
 * Creates a sanitized course object from potentially unsafe input
 */
export function sanitizeCourseData(data: unknown): Course | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  try {
    const input = data as any;
    
    // Create a clean course object
    const course: Course = {
      id: typeof input.id === 'string' ? input.id : crypto.randomUUID(),
      name: typeof input.name === 'string' ? input.name.trim() : '',
      location: typeof input.location === 'string' ? input.location.trim() : '',
      teeOptions: [],
      dateAdded: input.dateAdded instanceof Date ? input.dateAdded : new Date(),
      lastPlayed: input.lastPlayed instanceof Date ? input.lastPlayed : undefined,
      isDefault: typeof input.isDefault === 'boolean' ? input.isDefault : false
    };

    // Sanitize tee options
    if (Array.isArray(input.teeOptions)) {
      course.teeOptions = input.teeOptions
        .map((tee: unknown) => sanitizeTeeOption(tee))
        .filter((tee): tee is TeeOption => tee !== null);
    }

    return course;
  } catch (error) {
    return null;
  }
}

/**
 * Creates a sanitized tee option from potentially unsafe input
 */
function sanitizeTeeOption(data: unknown): TeeOption | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  try {
    const input = data as any;
    
    const tee: TeeOption = {
      id: typeof input.id === 'string' ? input.id : crypto.randomUUID(),
      name: typeof input.name === 'string' ? input.name.trim() : 'Unknown',
      color: typeof input.color === 'string' ? input.color.trim() : 'White',
      gender: ['M', 'F', 'Any'].includes(input.gender) ? input.gender : 'Any',
      rating: typeof input.rating === 'number' && !isNaN(input.rating) ? input.rating : 72.0,
      slope: typeof input.slope === 'number' && !isNaN(input.slope) ? Math.max(55, Math.min(155, input.slope)) : 113,
      holes: []
    };

    // Sanitize holes
    if (Array.isArray(input.holes)) {
      tee.holes = input.holes
        .map((hole: unknown) => sanitizeHoleInfo(hole))
        .filter((hole): hole is HoleInfo => hole !== null);
    }

    return tee;
  } catch (error) {
    return null;
  }
}

/**
 * Creates a sanitized hole info from potentially unsafe input
 */
function sanitizeHoleInfo(data: unknown): HoleInfo | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  try {
    const input = data as any;
    
    return {
      number: typeof input.number === 'number' && !isNaN(input.number) ? Math.max(1, Math.min(18, input.number)) : 1,
      par: typeof input.par === 'number' && !isNaN(input.par) ? Math.max(3, Math.min(5, input.par)) : 4,
      yardage: typeof input.yardage === 'number' && !isNaN(input.yardage) ? Math.max(50, Math.min(700, input.yardage)) : 400,
      strokeIndex: typeof input.strokeIndex === 'number' && !isNaN(input.strokeIndex) ? Math.max(1, Math.min(18, input.strokeIndex)) : 1
    };
  } catch (error) {
    return null;
  }
} 
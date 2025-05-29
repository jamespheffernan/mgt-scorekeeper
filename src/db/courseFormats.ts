/**
 * Course Import/Export Format Specifications
 * Defines standard JSON formats for course data exchange
 */

import { Course, TeeOption, HoleInfo } from './courseModel';
import { validateCourse, sanitizeCourseData } from './courseValidation';

/**
 * Course Export Format - includes metadata for tracking
 */
export interface CourseExportFormat {
  version: string;
  exportDate: string;
  source: string;
  courses: Course[];
  metadata?: {
    exportedBy?: string;
    description?: string;
    tags?: string[];
  };
}

/**
 * Single course import format with optional metadata
 */
export interface CourseImportFormat {
  version?: string;
  course?: Course;
  courses?: Course[];
  metadata?: {
    source?: string;
    importDate?: string;
    notes?: string;
  };
}

/**
 * Simplified course format for basic imports (e.g., from web scraping)
 */
export interface SimpleCourseFormat {
  name: string;
  location: string;
  tees: {
    name: string;
    color?: string;
    gender?: 'M' | 'F' | 'Any';
    rating?: number;
    slope?: number;
    holes: {
      number: number;
      par: number;
      yardage: number;
      strokeIndex?: number;
    }[];
  }[];
}

/**
 * Course export utilities
 */
export class CourseExporter {
  private static readonly CURRENT_VERSION = '1.0.0';

  /**
   * Export courses to standardized JSON format
   */
  static exportCourses(
    courses: Course[],
    metadata?: {
      exportedBy?: string;
      description?: string;
      tags?: string[];
    }
  ): CourseExportFormat {
    return {
      version: this.CURRENT_VERSION,
      exportDate: new Date().toISOString(),
      source: 'millbrook-scorekeeper',
      courses: courses.map(this.sanitizeCourseForExport),
      metadata
    };
  }

  /**
   * Export single course
   */
  static exportCourse(course: Course): CourseExportFormat {
    return this.exportCourses([course]);
  }

  /**
   * Create a course backup file content
   */
  static createBackup(courses: Course[]): string {
    const exportData = this.exportCourses(courses, {
      description: 'Course database backup',
      exportedBy: 'millbrook-scorekeeper'
    });
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Sanitize course for export (remove sensitive data, ensure consistency)
   */
  private static sanitizeCourseForExport(course: Course): Course {
    return {
      ...course,
      id: course.id, // Keep ID for tracking
      dateAdded: course.dateAdded || new Date(),
      teeOptions: course.teeOptions.map(tee => ({
        ...tee,
        holes: tee.holes.sort((a, b) => a.number - b.number) // Ensure holes are sorted
      }))
    };
  }
}

/**
 * Course import utilities
 */
export class CourseImporter {
  /**
   * Import courses from various JSON formats
   */
  static async importFromJson(jsonData: string): Promise<{
    courses: Course[];
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const courses: Course[] = [];

    try {
      const data = JSON.parse(jsonData);
      
      // Try different import formats
      if (this.isExportFormat(data)) {
        return this.importFromExportFormat(data);
      } else if (this.isImportFormat(data)) {
        return this.importFromImportFormat(data);
      } else if (this.isSimpleFormat(data)) {
        return this.importFromSimpleFormat(data);
      } else if (Array.isArray(data)) {
        return this.importFromCourseArray(data);
      } else if (this.isSingleCourse(data)) {
        return this.importFromSingleCourse(data);
      } else {
        errors.push('Unrecognized JSON format');
      }
    } catch (error) {
      errors.push(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { courses, errors, warnings };
  }

  /**
   * Import from standardized export format
   */
  private static importFromExportFormat(data: CourseExportFormat): {
    courses: Course[];
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const courses: Course[] = [];

    // Version compatibility check
    if (data.version && data.version !== '1.0.0') {
      warnings.push(`Import version ${data.version} may not be fully compatible`);
    }

    // Process each course
    for (const courseData of data.courses || []) {
      const sanitized = sanitizeCourseData(courseData);
      if (sanitized) {
        const validation = validateCourse(sanitized);
        if (validation.isValid) {
          // Generate new ID to avoid conflicts
          courses.push({
            ...sanitized,
            id: crypto.randomUUID(),
            dateAdded: new Date()
          });
        } else {
          errors.push(`Course "${sanitized.name}": ${validation.errors.map(e => e.message).join(', ')}`);
        }
        
        // Add warnings
        validation.warnings.forEach(w => 
          warnings.push(`Course "${sanitized.name}": ${w.message}`)
        );
      }
    }

    return { courses, errors, warnings };
  }

  /**
   * Import from import format
   */
  private static importFromImportFormat(data: CourseImportFormat): {
    courses: Course[];
    errors: string[];
    warnings: string[];
  } {
    const coursesToImport = data.courses || (data.course ? [data.course] : []);
    return this.importFromCourseArray(coursesToImport);
  }

  /**
   * Import from simplified format
   */
  private static importFromSimpleFormat(data: SimpleCourseFormat): {
    courses: Course[];
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const course: Course = {
        id: crypto.randomUUID(),
        name: data.name,
        location: data.location,
        dateAdded: new Date(),
        teeOptions: data.tees.map(tee => ({
          id: crypto.randomUUID(),
          name: tee.name,
          color: tee.color || 'Unknown',
          gender: tee.gender || 'Any',
          rating: tee.rating || 72.0,
          slope: tee.slope || 113,
          holes: tee.holes.map(hole => ({
            ...hole,
            strokeIndex: hole.strokeIndex || hole.number
          }))
        }))
      };

      const validation = validateCourse(course);
      if (validation.isValid) {
        validation.warnings.forEach(w => warnings.push(w.message));
        return { courses: [course], errors, warnings };
      } else {
        validation.errors.forEach(e => errors.push(e.message));
      }
    } catch (error) {
      errors.push(`Error converting simple format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { courses: [], errors, warnings };
  }

  /**
   * Import from array of courses
   */
  private static importFromCourseArray(data: unknown[]): {
    courses: Course[];
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const courses: Course[] = [];

    for (const item of data) {
      const sanitized = sanitizeCourseData(item);
      if (sanitized) {
        const validation = validateCourse(sanitized);
        if (validation.isValid) {
          courses.push({
            ...sanitized,
            id: crypto.randomUUID(),
            dateAdded: new Date()
          });
        } else {
          errors.push(`Course "${sanitized.name}": ${validation.errors.map(e => e.message).join(', ')}`);
        }
        
        validation.warnings.forEach(w => 
          warnings.push(`Course "${sanitized.name}": ${w.message}`)
        );
      }
    }

    return { courses, errors, warnings };
  }

  /**
   * Import single course
   */
  private static importFromSingleCourse(data: unknown): {
    courses: Course[];
    errors: string[];
    warnings: string[];
  } {
    return this.importFromCourseArray([data]);
  }

  // Format detection methods
  private static isExportFormat(data: any): data is CourseExportFormat {
    return data && data.version && data.courses && Array.isArray(data.courses);
  }

  private static isImportFormat(data: any): data is CourseImportFormat {
    return data && (data.course || data.courses);
  }

  private static isSimpleFormat(data: any): data is SimpleCourseFormat {
    return data && data.name && data.location && data.tees && Array.isArray(data.tees);
  }

  private static isSingleCourse(data: any): boolean {
    return data && data.name && data.location && data.teeOptions;
  }
}

/**
 * Course format validation utilities
 */
export class CourseFormatValidator {
  /**
   * Validate JSON string before import
   */
  static validateJsonFormat(jsonData: string): {
    isValid: boolean;
    format?: string;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const data = JSON.parse(jsonData);
      
      if (CourseImporter['isExportFormat'](data)) {
        return { isValid: true, format: 'export', errors, warnings };
      } else if (CourseImporter['isImportFormat'](data)) {
        return { isValid: true, format: 'import', errors, warnings };
      } else if (CourseImporter['isSimpleFormat'](data)) {
        return { isValid: true, format: 'simple', errors, warnings };
      } else if (Array.isArray(data)) {
        return { isValid: true, format: 'array', errors, warnings };
      } else if (CourseImporter['isSingleCourse'](data)) {
        return { isValid: true, format: 'single', errors, warnings };
      } else {
        errors.push('Unrecognized JSON format for course data');
      }
    } catch (error) {
      errors.push(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { isValid: false, errors, warnings };
  }

  /**
   * Get format description for user feedback
   */
  static getFormatDescription(format: string): string {
    switch (format) {
      case 'export':
        return 'Millbrook Scorekeeper export format with metadata';
      case 'import':
        return 'Course import format with optional metadata';
      case 'simple':
        return 'Simplified course format (e.g., from web scraping)';
      case 'array':
        return 'Array of course objects';
      case 'single':
        return 'Single course object';
      default:
        return 'Unknown format';
    }
  }
}

/**
 * Common course templates for quick creation
 */
export const COURSE_TEMPLATES = {
  par72Standard: {
    name: 'New Golf Course',
    location: 'City, State',
    tees: [{
      name: 'Championship',
      color: 'Blue',
      gender: 'M' as const,
      rating: 72.0,
      slope: 113,
      holes: [
        // Front 9
        { number: 1, par: 4, yardage: 400, strokeIndex: 1 },
        { number: 2, par: 3, yardage: 150, strokeIndex: 17 },
        { number: 3, par: 5, yardage: 500, strokeIndex: 5 },
        { number: 4, par: 4, yardage: 380, strokeIndex: 9 },
        { number: 5, par: 4, yardage: 420, strokeIndex: 3 },
        { number: 6, par: 3, yardage: 180, strokeIndex: 15 },
        { number: 7, par: 4, yardage: 360, strokeIndex: 11 },
        { number: 8, par: 5, yardage: 520, strokeIndex: 7 },
        { number: 9, par: 4, yardage: 390, strokeIndex: 13 },
        // Back 9
        { number: 10, par: 4, yardage: 410, strokeIndex: 2 },
        { number: 11, par: 3, yardage: 160, strokeIndex: 18 },
        { number: 12, par: 5, yardage: 510, strokeIndex: 6 },
        { number: 13, par: 4, yardage: 370, strokeIndex: 10 },
        { number: 14, par: 4, yardage: 430, strokeIndex: 4 },
        { number: 15, par: 3, yardage: 170, strokeIndex: 16 },
        { number: 16, par: 4, yardage: 350, strokeIndex: 12 },
        { number: 17, par: 5, yardage: 530, strokeIndex: 8 },
        { number: 18, par: 4, yardage: 400, strokeIndex: 14 }
      ]
    }]
  },
  
  par71Executive: {
    name: 'Executive Golf Course',
    location: 'City, State',
    tees: [{
      name: 'Regular',
      color: 'White',
      gender: 'Any' as const,
      rating: 65.0,
      slope: 105,
      holes: [
        // Shorter course with more par 3s (total par 71)
        { number: 1, par: 4, yardage: 320, strokeIndex: 1 },
        { number: 2, par: 3, yardage: 140, strokeIndex: 15 },
        { number: 3, par: 3, yardage: 160, strokeIndex: 9 },
        { number: 4, par: 4, yardage: 300, strokeIndex: 5 },
        { number: 5, par: 3, yardage: 120, strokeIndex: 17 },
        { number: 6, par: 4, yardage: 280, strokeIndex: 11 },
        { number: 7, par: 3, yardage: 110, strokeIndex: 13 },
        { number: 8, par: 5, yardage: 450, strokeIndex: 3 },
        { number: 9, par: 4, yardage: 310, strokeIndex: 7 },
        { number: 10, par: 4, yardage: 330, strokeIndex: 16 }, // Changed from par 3 to par 4
        { number: 11, par: 4, yardage: 290, strokeIndex: 6 },
        { number: 12, par: 4, yardage: 350, strokeIndex: 12 }, // Changed from par 3 to par 4
        { number: 13, par: 4, yardage: 320, strokeIndex: 2 },
        { number: 14, par: 4, yardage: 300, strokeIndex: 18 }, // Changed from par 3 to par 4
        { number: 15, par: 4, yardage: 270, strokeIndex: 10 },
        { number: 16, par: 4, yardage: 280, strokeIndex: 14 },
        { number: 17, par: 5, yardage: 480, strokeIndex: 4 },
        { number: 18, par: 5, yardage: 320, strokeIndex: 8 } // Changed from par 4 to par 5
      ]
    }]
  }
}; 
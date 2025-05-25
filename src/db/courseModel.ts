/**
 * Course Data Model
 * Defines the structure for golf courses, tee options, and hole information
 */

// Represents a single hole's information for a specific tee
export interface HoleInfo {
  number: number;   // 1-18
  par: number;      // 3-5 typically
  yardage: number;  // Length in yards
  strokeIndex: number; // Handicap allocation (1-18)
}

// Gender designation for tee options
export type Gender = 'M' | 'F' | 'Any';

// Represents a set of tees at a course
export interface TeeOption {
  id: string;         // UUID
  name: string;       // "Championship", "Member", etc.
  color: string;      // "Black", "Blue", "White", "Red", etc.
  gender: Gender;     // Typical gender designation
  rating: number;     // Course rating (e.g., 71.4)
  slope: number;      // Slope rating (e.g., 132)
  holes: HoleInfo[];  // 18 holes of data
}

// Represents a golf course with multiple tee options
export interface Course {
  id: string;            // UUID
  name: string;          // Course name
  location: string;      // City, State
  teeOptions: TeeOption[]; // Available tee options
  dateAdded?: Date;      // When the course was added
  lastPlayed?: Date;     // When the course was last played
  timesPlayed?: number;  // Number of times this course has been played
  isDefault?: boolean;   // Whether this is the default course
}

// Additional interface that extends Course with statistics
export interface CourseWithStats extends Course {
  timesPlayed: number;   // Number of times this course has been played
  averageScore?: number; // Average score on this course
}

/**
 * Import history record for tracking course imports
 */
export interface CourseImportRecord {
  id: string;
  timestamp: Date;
  courseId: string;
  courseName: string;
  source: 'OCR Photo Import' | 'JSON File Import' | 'API Import' | 'Manual Entry';
  action: 'new' | 'replaced' | 'kept-both' | 'merged';
  confidence?: number; // For OCR imports
  extractedData?: boolean; // Whether structured data was extracted
  errors?: string[]; // Any errors during import
  warnings?: string[]; // Any warnings during import
  originalData?: any; // Original import data for audit
} 
/**
 * Tests for Course Import/Export Formats
 */

import {
  CourseExporter,
  CourseImporter,
  CourseFormatValidator,
  COURSE_TEMPLATES,
  CourseExportFormat,
  SimpleCourseFormat
} from '../courseFormats';
import { Course, TeeOption, HoleInfo } from '../courseModel';

// Test data
const createTestCourse = (): Course => ({
  id: 'test-course-id',
  name: 'Test Golf Course',
  location: 'Test City, ST',
  dateAdded: new Date('2024-01-01'),
  timesPlayed: 3,
  teeOptions: [{
    id: 'test-tee-id',
    name: 'Championship',
    color: 'Black',
    gender: 'M',
    rating: 72.0,
    slope: 130,
    holes: Array.from({ length: 18 }, (_, i) => ({
      number: i + 1,
      par: i % 3 === 0 ? 3 : i % 3 === 1 ? 4 : 5,
      yardage: 300 + (i * 10),
      strokeIndex: i + 1
    } as HoleInfo))
  } as TeeOption]
});

describe('Course Import/Export Formats', () => {
  describe('CourseExporter', () => {
    const testCourse = createTestCourse();

    it('should export single course', () => {
      const exported = CourseExporter.exportCourse(testCourse);
      
      expect(exported.version).toBe('1.0.0');
      expect(exported.source).toBe('millbrook-scorekeeper');
      expect(exported.courses).toHaveLength(1);
      expect(exported.courses[0].name).toBe('Test Golf Course');
      expect(exported.exportDate).toBeDefined();
    });

    it('should export multiple courses', () => {
      const course2 = { ...testCourse, id: 'course-2', name: 'Second Course' };
      const exported = CourseExporter.exportCourses([testCourse, course2]);
      
      expect(exported.courses).toHaveLength(2);
      expect(exported.courses[0].name).toBe('Test Golf Course');
      expect(exported.courses[1].name).toBe('Second Course');
    });

    it('should include metadata when provided', () => {
      const metadata = {
        exportedBy: 'test-user',
        description: 'Test export',
        tags: ['backup', 'test']
      };
      
      const exported = CourseExporter.exportCourses([testCourse], metadata);
      
      expect(exported.metadata).toEqual(metadata);
    });

    it('should create backup format', () => {
      const backup = CourseExporter.createBackup([testCourse]);
      
      expect(typeof backup).toBe('string');
      const parsed = JSON.parse(backup);
      expect(parsed.metadata.description).toBe('Course database backup');
      expect(parsed.courses).toHaveLength(1);
    });

    it('should sort holes in exported courses', () => {
      const unsortedCourse = {
        ...testCourse,
        teeOptions: [{
          ...testCourse.teeOptions[0],
          holes: [
            { number: 3, par: 4, yardage: 400, strokeIndex: 3 },
            { number: 1, par: 4, yardage: 400, strokeIndex: 1 },
            { number: 2, par: 3, yardage: 150, strokeIndex: 2 }
          ]
        }]
      };
      
      const exported = CourseExporter.exportCourse(unsortedCourse);
      const holes = exported.courses[0].teeOptions[0].holes;
      
      expect(holes[0].number).toBe(1);
      expect(holes[1].number).toBe(2);
      expect(holes[2].number).toBe(3);
    });
  });

  describe('CourseImporter', () => {
    const testCourse = createTestCourse();
    const exportedData = CourseExporter.exportCourse(testCourse);

    it('should import from export format', async () => {
      const jsonData = JSON.stringify(exportedData);
      const result = await CourseImporter.importFromJson(jsonData);
      
      expect(result.courses).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.courses[0].name).toBe('Test Golf Course');
      expect(result.courses[0].location).toBe('Test City, ST');
      // ID should be regenerated
      expect(result.courses[0].id).not.toBe(testCourse.id);
    });

    it('should import from simple format', async () => {
      const simpleFormat: SimpleCourseFormat = {
        name: 'Simple Course',
        location: 'Simple City, ST',
        tees: [{
          name: 'Regular',
          color: 'White',
          rating: 70.0,
          slope: 115,
          holes: Array.from({ length: 18 }, (_, i) => ({
            number: i + 1,
            par: i % 3 === 0 ? 3 : i % 3 === 1 ? 4 : 5,
            yardage: 300 + (i * 10)
          }))
        }]
      };
      
      const jsonData = JSON.stringify(simpleFormat);
      const result = await CourseImporter.importFromJson(jsonData);
      
      expect(result.courses).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.courses[0].name).toBe('Simple Course');
      expect(result.courses[0].teeOptions[0].holes).toHaveLength(18);
      // Should fill in missing strokeIndex
      expect(result.courses[0].teeOptions[0].holes[0].strokeIndex).toBe(1);
    });

    it('should import from course array', async () => {
      const courseArray = [testCourse, { ...testCourse, name: 'Second Course' }];
      const jsonData = JSON.stringify(courseArray);
      const result = await CourseImporter.importFromJson(jsonData);
      
      expect(result.courses).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should import single course object', async () => {
      const jsonData = JSON.stringify(testCourse);
      const result = await CourseImporter.importFromJson(jsonData);
      
      expect(result.courses).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.courses[0].name).toBe('Test Golf Course');
    });

    it('should handle version compatibility warnings', async () => {
      const futureVersionData = {
        ...exportedData,
        version: '2.0.0'
      };
      
      const jsonData = JSON.stringify(futureVersionData);
      const result = await CourseImporter.importFromJson(jsonData);
      
      expect(result.warnings.some(w => w.includes('version 2.0.0 may not be fully compatible'))).toBe(true);
    });

    it('should handle invalid JSON', async () => {
      const result = await CourseImporter.importFromJson('invalid json');
      
      expect(result.courses).toHaveLength(0);
      expect(result.errors.some(e => e.includes('Invalid JSON'))).toBe(true);
    });

    it('should handle unrecognized format', async () => {
      const weirdFormat = { weird: 'data', not: 'a course' };
      const jsonData = JSON.stringify(weirdFormat);
      const result = await CourseImporter.importFromJson(jsonData);
      
      expect(result.courses).toHaveLength(0);
      expect(result.errors).toContain('Unrecognized JSON format');
    });

    it('should handle invalid course data', async () => {
      const invalidCourse = {
        name: '', // Invalid - empty name
        location: 'Test City',
        teeOptions: []
      };
      
      const jsonData = JSON.stringify([invalidCourse]);
      const result = await CourseImporter.importFromJson(jsonData);
      
      expect(result.courses).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should collect warnings from validation', async () => {
      const courseWithWarnings = {
        ...testCourse,
        name: 'A'.repeat(101), // Long name - should generate warning
        teeOptions: [{
          ...testCourse.teeOptions[0],
          rating: 45.0 // Unusual rating - should generate warning
        }]
      };
      
      const jsonData = JSON.stringify([courseWithWarnings]);
      const result = await CourseImporter.importFromJson(jsonData);
      
      expect(result.courses).toHaveLength(1);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('very long'))).toBe(true);
    });
  });

  describe('CourseFormatValidator', () => {
    const testCourse = createTestCourse();
    const exportedData = CourseExporter.exportCourse(testCourse);

    it('should validate export format', () => {
      const jsonData = JSON.stringify(exportedData);
      const result = CourseFormatValidator.validateJsonFormat(jsonData);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('export');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate simple format', () => {
      const simpleFormat: SimpleCourseFormat = {
        name: 'Test Course',
        location: 'Test City',
        tees: [{ name: 'Regular', holes: [] }]
      };
      
      const jsonData = JSON.stringify(simpleFormat);
      const result = CourseFormatValidator.validateJsonFormat(jsonData);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('simple');
    });

    it('should validate array format', () => {
      const arrayFormat = [testCourse];
      const jsonData = JSON.stringify(arrayFormat);
      const result = CourseFormatValidator.validateJsonFormat(jsonData);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('array');
    });

    it('should validate single course format', () => {
      const jsonData = JSON.stringify(testCourse);
      const result = CourseFormatValidator.validateJsonFormat(jsonData);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('single');
    });

    it('should reject invalid JSON', () => {
      const result = CourseFormatValidator.validateJsonFormat('invalid json');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid JSON'))).toBe(true);
    });

    it('should reject unrecognized format', () => {
      const weirdFormat = { weird: 'data' };
      const jsonData = JSON.stringify(weirdFormat);
      const result = CourseFormatValidator.validateJsonFormat(jsonData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unrecognized JSON format for course data');
    });

    it('should provide format descriptions', () => {
      expect(CourseFormatValidator.getFormatDescription('export'))
        .toBe('Millbrook Scorekeeper export format with metadata');
      expect(CourseFormatValidator.getFormatDescription('simple'))
        .toBe('Simplified course format (e.g., from web scraping)');
      expect(CourseFormatValidator.getFormatDescription('unknown'))
        .toBe('Unknown format');
    });
  });

  describe('COURSE_TEMPLATES', () => {
    it('should have par 72 standard template', () => {
      const template = COURSE_TEMPLATES.par72Standard;
      
      expect(template.name).toBe('New Golf Course');
      expect(template.tees).toHaveLength(1);
      expect(template.tees[0].holes).toHaveLength(18);
      
      const totalPar = template.tees[0].holes.reduce((sum, hole) => sum + hole.par, 0);
      expect(totalPar).toBe(72);
    });

    it('should have par 71 executive template', () => {
      const template = COURSE_TEMPLATES.par71Executive;
      
      expect(template.name).toBe('Executive Golf Course');
      expect(template.tees).toHaveLength(1);
      expect(template.tees[0].holes).toHaveLength(18);
      
      const totalPar = template.tees[0].holes.reduce((sum, hole) => sum + hole.par, 0);
      expect(totalPar).toBe(71);
      
      // Should have at least 4 par 3s (executive courses often have more par 3s)
      const par3Count = template.tees[0].holes.filter(hole => hole.par === 3).length;
      expect(par3Count).toBeGreaterThanOrEqual(4);
    });

    it('should have valid stroke indexes', () => {
      const template = COURSE_TEMPLATES.par72Standard;
      const strokeIndexes = template.tees[0].holes.map(hole => hole.strokeIndex);
      
      // Should have all numbers 1-18
      const expectedSIs = Array.from({ length: 18 }, (_, i) => i + 1);
      const sortedStrokeIndexes = [...strokeIndexes].sort((a, b) => a - b);
      expect(sortedStrokeIndexes).toEqual(expectedSIs);
    });

    it('should have reasonable yardages', () => {
      const template = COURSE_TEMPLATES.par72Standard;
      const yardages = template.tees[0].holes.map(hole => hole.yardage);
      
      // All yardages should be reasonable
      expect(yardages.every(y => y >= 100 && y <= 600)).toBe(true);
      
      // Par 3s should be shorter than par 5s
      const par3s = template.tees[0].holes.filter(h => h.par === 3);
      const par5s = template.tees[0].holes.filter(h => h.par === 5);
      
      const avgPar3 = par3s.reduce((sum, h) => sum + h.yardage, 0) / par3s.length;
      const avgPar5 = par5s.reduce((sum, h) => sum + h.yardage, 0) / par5s.length;
      
      expect(avgPar3).toBeLessThan(avgPar5);
    });
  });

  describe('End-to-End Import/Export', () => {
    it('should round-trip export and import', async () => {
      const originalCourse = createTestCourse();
      
      // Export
      const exported = CourseExporter.exportCourse(originalCourse);
      const jsonData = JSON.stringify(exported);
      
      // Import
      const result = await CourseImporter.importFromJson(jsonData);
      
      expect(result.courses).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      
      const importedCourse = result.courses[0];
      expect(importedCourse.name).toBe(originalCourse.name);
      expect(importedCourse.location).toBe(originalCourse.location);
      expect(importedCourse.teeOptions).toHaveLength(1);
      expect(importedCourse.teeOptions[0].name).toBe(originalCourse.teeOptions[0].name);
      expect(importedCourse.teeOptions[0].holes).toHaveLength(18);
    });

    it('should handle template conversion', async () => {
      const template = COURSE_TEMPLATES.par72Standard;
      
      // Convert template to simple format
      const simpleFormat: SimpleCourseFormat = {
        name: template.name,
        location: template.location,
        tees: template.tees.map(tee => ({
          name: tee.name,
          color: tee.color,
          gender: tee.gender,
          rating: tee.rating,
          slope: tee.slope,
          holes: tee.holes
        }))
      };
      
      // Import template
      const jsonData = JSON.stringify(simpleFormat);
      const result = await CourseImporter.importFromJson(jsonData);
      
      expect(result.courses).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      
      const importedCourse = result.courses[0];
      expect(importedCourse.teeOptions[0].holes).toHaveLength(18);
      
      // Verify par total
      const totalPar = importedCourse.teeOptions[0].holes.reduce((sum, hole) => sum + hole.par, 0);
      expect(totalPar).toBe(72);
    });
  });
}); 
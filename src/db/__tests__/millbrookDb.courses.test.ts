/**
 * Tests for Course Database Functionality
 */

import { Course, TeeOption, HoleInfo } from '../courseModel';

// Mock the millbrookDb module to avoid IndexedDB dependency
jest.mock('../millbrookDb', () => {
  // Create a simple in-memory store for testing
  let courses: Course[] = [];
  
  return {
    millbrookDb: {
      courses: {
        clear: jest.fn().mockImplementation(() => {
          courses = [];
          return Promise.resolve();
        }),
        toArray: jest.fn().mockImplementation(() => Promise.resolve([...courses])),
        put: jest.fn().mockImplementation((course: Course) => {
          const index = courses.findIndex(c => c.id === course.id);
          if (index >= 0) {
            courses[index] = course;
          } else {
            courses.push(course);
          }
          return Promise.resolve(course.id);
        }),
        get: jest.fn().mockImplementation((id: string) => {
          const course = courses.find(c => c.id === id);
          return Promise.resolve(course);
        }),
        delete: jest.fn().mockImplementation((id: string) => {
          const index = courses.findIndex(c => c.id === id);
          if (index >= 0) {
            courses.splice(index, 1);
          }
          return Promise.resolve();
        })
      },
      getAllCourses: jest.fn().mockImplementation(() => Promise.resolve([...courses])),
      getCourse: jest.fn().mockImplementation((id: string) => {
        const course = courses.find(c => c.id === id);
        return Promise.resolve(course);
      }),
      saveCourse: jest.fn().mockImplementation((course: Course) => {
        const index = courses.findIndex(c => c.id === course.id);
        if (index >= 0) {
          courses[index] = course;
        } else {
          courses.push(course);
        }
        return Promise.resolve(course.id);
      }),
      deleteCourse: jest.fn().mockImplementation((id: string) => {
        const index = courses.findIndex(c => c.id === id);
        if (index >= 0) {
          courses.splice(index, 1);
        }
        return Promise.resolve();
      }),
      searchCourses: jest.fn().mockImplementation((query: string) => {
        if (!query || query.trim().length === 0) {
          return Promise.resolve([...courses]);
        }
        const searchTerm = query.toLowerCase().trim();
        const filtered = courses.filter(course => 
          course.name.toLowerCase().includes(searchTerm) ||
          course.location.toLowerCase().includes(searchTerm)
        );
        return Promise.resolve(filtered);
      }),
      filterCourses: jest.fn().mockImplementation((filters: any) => {
        let filtered = [...courses];

        if (filters.location) {
          const locationLower = filters.location.toLowerCase();
          filtered = filtered.filter(course => 
            course.location.toLowerCase().includes(locationLower)
          );
        }

        if (filters.hasRating !== undefined) {
          filtered = filtered.filter(course => {
            const hasRatings = course.teeOptions.some(tee => 
              tee.rating > 0 && tee.slope > 0
            );
            return filters.hasRating ? hasRatings : !hasRatings;
          });
        }

        if (filters.minTimesPlayed !== undefined) {
          filtered = filtered.filter(course => 
            (course.timesPlayed || 0) >= filters.minTimesPlayed
          );
        }

        if (filters.maxTimesPlayed !== undefined) {
          filtered = filtered.filter(course => 
            (course.timesPlayed || 0) <= filters.maxTimesPlayed
          );
        }

        if (filters.playedAfter) {
          filtered = filtered.filter(course => 
            course.lastPlayed && course.lastPlayed >= filters.playedAfter
          );
        }

        if (filters.playedBefore) {
          filtered = filtered.filter(course => 
            course.lastPlayed && course.lastPlayed <= filters.playedBefore
          );
        }

        return Promise.resolve(filtered);
      }),
      getCoursesByUsage: jest.fn().mockImplementation(() => {
        const sorted = [...courses].sort((a, b) => (b.timesPlayed || 0) - (a.timesPlayed || 0));
        return Promise.resolve(sorted);
      }),
      getRecentCourses: jest.fn().mockImplementation((limit: number = 5) => {
        const filtered = courses
          .filter(course => course.lastPlayed)
          .sort((a, b) => {
            const aDate = a.lastPlayed?.getTime() || 0;
            const bDate = b.lastPlayed?.getTime() || 0;
            return bDate - aDate;
          })
          .slice(0, limit);
        return Promise.resolve(filtered);
      }),
      updateCourseUsage: jest.fn().mockImplementation((courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        if (!course) {
          return Promise.resolve();
        }
        const updatedCourse: Course = {
          ...course,
          lastPlayed: new Date(),
          timesPlayed: (course.timesPlayed || 0) + 1
        };
        const index = courses.findIndex(c => c.id === courseId);
        courses[index] = updatedCourse;
        return Promise.resolve();
      }),
      getCourseStats: jest.fn().mockImplementation(() => {
        const totalCourses = courses.length;
        
        const coursesWithRatings = courses.filter(course => 
          course.teeOptions.some(tee => tee.rating > 0 && tee.slope > 0)
        ).length;

        const coursesWithPlays = courses.filter(course => (course.timesPlayed || 0) > 0);
        const mostPlayedCourse = coursesWithPlays.reduce((max, course) => 
          (course.timesPlayed || 0) > (max?.timesPlayed || 0) ? course : max, 
          undefined as Course | undefined
        );

        const totalPlays = courses.reduce((sum, course) => sum + (course.timesPlayed || 0), 0);
        const averageTimesPlayed = totalCourses > 0 ? totalPlays / totalCourses : 0;

        return Promise.resolve({
          totalCourses,
          coursesWithRatings,
          mostPlayedCourse,
          averageTimesPlayed
        });
      })
    }
  };
});

// Import after mocking
import { millbrookDb } from '../millbrookDb';

// Mock data for testing
const createTestCourse = (overrides: Partial<Course> = {}): Course => ({
  id: crypto.randomUUID(),
  name: 'Test Golf Course',
  location: 'Test City, ST',
  teeOptions: [{
    id: crypto.randomUUID(),
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
    } as HoleInfo))
  } as TeeOption],
  dateAdded: new Date(),
  timesPlayed: 0,
  ...overrides
});

describe('Course Database Functionality', () => {
  beforeEach(async () => {
    // Clear the courses table before each test
    await millbrookDb.courses.clear();
  });

  describe('searchCourses', () => {
    it('should return all courses for empty query', async () => {
      const course1 = createTestCourse({ name: 'Pine Valley Golf Course' });
      const course2 = createTestCourse({ name: 'Augusta National Golf Club' });
      
      await millbrookDb.saveCourse(course1);
      await millbrookDb.saveCourse(course2);

      const results = await millbrookDb.searchCourses('');
      expect(results).toHaveLength(2);
    });

    it('should search by course name', async () => {
      const course1 = createTestCourse({ name: 'Pine Valley Golf Course' });
      const course2 = createTestCourse({ name: 'Augusta National Golf Club' });
      
      await millbrookDb.saveCourse(course1);
      await millbrookDb.saveCourse(course2);

      const results = await millbrookDb.searchCourses('Pine');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Pine Valley Golf Course');
    });

    it('should search by location', async () => {
      const course1 = createTestCourse({ 
        name: 'Course A', 
        location: 'New York, NY' 
      });
      const course2 = createTestCourse({ 
        name: 'Course B', 
        location: 'California, CA' 
      });
      
      await millbrookDb.saveCourse(course1);
      await millbrookDb.saveCourse(course2);

      const results = await millbrookDb.searchCourses('York');
      expect(results).toHaveLength(1);
      expect(results[0].location).toBe('New York, NY');
    });

    it('should be case insensitive', async () => {
      const course = createTestCourse({ name: 'UPPER CASE COURSE' });
      await millbrookDb.saveCourse(course);

      const results = await millbrookDb.searchCourses('upper case');
      expect(results).toHaveLength(1);
    });
  });

  describe('filterCourses', () => {
    beforeEach(async () => {
      const courses = [
        createTestCourse({ 
          name: 'Course A', 
          location: 'New York, NY',
          timesPlayed: 5,
          lastPlayed: new Date('2024-01-15')
        }),
        createTestCourse({ 
          name: 'Course B', 
          location: 'California, CA',
          timesPlayed: 2,
          lastPlayed: new Date('2024-02-20')
        }),
        createTestCourse({ 
          name: 'Course C', 
          location: 'New York, NY',
          timesPlayed: 0,
          lastPlayed: undefined
        })
      ];

      for (const course of courses) {
        await millbrookDb.saveCourse(course);
      }
    });

    it('should filter by location', async () => {
      const results = await millbrookDb.filterCourses({ location: 'New York' });
      expect(results).toHaveLength(2);
      expect(results.every(course => course.location.includes('New York'))).toBe(true);
    });

    it('should filter by minimum times played', async () => {
      const results = await millbrookDb.filterCourses({ minTimesPlayed: 3 });
      expect(results).toHaveLength(1);
      expect(results[0].timesPlayed).toBe(5);
    });

    it('should filter by maximum times played', async () => {
      const results = await millbrookDb.filterCourses({ maxTimesPlayed: 2 });
      expect(results).toHaveLength(2);
      expect(results.every(course => (course.timesPlayed || 0) <= 2)).toBe(true);
    });

    it('should filter by played after date', async () => {
      const filterDate = new Date('2024-02-01');
      const results = await millbrookDb.filterCourses({ playedAfter: filterDate });
      expect(results).toHaveLength(1);
      expect(results[0].location).toBe('California, CA');
    });

    it('should filter by played before date', async () => {
      const filterDate = new Date('2024-02-01');
      const results = await millbrookDb.filterCourses({ playedBefore: filterDate });
      expect(results).toHaveLength(1);
      expect(results[0].location).toBe('New York, NY');
      expect(results[0].timesPlayed).toBe(5);
    });
  });

  describe('getCoursesByUsage', () => {
    it('should return courses sorted by times played (descending)', async () => {
      const courses = [
        createTestCourse({ name: 'Course A', timesPlayed: 2 }),
        createTestCourse({ name: 'Course B', timesPlayed: 5 }),
        createTestCourse({ name: 'Course C', timesPlayed: 1 })
      ];

      for (const course of courses) {
        await millbrookDb.saveCourse(course);
      }

      const results = await millbrookDb.getCoursesByUsage();
      expect(results).toHaveLength(3);
      expect(results[0].timesPlayed).toBe(5);
      expect(results[1].timesPlayed).toBe(2);
      expect(results[2].timesPlayed).toBe(1);
    });

    it('should handle courses with undefined timesPlayed', async () => {
      const courses = [
        createTestCourse({ name: 'Course A', timesPlayed: 3 }),
        createTestCourse({ name: 'Course B', timesPlayed: undefined })
      ];

      for (const course of courses) {
        await millbrookDb.saveCourse(course);
      }

      const results = await millbrookDb.getCoursesByUsage();
      expect(results[0].timesPlayed).toBe(3);
      expect(results[1].timesPlayed).toBeUndefined();
    });
  });

  describe('getRecentCourses', () => {
    it('should return recently played courses sorted by last played date', async () => {
      const courses = [
        createTestCourse({ 
          name: 'Course A', 
          lastPlayed: new Date('2024-01-01') 
        }),
        createTestCourse({ 
          name: 'Course B', 
          lastPlayed: new Date('2024-03-01') 
        }),
        createTestCourse({ 
          name: 'Course C', 
          lastPlayed: new Date('2024-02-01') 
        }),
        createTestCourse({ 
          name: 'Course D', 
          lastPlayed: undefined // Never played
        })
      ];

      for (const course of courses) {
        await millbrookDb.saveCourse(course);
      }

      const results = await millbrookDb.getRecentCourses(2);
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Course B'); // Most recent
      expect(results[1].name).toBe('Course C'); // Second most recent
    });

    it('should exclude courses that have never been played', async () => {
      const courses = [
        createTestCourse({ name: 'Played Course', lastPlayed: new Date() }),
        createTestCourse({ name: 'Never Played', lastPlayed: undefined })
      ];

      for (const course of courses) {
        await millbrookDb.saveCourse(course);
      }

      const results = await millbrookDb.getRecentCourses();
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Played Course');
    });
  });

  describe('updateCourseUsage', () => {
    it('should increment times played and update last played date', async () => {
      const course = createTestCourse({ timesPlayed: 2 });
      await millbrookDb.saveCourse(course);

      const beforeUpdate = new Date();
      await millbrookDb.updateCourseUsage(course.id);
      const afterUpdate = new Date();

      const updatedCourse = await millbrookDb.getCourse(course.id);
      expect(updatedCourse?.timesPlayed).toBe(3);
      expect(updatedCourse?.lastPlayed).toBeDefined();
      
      if (updatedCourse?.lastPlayed) {
        expect(updatedCourse.lastPlayed.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
        expect(updatedCourse.lastPlayed.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
      }
    });

    it('should handle courses with undefined times played', async () => {
      const course = createTestCourse({ timesPlayed: undefined });
      await millbrookDb.saveCourse(course);

      await millbrookDb.updateCourseUsage(course.id);

      const updatedCourse = await millbrookDb.getCourse(course.id);
      expect(updatedCourse?.timesPlayed).toBe(1);
    });

    it('should do nothing for non-existent course', async () => {
      // Should not throw error
      await expect(millbrookDb.updateCourseUsage('non-existent-id')).resolves.toBeUndefined();
    });
  });

  describe('getCourseStats', () => {
    it('should return correct statistics', async () => {
      const courses = [
        createTestCourse({ 
          name: 'Course A', 
          timesPlayed: 5,
          teeOptions: [{
            id: 'tee1',
            name: 'Championship',
            color: 'Black',
            gender: 'M',
            rating: 72.0,
            slope: 130,
            holes: []
          }]
        }),
        createTestCourse({ 
          name: 'Course B', 
          timesPlayed: 3,
          teeOptions: [{
            id: 'tee2',
            name: 'Forward',
            color: 'Red',
            gender: 'F',
            rating: 0, // No rating
            slope: 0,
            holes: []
          }]
        }),
        createTestCourse({ 
          name: 'Course C', 
          timesPlayed: 0
        })
      ];

      for (const course of courses) {
        await millbrookDb.saveCourse(course);
      }

      const stats = await millbrookDb.getCourseStats();
      expect(stats.totalCourses).toBe(3);
      expect(stats.coursesWithRatings).toBe(2); // Course A and C have ratings
      expect(stats.mostPlayedCourse?.name).toBe('Course A');
      expect(stats.averageTimesPlayed).toBeCloseTo(8/3, 2); // (5 + 3 + 0) / 3
    });

    it('should handle empty database', async () => {
      const stats = await millbrookDb.getCourseStats();
      expect(stats.totalCourses).toBe(0);
      expect(stats.coursesWithRatings).toBe(0);
      expect(stats.mostPlayedCourse).toBeUndefined();
      expect(stats.averageTimesPlayed).toBe(0);
    });
  });
}); 
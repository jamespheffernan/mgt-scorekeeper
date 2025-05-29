/**
 * Golf Course API Integration Service
 * Integrates with external golf course APIs to import course data
 */

import { Course, TeeOption, HoleInfo } from '../db/courseModel';
import { CourseImporter } from '../db/courseFormats';

/**
 * Golf API (golfapi.io) Response Types
 */
interface GolfApiClub {
  id: string;
  name: string;
  location: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface GolfApiCourse {
  id: string;
  club_id: string;
  name: string;
  holes: number;
  par: number;
  architect?: string;
  tees?: GolfApiTee[];
}

interface GolfApiTee {
  id: string;
  course_id: string;
  name: string;
  color: string;
  par: number;
  length: number;
  rating: number;
  slope: number;
  holes: GolfApiHole[];
}

interface GolfApiHole {
  number: number;
  par: number;
  length: number;
  handicap: number;
}

/**
 * Search criteria for finding courses
 */
export interface CourseSearchCriteria {
  name?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  limit?: number;
}

/**
 * API Integration Error
 */
export class ApiIntegrationError extends Error {
  constructor(
    message: string,
    public apiName: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ApiIntegrationError';
  }
}

/**
 * API Rate Limiting Handler
 */
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly timeWindow: number; // in milliseconds

  constructor(maxRequests: number = 100, timeWindowMinutes: number = 60) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowMinutes * 60 * 1000;
  }

  async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    // Check if we've exceeded the rate limit
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);
      throw new ApiIntegrationError(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        'RateLimiter'
      );
    }
    
    // Record this request
    this.requests.push(now);
  }
}

/**
 * Golf Course API Service
 */
export class GolfCourseApiService {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly rateLimiter: RateLimiter;
  private readonly timeout: number = 30000; // 30 seconds

  constructor(
    apiProvider: 'golfapi' | 'custom' = 'golfapi',
    apiKey?: string,
    rateLimit?: { maxRequests: number; timeWindowMinutes: number }
  ) {
    // Configure API endpoints
    switch (apiProvider) {
      case 'golfapi':
        this.baseUrl = 'https://api.golfapi.io/v1';
        break;
      case 'custom':
        this.baseUrl = 'https://api.custom-golf-provider.com';
        break;
      default:
        throw new Error(`Unsupported API provider: ${apiProvider}`);
    }

    this.apiKey = apiKey;
    this.rateLimiter = new RateLimiter(
      rateLimit?.maxRequests || 100,
      rateLimit?.timeWindowMinutes || 60
    );
  }

  /**
   * Search for golf clubs/courses
   */
  async searchCourses(criteria: CourseSearchCriteria): Promise<GolfApiClub[]> {
    await this.rateLimiter.checkRateLimit();

    try {
      const params = new URLSearchParams();
      if (criteria.name) params.append('name', criteria.name);
      if (criteria.location) params.append('location', criteria.location);
      if (criteria.city) params.append('city', criteria.city);
      if (criteria.state) params.append('state', criteria.state);
      if (criteria.country) params.append('country', criteria.country);
      if (criteria.limit) params.append('limit', criteria.limit.toString());

      const url = `${this.baseUrl}/clubs?${params.toString()}`;
      const response = await this.makeRequest(url);

      if (!Array.isArray(response)) {
        throw new ApiIntegrationError('Invalid response format', 'GolfAPI');
      }

      return response as GolfApiClub[];
    } catch (error) {
      throw this.handleApiError(error, 'Failed to search courses');
    }
  }

  /**
   * Get detailed course information by club ID
   */
  async getCourseDetails(clubId: string): Promise<GolfApiCourse[]> {
    await this.rateLimiter.checkRateLimit();

    try {
      const url = `${this.baseUrl}/clubs/${clubId}`;
      const response = await this.makeRequest(url);

      // Extract courses from club data
      if (response.courses && Array.isArray(response.courses)) {
        return response.courses as GolfApiCourse[];
      }

      throw new ApiIntegrationError('No courses found for club', 'GolfAPI');
    } catch (error) {
      throw this.handleApiError(error, 'Failed to get course details');
    }
  }

  /**
   * Get full course data including tees and holes
   */
  async getFullCourseData(courseId: string): Promise<GolfApiCourse> {
    await this.rateLimiter.checkRateLimit();

    try {
      const url = `${this.baseUrl}/courses/${courseId}`;
      const response = await this.makeRequest(url);

      return response as GolfApiCourse;
    } catch (error) {
      throw this.handleApiError(error, 'Failed to get full course data');
    }
  }

  /**
   * Convert API response to our internal Course format
   */
  static convertApiToCourse(
    apiClub: GolfApiClub,
    apiCourse: GolfApiCourse
  ): Course {
    const location = this.formatLocation(apiClub);
    
    const teeOptions: TeeOption[] = (apiCourse.tees || []).map(tee => ({
      id: crypto.randomUUID(),
      name: tee.name || 'Unknown',
      color: tee.color || 'White',
      gender: this.inferGender(tee.name, tee.color),
      rating: tee.rating || apiCourse.par || 72,
      slope: tee.slope || 113,
      holes: this.convertHoles(tee.holes)
    }));

    // If no tees provided, create a default one
    if (teeOptions.length === 0) {
      teeOptions.push({
        id: crypto.randomUUID(),
        name: 'Standard',
        color: 'White',
        gender: 'Any',
        rating: apiCourse.par || 72,
        slope: 113,
        holes: this.createDefaultHoles()
      });
    }

    return {
      id: crypto.randomUUID(),
      name: `${apiClub.name} - ${apiCourse.name}`.trim(),
      location,
      teeOptions,
      dateAdded: new Date()
    };
  }

  /**
   * Import course from API and validate
   */
  async importCourse(clubId: string, courseId?: string): Promise<{
    courses: Course[];
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const courses: Course[] = [];

    try {
      // Get club information
      const [searchResults] = await Promise.all([
        this.searchCourses({ name: clubId })
      ]);

      const club = searchResults.find(c => c.id === clubId) || searchResults[0];
      if (!club) {
        errors.push('Club not found');
        return { courses, errors, warnings };
      }

      // Get course details
      const coursesData = await this.getCourseDetails(club.id);
      
      for (const courseData of coursesData) {
        // Filter specific course if requested
        if (courseId && courseData.id !== courseId) {
          continue;
        }

        try {
          // Get full course data with tees
          const fullCourseData = await this.getFullCourseData(courseData.id);
          
          // Convert to our format
          const course = GolfCourseApiService.convertApiToCourse(club, fullCourseData);
          
          // Validate using our existing validation
          const importResult = await CourseImporter.importFromJson(
            JSON.stringify(course)
          );
          
          courses.push(...importResult.courses);
          errors.push(...importResult.errors);
          warnings.push(...importResult.warnings);
          
        } catch (courseError) {
          errors.push(`Failed to import course ${courseData.name}: ${
            courseError instanceof Error ? courseError.message : 'Unknown error'
          }`);
        }
      }

    } catch (error) {
      errors.push(`API import failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`);
    }

    return { courses, errors, warnings };
  }

  /**
   * Make HTTP request with error handling and timeout
   */
  private async makeRequest(url: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
        // Alternative: headers['X-API-Key'] = this.apiKey;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiIntegrationError(
          `API request failed: ${response.statusText}`,
          'GolfAPI',
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Handle API errors consistently
   */
  private handleApiError(error: unknown, context: string): ApiIntegrationError {
    if (error instanceof ApiIntegrationError) {
      return error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new ApiIntegrationError(`${context}: Request timeout`, 'GolfAPI');
      }
      return new ApiIntegrationError(
        `${context}: ${error.message}`,
        'GolfAPI',
        undefined,
        error
      );
    }

    return new ApiIntegrationError(`${context}: Unknown error`, 'GolfAPI');
  }

  /**
   * Format location string from API data
   */
  private static formatLocation(club: GolfApiClub): string {
    const parts = [club.city, club.state, club.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : club.location || 'Unknown Location';
  }

  /**
   * Infer gender from tee name/color
   */
  private static inferGender(name: string, color: string): 'M' | 'F' | 'Any' {
    const lowerName = name.toLowerCase();
    const lowerColor = color.toLowerCase();

    // Common patterns for gender-specific tees
    if (lowerName.includes('ladies') || lowerName.includes('women') || 
        lowerColor.includes('red') || lowerColor.includes('pink')) {
      return 'F';
    }
    
    if (lowerName.includes('mens') || lowerName.includes('championship') ||
        lowerColor.includes('black') || lowerColor.includes('gold')) {
      return 'M';
    }

    return 'Any';
  }

  /**
   * Convert API holes to our format
   */
  private static convertHoles(apiHoles: GolfApiHole[]): HoleInfo[] {
    if (!apiHoles || apiHoles.length === 0) {
      return this.createDefaultHoles();
    }

    return apiHoles
      .sort((a, b) => a.number - b.number)
      .map(hole => ({
        number: hole.number,
        par: hole.par || 4,
        yardage: hole.length || 400,
        strokeIndex: hole.handicap || hole.number
      }));
  }

  /**
   * Create default 18 holes when no data is available
   */
  private static createDefaultHoles(): HoleInfo[] {
    const holes: HoleInfo[] = [];
    
    for (let i = 1; i <= 18; i++) {
      holes.push({
        number: i,
        par: i % 6 === 0 ? 5 : i % 3 === 0 ? 3 : 4, // Mix of par 3, 4, 5
        yardage: i % 6 === 0 ? 520 : i % 3 === 0 ? 160 : 400,
        strokeIndex: i
      });
    }
    
    return holes;
  }
}

/**
 * Factory for creating API service instances
 */
export class ApiServiceFactory {
  static createGolfApiService(apiKey?: string): GolfCourseApiService {
    return new GolfCourseApiService('golfapi', apiKey, {
      maxRequests: 100,
      timeWindowMinutes: 60
    });
  }

  static createCustomApiService(baseUrl: string, apiKey?: string): GolfCourseApiService {
    // This would be extended for custom API providers
    throw new Error('Custom API service not yet implemented');
  }
} 
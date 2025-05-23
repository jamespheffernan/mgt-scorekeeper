import Dexie, { Table } from 'dexie';
import {
  Player,
  Match,
  GameState,
  GameHistory
} from './API-GameState';
import { Course } from './courseModel';
import { MILLBROOK_COURSE_DATA } from './millbrookCourseData';
import { MatchRoster } from '../types/player';

/**
 * Millbrook Game Scorekeeper Database
 * Handles persistence of players, matches, game states, and courses
 */
class MillbrookDatabase extends Dexie {
  players!: Table<Player, string>;
  matches!: Table<Match, string>;
  gameStates!: Table<GameState, string>;
  courses!: Table<Course, string>;
  gameHistory!: Table<GameHistory, string>;
  matchState!: Table<{id: string, roster?: MatchRoster}, string>;

  constructor() {
    super('millbrookDb');
    
    this.version(1).stores({
      players: 'id, name, index',
      matches: 'id, date, state',
      gameStates: 'match.id'
    });

    // Add courses table in version 2
    this.version(2).stores({
      courses: 'id, name, location'
    }).upgrade(tx => {
      // Add Millbrook Golf & Tennis Club course data on upgrade
      return tx.table('courses').add(MILLBROOK_COURSE_DATA);
    });
    
    // Add player preferences in version 3
    this.version(3).stores({
      players: 'id, name, index, defaultTeam, preferredTee, lastUsed'
    });
    
    // Add game history table in version 4
    this.version(4).stores({
      gameHistory: 'id, date, isComplete'
    });

    // Add match state table and player name splitting in version 5
    this.version(5).stores({
      players: 'id, name, first, last, index, ghin, defaultTeam, preferredTee, lastUsed',
      matchState: 'id'
    }).upgrade(tx => {
      // Split existing names into first/last
      return tx.table('players').toCollection().modify(player => {
        if (!player.first || !player.last) {
          const nameParts = player.name.split(' ');
          if (nameParts.length >= 2) {
            player.first = nameParts[0];
            player.last = nameParts.slice(1).join(' ');
          } else {
            player.first = player.name;
            player.last = '';
          }
        }
        
        // Ensure ghin field exists
        if (player.ghin === undefined) {
          player.ghin = '';
        }
      });
    });

    // Add migration for ensuring all player.index fields are numbers
    this.version(6).stores({
      players: 'id, name, first, last, index, ghin, defaultTeam, preferredTee, lastUsed',
      matchState: 'id'
    }).upgrade(tx => {
      // Ensure all player.index fields are numbers
      return tx.table('players').toCollection().modify(player => {
        if (typeof player.index === 'string') {
          const parsed = parseFloat(player.index);
          player.index = isNaN(parsed) ? 0 : parsed;
        }
      });
    });
  }

  /**
   * Get all saved players
   */
  async getAllPlayers(): Promise<Player[]> {
    try {
      console.log('[millbrookDb] getAllPlayers called');
      const arr = await this.players.toArray();
      console.log('[millbrookDb] getAllPlayers result:', arr);
      return arr;
    } catch (err) {
      console.error('[millbrookDb] getAllPlayers threw error:', err);
      return [];
    }
  }

  /**
   * Save a player to the database
   */
  async savePlayer(player: Player): Promise<string> {
    return this.players.put(player);
  }

  /**
   * Delete a player from the database
   */
  async deletePlayer(playerId: string): Promise<void> {
    return this.players.delete(playerId);
  }

  /**
   * Get all active matches
   */
  async getActiveMatches(): Promise<Match[]> {
    return this.matches
      .where('state')
      .equals('active')
      .toArray();
  }
  
  /**
   * Get all completed matches
   */
  async getCompletedMatches(): Promise<Match[]> {
    return this.matches
      .where('state')
      .equals('finished')
      .toArray();
  }

  /**
   * Save a match to the database
   */
  async saveMatch(match: Match): Promise<string> {
    return this.matches.put(match);
  }

  /**
   * Get the complete game state for a match
   */
  async getGameState(matchId: string): Promise<GameState | undefined> {
    return this.gameStates.get(matchId);
  }

  /**
   * Save a game state to the database
   */
  async saveGameState(gameState: GameState): Promise<string> {
    return this.gameStates.put(gameState);
  }
  
  /**
   * Save game history record
   */
  async saveGameHistory(history: GameHistory): Promise<string> {
    return this.gameHistory.put(history);
  }
  
  /**
   * Get all game history records
   */
  async getAllGameHistory(): Promise<GameHistory[]> {
    return this.gameHistory.toArray();
  }
  
  /**
   * Get game history by ID
   */
  async getGameHistory(id: string): Promise<GameHistory | undefined> {
    return this.gameHistory.get(id);
  }

  /**
   * Get all courses
   */
  async getAllCourses(): Promise<Course[]> {
    return this.courses.toArray();
  }

  /**
   * Get a course by id
   */
  async getCourse(courseId: string): Promise<Course | undefined> {
    return this.courses.get(courseId);
  }

  /**
   * Save a course to the database
   */
  async saveCourse(course: Course): Promise<string> {
    return this.courses.put(course);
  }

  /**
   * Delete a course
   */
  async deleteCourse(courseId: string): Promise<void> {
    return this.courses.delete(courseId);
  }

  /**
   * Search courses by name or location
   */
  async searchCourses(query: string): Promise<Course[]> {
    if (!query || query.trim().length === 0) {
      return this.getAllCourses();
    }

    const searchTerm = query.toLowerCase().trim();
    const allCourses = await this.courses.toArray();
    
    return allCourses.filter(course => 
      course.name.toLowerCase().includes(searchTerm) ||
      course.location.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Filter courses by various criteria
   */
  async filterCourses(filters: {
    location?: string;
    hasRating?: boolean;
    minTimesPlayed?: number;
    maxTimesPlayed?: number;
    playedAfter?: Date;
    playedBefore?: Date;
  }): Promise<Course[]> {
    let courses = await this.courses.toArray();

    if (filters.location) {
      const locationLower = filters.location.toLowerCase();
      courses = courses.filter(course => 
        course.location.toLowerCase().includes(locationLower)
      );
    }

    if (filters.hasRating !== undefined) {
      courses = courses.filter(course => {
        const hasRatings = course.teeOptions.some(tee => 
          tee.rating > 0 && tee.slope > 0
        );
        return filters.hasRating ? hasRatings : !hasRatings;
      });
    }

    if (filters.minTimesPlayed !== undefined) {
      courses = courses.filter(course => 
        (course.timesPlayed || 0) >= filters.minTimesPlayed!
      );
    }

    if (filters.maxTimesPlayed !== undefined) {
      courses = courses.filter(course => 
        (course.timesPlayed || 0) <= filters.maxTimesPlayed!
      );
    }

    if (filters.playedAfter) {
      courses = courses.filter(course => 
        course.lastPlayed && course.lastPlayed >= filters.playedAfter!
      );
    }

    if (filters.playedBefore) {
      courses = courses.filter(course => 
        course.lastPlayed && course.lastPlayed <= filters.playedBefore!
      );
    }

    return courses;
  }

  /**
   * Get courses sorted by usage (most played first)
   */
  async getCoursesByUsage(): Promise<Course[]> {
    const courses = await this.courses.toArray();
    return courses.sort((a, b) => (b.timesPlayed || 0) - (a.timesPlayed || 0));
  }

  /**
   * Get recently played courses
   */
  async getRecentCourses(limit: number = 5): Promise<Course[]> {
    const courses = await this.courses.toArray();
    return courses
      .filter(course => course.lastPlayed)
      .sort((a, b) => {
        const aDate = a.lastPlayed?.getTime() || 0;
        const bDate = b.lastPlayed?.getTime() || 0;
        return bDate - aDate;
      })
      .slice(0, limit);
  }

  /**
   * Update course usage statistics when a match is played
   */
  async updateCourseUsage(courseId: string): Promise<void> {
    const course = await this.getCourse(courseId);
    if (!course) {
      return;
    }

    const updatedCourse: Course = {
      ...course,
      lastPlayed: new Date(),
      timesPlayed: (course.timesPlayed || 0) + 1
    };

    await this.saveCourse(updatedCourse);
  }

  /**
   * Get course statistics
   */
  async getCourseStats(): Promise<{
    totalCourses: number;
    coursesWithRatings: number;
    mostPlayedCourse?: Course;
    averageTimesPlayed: number;
  }> {
    const courses = await this.courses.toArray();
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

    return {
      totalCourses,
      coursesWithRatings,
      mostPlayedCourse,
      averageTimesPlayed
    };
  }

  /**
   * Initialize with sample data if empty
   */
  async initializeIfEmpty(): Promise<void> {
    const coursesCount = await this.courses.count();
    if (coursesCount === 0) {
      await this.courses.add(MILLBROOK_COURSE_DATA);
    }
  }
}

// Create and export a singleton instance
export const millbrookDb = new MillbrookDatabase();

// Initialize the database when imported
millbrookDb.initializeIfEmpty().catch(err => {
  console.error('Failed to initialize database with sample data:', err);
}); 
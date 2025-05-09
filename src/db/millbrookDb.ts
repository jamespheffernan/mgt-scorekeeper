import Dexie, { Table } from 'dexie';
import {
  Player,
  Match,
  GameState,
  GameHistory
} from './API-GameState';
import { Course } from './courseModel';
import { MILLBROOK_COURSE_DATA } from './millbrookCourseData';

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
  }

  /**
   * Get all saved players
   */
  async getAllPlayers(): Promise<Player[]> {
    return this.players.toArray();
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
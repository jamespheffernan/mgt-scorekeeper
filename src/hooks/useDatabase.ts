import { useState, useEffect } from 'react';
import { millbrookDb } from '../db/millbrookDb';
import { Player, Match, GameState } from '../db/API-GameState';
import { generateUUID } from '../utils/uuid';

/**
 * Hook to provide database access and operations for the Millbrook Game app
 */
export function useDatabase() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const loadedPlayers = await millbrookDb.getAllPlayers();
        const loadedMatches = await millbrookDb.getActiveMatches();
        
        setPlayers(loadedPlayers);
        setActiveMatches(loadedMatches);
        setError(null);

        // Initialize player database if empty
        if (loadedPlayers.length === 0) {
          await initializePlayerDatabase();
        }
      } catch (err) {
        console.error('Database load error:', err);
        setError('Failed to load data from database');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Initialize player database with sample players
  const initializePlayerDatabase = async () => {
    try {
      const samplePlayers: Omit<Player, 'id'>[] = [
        { name: 'Jimmy', index: 9.0 },
        { name: 'Fred', index: 10.0 },
        { name: 'Neil', index: 4.0 },
        { name: 'Oliver', index: 12.0 },
      ];

      const savedPlayers: Player[] = [];
      for (const playerData of samplePlayers) {
        const player = await createPlayer(playerData);
        savedPlayers.push(player);
      }

      setPlayers(savedPlayers);
      console.log('Initialized player database with sample players');
    } catch (err) {
      console.error('Error initializing player database:', err);
    }
  };

  // Create a new player
  const createPlayer = async (playerData: Omit<Player, 'id'>): Promise<Player> => {
    const newPlayer: Player = {
      ...playerData,
      id: generateUUID()
    };

    try {
      await millbrookDb.savePlayer(newPlayer);
      setPlayers(prevPlayers => [...prevPlayers, newPlayer]);
      return newPlayer;
    } catch (err) {
      console.error('Error creating player:', err);
      throw new Error('Failed to create player');
    }
  };

  // Update an existing player
  const updatePlayer = async (player: Player): Promise<Player> => {
    try {
      await millbrookDb.savePlayer(player);
      setPlayers(prevPlayers => 
        prevPlayers.map(p => p.id === player.id ? player : p)
      );
      return player;
    } catch (err) {
      console.error('Error updating player:', err);
      throw new Error('Failed to update player');
    }
  };

  // Create a new match
  const createMatch = async (
    matchData: Omit<Match, 'id' | 'state' | 'currentHole' | 'carry' | 'base' | 'doubles' | 'bigGameTotal'>
  ): Promise<Match> => {
    const newMatch: Match = {
      ...matchData,
      id: generateUUID(),
      state: 'active',
      currentHole: 1,
      carry: 0,
      base: 1, // Initial base is $1
      doubles: 0,
      bigGameTotal: 0
    };

    try {
      await millbrookDb.saveMatch(newMatch);
      
      // Initialize empty GameState
      const gameState: GameState = {
        match: newMatch,
        players: [], // Retrieve player data separately
        playerTeams: [], // This will be populated at match start
        holeScores: [],
        ledger: [],
        junkEvents: [],
        bigGameRows: []
      };
      
      await millbrookDb.saveGameState(gameState);
      
      setActiveMatches(prevMatches => [...prevMatches, newMatch]);
      return newMatch;
    } catch (err) {
      console.error('Error creating match:', err);
      throw new Error('Failed to create match');
    }
  };

  // Get a match's game state
  const getGameState = async (matchId: string): Promise<GameState | undefined> => {
    try {
      return await millbrookDb.getGameState(matchId);
    } catch (err) {
      console.error('Error getting game state:', err);
      throw new Error('Failed to get game state');
    }
  };

  // Update a match's game state
  const updateGameState = async (gameState: GameState): Promise<void> => {
    try {
      await millbrookDb.saveGameState(gameState);
      
      // Update the match in active matches if it's there
      if (gameState.match.state === 'active') {
        setActiveMatches(prevMatches => 
          prevMatches.map(m => 
            m.id === gameState.match.id ? gameState.match : m
          )
        );
      } else {
        // Remove from active matches if finished
        setActiveMatches(prevMatches => 
          prevMatches.filter(m => m.id !== gameState.match.id)
        );
      }
    } catch (err) {
      console.error('Error updating game state:', err);
      throw new Error('Failed to update game state');
    }
  };

  return {
    players,
    activeMatches,
    isLoading,
    error,
    createPlayer,
    updatePlayer,
    createMatch,
    getGameState,
    updateGameState
  };
} 
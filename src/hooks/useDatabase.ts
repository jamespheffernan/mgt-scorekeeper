import { useState, useEffect } from 'react';
import { millbrookDb } from '../db/millbrookDb';
import { Player, Match, GameState } from '../db/API-GameState';
import { generateUUID } from '../utils/uuid';
import { splitNameParts } from '../utils/nameUtils';

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
        { first: 'Jimmy', last: '', name: 'Jimmy', index: 9.0 },
        { first: 'Fred', last: '', name: 'Fred', index: 10.0 },
        { first: 'Neil', last: '', name: 'Neil', index: 4.0 },
        { first: 'Oliver', last: '', name: 'Oliver', index: 12.0 },
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

  // Ensure a player object has first and last name properties
  const ensurePlayerNameFields = (playerData: any): Omit<Player, 'id'> => {
    const result = { ...playerData };
    
    // If we have name but missing first/last, populate them
    if (playerData.name && (!playerData.first || !playerData.last)) {
      const { first, last } = splitNameParts(playerData.name);
      result.first = first;
      result.last = last;
    }
    // If we have first/last but missing name, generate it
    else if (!playerData.name && playerData.first) {
      result.name = `${playerData.first} ${playerData.last || ''}`.trim();
    }
    
    return result as Omit<Player, 'id'>;
  };

  // Create a new player
  const createPlayer = async (playerData: Omit<Player, 'id'>): Promise<Player> => {
    // Ensure player has all required fields
    const processedData = ensurePlayerNameFields(playerData);
    
    const newPlayer: Player = {
      ...processedData,
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
    // Ensure player has all required fields
    const processedData = ensurePlayerNameFields(player);
    
    const updatedPlayer: Player = {
      ...player,
      ...processedData
    };
    
    try {
      await millbrookDb.savePlayer(updatedPlayer);
      setPlayers(prevPlayers => 
        prevPlayers.map(p => p.id === updatedPlayer.id ? updatedPlayer : p)
      );
      return updatedPlayer;
    } catch (err) {
      console.error('Error updating player:', err);
      throw new Error('Failed to update player');
    }
  };

  // Delete a player by ID
  const deletePlayerById = async (playerId: string): Promise<void> => {
    try {
      await millbrookDb.deletePlayer(playerId);
      setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== playerId));
    } catch (err) {
      console.error('Error deleting player:', err);
      throw new Error('Failed to delete player');
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
    deletePlayerById,
    createMatch,
    getGameState,
    updateGameState
  };
} 
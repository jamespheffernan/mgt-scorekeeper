import React, { useState, useEffect } from 'react';
import { TopPills } from './TopPills';
import { PlayerRow } from './PlayerRow';
import { useRosterStore } from '../../store/rosterStore';
import { millbrookDb } from '../../db/millbrookDb';
import { Player } from '../../db/API-GameState';
import { Team } from '../../types/player';
import './PlayersRoster.css';

export const PlayersScreen: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialize = useRosterStore(state => state.initialize);
  const roster = useRosterStore(state => state.roster);
  const { setTeam, remove } = useRosterStore();

  useEffect(() => {
    const initializeAndLoad = async () => {
      setLoading(true);
      try {
        await initialize();
        const allPlayers = await millbrookDb.getAllPlayers();
        setPlayers(allPlayers);
        setError(null);
      } catch (err: any) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(`Failed to load players: ${errorMessage}`);
        console.error("Initialization or player load failed:", err);
      } finally {
        setLoading(false);
      }
    };
    initializeAndLoad();
  }, [initialize]);

  const getPlayerTeam = (playerId: string): Team | null => {
    if (roster.red.includes(playerId)) return 'red';
    if (roster.blue.includes(playerId)) return 'blue';
    return null;
  };

  const handleTeamSelect = (playerId: string, team: Team) => {
    setTeam(playerId, team);
  };

  const handleRemovePlayer = (playerId: string) => {
    remove(playerId);
  };

  const handleAddPlayerClick = () => {
    // TODO: Implement logic to show the Add Player form/modal
    console.log('Add New Player button clicked');
    alert('Add Player functionality not yet implemented.');
  };

  return (
    <div className="players-screen">
      <div className="sticky-pills-wrapper">
        <TopPills />
      </div>

      <div className="players-content players-content-inline players-content-scrollable">
        <h1 className="players-title">Player Roster</h1>

        <div className="player-roster-inline">
          {loading ? (
            <div className="roster-message">Loading players...</div>
          ) : error ? (
            <div className="roster-message error">{error}</div>
          ) : players.length === 0 ? (
            <div className="roster-message empty-state">
              <div className="empty-icon">🏌️</div>
              <p>No players found in the database.</p>
            </div>
          ) : (
            <ul className="player-list divide-y" aria-label="Player Roster">
              {players.map(player => (
                <li key={player.id}>
                  <PlayerRow
                    player={player}
                    team={getPlayerTeam(player.id)}
                    onTeamSelect={handleTeamSelect}
                    onRemove={handleRemovePlayer}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* No longer a full-width button, but a FAB. Conditional rendering restored. */}
        {!loading && !error && (
          <button 
            className="fab-add-player" 
            onClick={handleAddPlayerClick}
            aria-label="Add New Player"
            title="Add New Player"
          >
            {/* SVG Person Icon */}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="w-6 h-6" // Adjust size as needed via CSS
            >
              <path 
                fillRule="evenodd" 
                d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" 
                clipRule="evenodd" 
              />
            </svg>
          </button>
        )}

      </div>
    </div>
  );
}; 
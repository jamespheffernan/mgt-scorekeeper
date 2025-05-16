import React, { useState, useEffect, useMemo } from 'react';
import { TopPills } from './TopPills';
import { PlayerRow } from './PlayerRow';
import { useRosterStore } from '../../store/rosterStore';
import { Player } from '../../db/API-GameState';
import { Team } from '../../types/player';
import './PlayersRoster.css';
import './PlayersScreen.css';
import { useFirestorePlayers } from '../../hooks/useFirestorePlayers';
import AddPlayerForm from './AddPlayerForm';
import StartMatchButton from './StartMatchButton';
import { QuickHandicapEditor } from './QuickHandicapEditor';

// Helper function to sort players by last name, then first name
const sortPlayersByLastName = (players: Player[]): Player[] => {
  return [...players].sort((a, b) => {
    // Compare last names (handling empty values)
    const lastA = (a.last || '').toLowerCase();
    const lastB = (b.last || '').toLowerCase();
    
    if (lastA !== lastB) {
      return lastA.localeCompare(lastB);
    }
    
    // If last names are the same, compare first names
    const firstA = (a.first || '').toLowerCase();
    const firstB = (b.first || '').toLowerCase();
    return firstA.localeCompare(firstB);
  });
};

export const PlayersScreen: React.FC = () => {
  const { players: dbPlayers, isLoading, error, createPlayer } = useFirestorePlayers();

  const initialize = useRosterStore(state => state.initialize);
  const roster = useRosterStore(state => state.roster);
  const { setTeam, remove } = useRosterStore();

  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showHandicapEditor, setShowHandicapEditor] = useState(false);

  // Sort players by last name
  const sortedPlayers = useMemo(() => {
    return sortPlayersByLastName(dbPlayers);
  }, [dbPlayers]);

  // Detect iOS standalone mode
  const isIOSStandalone = useMemo(() => {
    return (
      (window.navigator as any).standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    );
  }, []);

  useEffect(() => {
    const initializeRoster = async () => {
      try {
        await initialize();
      } catch (err: any) {
        console.error("Roster initialization failed:", err);
      }
    };
    initializeRoster();
  }, [initialize]);

  const getPlayerTeam = (playerId: string): Team | null => {
    if (Array.isArray(roster.red) && roster.red.includes(playerId)) return 'red';
    if (Array.isArray(roster.blue) && roster.blue.includes(playerId)) return 'blue';
    return null;
  };

  const handleTeamSelect = (playerId: string, team: Team) => {
    setTeam(playerId, team);
  };

  const handleRemovePlayer = (playerId: string) => {
    remove(playerId);
  };

  const handleAddPlayerClick = () => {
    setShowAddPlayerForm(true);
  };

  const handleSaveNewPlayer = async (playerData: { first: string; last: string; index: number }) => {
    try {
      await createPlayer({
        first: playerData.first,
        last: playerData.last,
        name: `${playerData.first} ${playerData.last}`.trim(),
        index: playerData.index,
      });
      setShowAddPlayerForm(false);
    } catch (err) {
      console.error("Failed to add player:", err);
      alert("Error adding player. Please try again.");
    }
  };

  const handleCancelAddPlayer = () => {
    setShowAddPlayerForm(false);
  };

  // Handler to open edit modal
  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setShowHandicapEditor(true);
  };

  // Handler to save player changes (should update Firestore)
  const handleSavePlayerEdit = async (updatedPlayer: Player) => {
    try {
      // You may need to update this to useFirestorePlayers().updatePlayer if not available in this scope
      // For now, just close modal
      setShowHandicapEditor(false);
      setEditingPlayer(null);
      // TODO: Actually update player in DB if needed
    } catch (error) {
      alert('Failed to update player. See console for details.');
      setShowHandicapEditor(false);
      setEditingPlayer(null);
    }
  };

  // Handler to delete player (should update Firestore)
  const handleDeletePlayer = async (playerId: string) => {
    try {
      // TODO: Actually delete player in DB if needed
      setShowHandicapEditor(false);
      setEditingPlayer(null);
    } catch (error) {
      alert('Failed to delete player. See console for details.');
      setShowHandicapEditor(false);
      setEditingPlayer(null);
    }
  };

  // Handler to cancel edit
  const handleCancelEdit = () => {
    setShowHandicapEditor(false);
    setEditingPlayer(null);
  };

  return (
    <div className="players-screen">
      <div className="sticky-pills-wrapper">
        <TopPills />
      </div>

      <div className="players-content players-content-inline players-content-scrollable">
        <h1 className="players-title">Player Roster</h1>

        <div className="player-roster-inline">
          {isLoading ? (
            <div className="roster-message">Loading players...</div>
          ) : error ? (
            <div className="roster-message error">{error}</div>
          ) : sortedPlayers.length === 0 ? (
            <div className="roster-message empty-state">
              <div className="empty-icon">🏌️</div>
              <p>No players found in the database.</p>
            </div>
          ) : (
            <ul className={`player-list player-list-divided${isIOSStandalone ? ' players-list--standalone' : ''}`} aria-label="Player Roster">
              {sortedPlayers.map(player => (
                <li key={player.id}>
                  <PlayerRow
                    player={player}
                    team={getPlayerTeam(player.id)}
                    onTeamSelect={handleTeamSelect}
                    onRemove={handleRemovePlayer}
                    onEdit={handleEditPlayer}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {!isLoading && !error && (
          <>
            <button 
              className="fab-add-player" 
              onClick={handleAddPlayerClick}
              aria-label="Add New Player"
              title="Add New Player"
            >
              <span style={{ fontSize: '28px', lineHeight: '1', marginRight: '4px' }}>+</span> 
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="fab-add-player-icon"
              >
                <path 
                  fillRule="evenodd" 
                  d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" 
                  clipRule="evenodd" 
                />
              </svg>
            </button>
            <StartMatchButton />
          </>
        )}

      </div>

      {showAddPlayerForm && (
        <AddPlayerForm
          show={showAddPlayerForm}
          onSave={handleSaveNewPlayer}
          onCancel={handleCancelAddPlayer}
        />
      )}

      {showHandicapEditor && editingPlayer && (
        <QuickHandicapEditor
          player={editingPlayer}
          onSave={handleSavePlayerEdit}
          onCancel={handleCancelEdit}
          onDelete={handleDeletePlayer}
        />
      )}
    </div>
  );
}; 
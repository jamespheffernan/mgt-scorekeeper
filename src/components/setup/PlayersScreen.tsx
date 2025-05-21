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
import { v4 as uuidv4 } from 'uuid';

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

// Helper to deduplicate players by ID
const dedupePlayersById = (players: Player[]): Player[] => {
  const seen = new Set<string>();
  return players.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
};

export const PlayersScreen: React.FC = () => {
  const { players: dbPlayers, isLoading, error, createPlayer, updatePlayer, deletePlayerById } = useFirestorePlayers();

  const initialize = useRosterStore(state => state.initialize);
  const roster = useRosterStore(state => state.roster);
  const { setTeam, remove } = useRosterStore();

  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showHandicapEditor, setShowHandicapEditor] = useState(false);

  // --- Ghost Player State ---
  const [ghostPlayers, setGhostPlayers] = useState<Player[]>([]); // local ghosts only
  const [ghostMode, setGhostMode] = useState(false);
  const [ghostError, setGhostError] = useState<string | null>(null);
  const [ghostTeamSelections, setGhostTeamSelections] = useState<{ [playerId: string]: Team }>({});

  // Sort and dedupe players by last name
  const sortedPlayers = useMemo(() => {
    return sortPlayersByLastName(dedupePlayersById(dbPlayers));
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

  const handleRemovePlayer = async (playerId: string) => {
    try {
      await deletePlayerById(playerId); // Deletes from Firestore/Dexie
      remove(playerId); // Removes from current roster/teams in rosterStore
    } catch (err) {
      console.error("Failed to remove player:", err);
      alert("Error removing player. Please try again.");
    }
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
      await updatePlayer(updatedPlayer);
      setShowHandicapEditor(false);
      setEditingPlayer(null);
    } catch (error) {
      alert('Failed to update player. See console for details.');
      setShowHandicapEditor(false);
      setEditingPlayer(null);
    }
  };

  // Handler to delete player (should update Firestore)
  const handleDeletePlayer = async (playerId: string) => {
    try {
      await deletePlayerById(playerId); // Actually delete player in DB
      // Also remove from selected players in roster store if they were part of it
      remove(playerId);
      setShowHandicapEditor(false);
      setEditingPlayer(null);
    } catch (error) {
      console.error('Failed to delete player:', error);
      alert('Failed to delete player. See console for details.');
      // Ensure UI resets even if DB delete fails, though this might leave orphaned data
      setShowHandicapEditor(false);
      setEditingPlayer(null);
    }
  };

  // Handler to cancel edit
  const handleCancelEdit = () => {
    setShowHandicapEditor(false);
    setEditingPlayer(null);
  };

  // Helper: All player IDs in roster (real + ghost)
  const allRosterIds = [...roster.red, ...roster.blue, ...ghostPlayers.map(g => g.id)];
  // Helper: All real player IDs in roster
  const realRosterIds = [...roster.red, ...roster.blue];
  // Helper: All base IDs used for ghosts
  const ghostBaseIds = ghostPlayers.map(g => g.sourcePlayerId!).filter(Boolean);

  // --- Ghost Mode Unified List ---
  // All eligible base players (not in match, not already used as ghost base)
  const eligibleGhostBases = sortedPlayers.filter(
    p => !ghostPlayers.some(g => g.sourcePlayerId === p.id)
  );
  // All assigned ghosts (in ghostPlayers)
  // Unified list: eligible + assigned ghosts
  const ghostModeList = [
    ...eligibleGhostBases.map(p => ({ type: 'candidate', player: p })),
    ...ghostPlayers.map(g => ({ type: 'ghost', player: g }))
  ];

  // Total selected (real + ghost)
  const totalSelected = realRosterIds.length + ghostPlayers.length;

  // Add ghost player to local state and assign to a team
  const assignGhostToTeam = (basePlayer: Player, team: Team) => {
    setGhostError(null);
    if (ghostPlayers.length + realRosterIds.length >= 4) {
      setGhostError('You cannot add more than 4 players.');
      return;
    }
    if (ghostPlayers.some(g => g.sourcePlayerId === basePlayer.id)) {
      setGhostError('This player is already used as a ghost base.');
      return;
    }
    const ghost: Player = {
      ...basePlayer,
      id: `ghost-${basePlayer.id}-${Date.now()}`,
      isGhost: true,
      sourcePlayerId: basePlayer.id,
      name: `Ghost (${basePlayer.first})`,
    };
    setGhostPlayers(prev => [...prev, ghost]);
    setTeam(ghost.id, team);
    setGhostTeamSelections(prev => {
      const copy = { ...prev };
      delete copy[basePlayer.id];
      return copy;
    });
  };
  // Remove ghost player
  const handleRemoveGhost = (ghostId: string) => {
    setGhostPlayers(prev => prev.filter(g => g.id !== ghostId));
    remove(ghostId);
  };

  // --- Render helpers ---
  // Show all available players for selection
  const availablePlayers = sortedPlayers;

  return (
    <div className="players-screen">
      <div className="sticky-pills-wrapper">
        <TopPills />
      </div>

      <div className="players-content players-content-inline players-content-scrollable">
        <h1 className="players-title">Player Roster</h1>

        {/* Ghost Mode Banner */}
        {ghostMode && (
          <div style={{ background: '#f3f3fa', color: '#333', padding: '10px', borderRadius: 8, marginBottom: 12, border: '1px solid #d0d0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span><span role="img" aria-label="Ghost">👻</span> <b>Ghost Mode:</b> Tap a player below to add as a ghost. <span style={{ color: '#888', fontSize: 13 }}>(Max 4 total players)</span></span>
            <button onClick={() => setGhostMode(false)} style={{ marginLeft: 16, background: '#fff', border: '1px solid #aaa', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>Done</button>
          </div>
        )}
        {ghostError && (
          <div style={{ color: '#e74c3c', marginBottom: 8 }}>{ghostError}</div>
        )}
        <div className="player-roster-inline">
          {isLoading ? (
            <div className="roster-message">Loading players...</div>
          ) : error ? (
            <div className="roster-message error">{error}</div>
          ) : availablePlayers.length === 0 ? (
            <div className="roster-message empty-state">
              <div className="empty-icon">🏌️</div>
              <p>No players found in the database.</p>
            </div>
          ) : (
            <ul className={`player-list player-list-divided${isIOSStandalone ? ' players-list--standalone' : ''}`} aria-label="Player Roster">
              {ghostMode
                ? ghostModeList.map(item => {
                    if (item.type === 'candidate') {
                      const player = item.player;
                      const selectedTeam = ghostTeamSelections[player.id] || 'red';
                      return (
                        <li key={player.id}>
                          <div className="player-row ghost-candidate" style={{ opacity: 0.7, background: '#f8f8ff', border: '1px dashed #aaa', borderRadius: 8, margin: '4px 0', padding: 8, display: 'flex', alignItems: 'center' }}>
                            <div className="player-info">
                              <div className="player-initials" title={player.name} style={{ opacity: 0.7, filter: 'grayscale(0.4) brightness(1.1)', background: 'linear-gradient(90deg, #e0e7ef 60%, #f3f4f6 100%)', color: '#888', position: 'relative' }}>
                                <span role="img" aria-label="Ghost" style={{ marginRight: 2, opacity: 0.7 }}>👻</span>
                                {player.first.charAt(0)}{player.last.charAt(0)}
                              </div>
                              <div>
                                <span className="player-name">{player.first} {player.last}</span>
                                <span className="player-index"> ({player.index})</span>
                              </div>
                            </div>
                            <div className="player-actions">
                              <div className="team-selection" role="radiogroup" aria-label={`Team selection for ${player.first} ${player.last}`}>
                                <button
                                  role="radio"
                                  aria-checked={selectedTeam === 'red'}
                                  className={`team-radio red ${selectedTeam === 'red' ? 'selected' : ''}`}
                                  onClick={() => assignGhostToTeam(player, 'red')}
                                  aria-label={`Assign ${player.first} ${player.last} to Red team`}
                                >
                                  Red
                                </button>
                                <button
                                  role="radio"
                                  aria-checked={selectedTeam === 'blue'}
                                  className={`team-radio blue ${selectedTeam === 'blue' ? 'selected' : ''}`}
                                  onClick={() => assignGhostToTeam(player, 'blue')}
                                  aria-label={`Assign ${player.first} ${player.last} to Blue team`}
                                >
                                  Blue
                                </button>
                              </div>
                              {/* No remove button for candidates */}
                            </div>
                          </div>
                        </li>
                      );
                    } else if (item.type === 'ghost') {
                      const ghost = item.player;
                      return (
                        <li key={ghost.id}>
                          <PlayerRow
                            player={ghost}
                            team={getPlayerTeam(ghost.id)}
                            onTeamSelect={setTeam}
                            onRemove={handleRemoveGhost}
                            onEdit={undefined}
                            isGhostDisplay
                          />
                        </li>
                      );
                    }
                    return null;
                  })
                : availablePlayers.map(player => (
                    <li key={player.id}>
                      <PlayerRow
                        player={player}
                        team={getPlayerTeam(player.id)}
                        onTeamSelect={handleTeamSelect}
                        onRemove={player.isGhost ? handleRemoveGhost : handleRemovePlayer}
                        onEdit={player.isGhost ? undefined : handleEditPlayer}
                      />
                    </li>
                  ))}
            </ul>
          )}
        </div>

        {/* Add Player FAB */}
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
            {/* Ghost FAB */}
            {totalSelected < 4 && eligibleGhostBases.length > 0 ? (
              <button
                className="fab-add-player"
                style={{ position: 'fixed', bottom: 90, right: 24, zIndex: 20, background: ghostMode ? '#e0e0ff' : '#fff', border: '2px solid #aaa' }}
                aria-label="Toggle Ghost Mode"
                title="Toggle Ghost Mode"
                onClick={() => setGhostMode(g => !g)}
              >
                <span role="img" aria-label="Ghost" style={{ fontSize: 24, marginRight: 8 }}>👻</span>
                {ghostMode ? 'Done' : 'Ghost'}
              </button>
            ) : (
              // Debug info if FAB not shown
              <div style={{ background: '#fffbe6', color: '#8a6d3b', padding: '8px', margin: '8px 0', fontSize: '13px', border: '1px solid #faebcc', borderRadius: 6 }}>
                <strong>Ghost FAB Debug:</strong><br />
                Selected Players: {totalSelected} <br />
                Eligible Ghost Bases: {eligibleGhostBases.length} <br />
                {eligibleGhostBases.length > 0 && (
                  <span>Eligible: {eligibleGhostBases.map(p => p.first + ' ' + p.last).join(', ')}</span>
                )}
              </div>
            )}
            <StartMatchButton />
          </>
        )}
      </div>

      {/* Add Player Modal */}
      {showAddPlayerForm && (
        <AddPlayerForm
          show={showAddPlayerForm}
          onSave={handleSaveNewPlayer}
          onCancel={handleCancelAddPlayer}
        />
      )}

      {/* Handicap Editor Modal */}
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
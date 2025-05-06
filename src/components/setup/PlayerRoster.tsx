import { useState, useEffect } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { Player, Team } from '../../store/gameStore';
import { QuickHandicapEditor } from './QuickHandicapEditor';
import '../../App.css';

// Interface for component props
interface PlayerRosterProps {
  onPlayersSelected: (players: Player[], teams: Team[]) => void;
}

// Create a local storage key for recently used players
const RECENT_PLAYERS_KEY = 'millbrook_recent_players';
const PLAYER_PREFERENCES_KEY = 'millbrook_player_preferences';

// Type for player preferences
interface PlayerPreference {
  playerId: string;
  lastUsed: string; // ISO date string
  defaultTeam?: Team;
}

const PlayerRoster = ({ onPlayersSelected }: PlayerRosterProps) => {
  // Access database
  const { players: dbPlayers, isLoading, createPlayer, updatePlayer } = useDatabase();
  
  // Component state
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>(['Red', 'Blue', 'Red', 'Blue']);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for new player form
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerIndex, setNewPlayerIndex] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // State for player preferences 
  const [playerPreferences, setPlayerPreferences] = useState<PlayerPreference[]>([]);
  
  // State for handicap editor
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showHandicapEditor, setShowHandicapEditor] = useState(false);

  // Load players and preferences on component mount
  useEffect(() => {
    // Set players from database
    setPlayers(dbPlayers);
    
    // Load player preferences from localStorage
    const savedPrefs = localStorage.getItem(PLAYER_PREFERENCES_KEY);
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs) as PlayerPreference[];
        setPlayerPreferences(prefs);
      } catch (e) {
        console.error('Failed to parse player preferences', e);
      }
    }
  }, [dbPlayers]);
  
  // Filter players based on search query
  const filteredPlayers = players.filter(player => 
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get recent players sorted by lastUsed date
  const recentPlayers = players.filter(player => {
    const pref = playerPreferences.find(p => p.playerId === player.id);
    return pref !== undefined;
  }).sort((a, b) => {
    const prefA = playerPreferences.find(p => p.playerId === a.id);
    const prefB = playerPreferences.find(p => p.playerId === b.id);
    
    if (!prefA || !prefB) return 0;
    return new Date(prefB.lastUsed).getTime() - new Date(prefA.lastUsed).getTime();
  }).slice(0, 6); // Limit to 6 most recent
  
  // Get remaining players (not in recent list)
  const remainingPlayers = players.filter(player => 
    !recentPlayers.some(rp => rp.id === player.id)
  );
  
  // Toggle player selection
  const togglePlayer = (player: Player) => {
    setSelectedPlayers(prev => {
      // If already selected, remove from selection
      if (prev.some(p => p.id === player.id)) {
        return prev.filter(p => p.id !== player.id);
      }
      
      // If we already have 4 players selected, replace the last one
      if (prev.length >= 4) {
        const newSelection = [...prev];
        newSelection[3] = player;
        return newSelection;
      }
      
      // Otherwise, add to selection
      return [...prev, player];
    });
  };
  
  // Update team for a player
  const updateTeam = (playerIndex: number, team: Team) => {
    setTeams(prev => {
      const newTeams = [...prev];
      newTeams[playerIndex] = team;
      return newTeams;
    });
  };
  
  // Handle adding a new player
  const handleAddPlayer = async () => {
    if (!newPlayerName || !newPlayerIndex) return;
    
    try {
      const index = parseFloat(newPlayerIndex);
      if (isNaN(index)) return;
      
      const newPlayer = await createPlayer({
        name: newPlayerName,
        index,
      });
      
      setPlayers(prev => [...prev, newPlayer]);
      setNewPlayerName('');
      setNewPlayerIndex('');
      setShowAddForm(false);
      
      // Auto-select the new player if we have less than 4
      if (selectedPlayers.length < 4) {
        togglePlayer(newPlayer);
      }
    } catch (error) {
      console.error('Failed to create player:', error);
    }
  };
  
  // Handle opening handicap editor
  const handleEditPlayer = (player: Player, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent toggling selection
    setEditingPlayer(player);
    setShowHandicapEditor(true);
  };
  
  // Handle saving player changes
  const handleSavePlayerEdit = async (updatedPlayer: Player) => {
    try {
      const savedPlayer = await updatePlayer(updatedPlayer);
      
      // Update the players list
      setPlayers(prev => 
        prev.map(p => p.id === savedPlayer.id ? savedPlayer : p)
      );
      
      // Update selected players if needed
      setSelectedPlayers(prev => 
        prev.map(p => p.id === savedPlayer.id ? savedPlayer : p)
      );
      
      // Close the editor
      setShowHandicapEditor(false);
      setEditingPlayer(null);
    } catch (error) {
      console.error('Failed to update player:', error);
    }
  };
  
  // Handle canceling edit
  const handleCancelEdit = () => {
    setShowHandicapEditor(false);
    setEditingPlayer(null);
  };
  
  // Handle final selection
  const handleConfirmSelection = () => {
    if (selectedPlayers.length !== 4) return;
    
    // Update player preferences in localStorage
    const updatedPrefs = [...playerPreferences];
    
    selectedPlayers.forEach((player, index) => {
      const existingPrefIndex = updatedPrefs.findIndex(p => p.playerId === player.id);
      const team = teams[index];
      
      if (existingPrefIndex >= 0) {
        // Update existing preference
        updatedPrefs[existingPrefIndex] = {
          ...updatedPrefs[existingPrefIndex],
          lastUsed: new Date().toISOString(),
          defaultTeam: team
        };
      } else {
        // Add new preference
        updatedPrefs.push({
          playerId: player.id,
          lastUsed: new Date().toISOString(),
          defaultTeam: team
        });
      }
    });
    
    // Save updated preferences
    setPlayerPreferences(updatedPrefs);
    localStorage.setItem(PLAYER_PREFERENCES_KEY, JSON.stringify(updatedPrefs));
    
    // Call the parent callback
    onPlayersSelected(selectedPlayers, teams);
  };
  
  // Assign default teams based on preferences
  useEffect(() => {
    if (selectedPlayers.length > 0) {
      const updatedTeams = [...teams];
      
      selectedPlayers.forEach((player, index) => {
        const pref = playerPreferences.find(p => p.playerId === player.id);
        if (pref?.defaultTeam) {
          updatedTeams[index] = pref.defaultTeam;
        }
      });
      
      setTeams(updatedTeams);
    }
  }, [selectedPlayers]);
  
  if (isLoading) {
    return <div>Loading players...</div>;
  }
  
  // Render the handicap editor if active
  if (showHandicapEditor && editingPlayer) {
    return (
      <QuickHandicapEditor
        player={editingPlayer}
        onSave={handleSavePlayerEdit}
        onCancel={handleCancelEdit}
      />
    );
  }
  
  return (
    <div className="player-roster">
      <h3>Select Players</h3>
      
      {/* Search input */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="player-search"
        />
      </div>
      
      {/* Selected players display */}
      <div className="selected-players">
        <h4>Selected Players: {selectedPlayers.length}/4</h4>
        <div className="selected-grid">
          {selectedPlayers.map((player, index) => (
            <div key={player.id} className="selected-player">
              <div className="player-info">
                <span>{player.name} ({player.index})</span>
                <button 
                  className="remove-btn"
                  onClick={() => togglePlayer(player)}
                >
                  ✕
                </button>
              </div>
              <div className="team-selector">
                <label>Team:</label>
                <select
                  value={teams[index]}
                  onChange={(e) => updateTeam(index, e.target.value as Team)}
                >
                  <option value="Red">Red</option>
                  <option value="Blue">Blue</option>
                </select>
              </div>
            </div>
          ))}
          
          {/* Placeholder slots for unselected players */}
          {Array.from({ length: 4 - selectedPlayers.length }).map((_, i) => (
            <div key={`empty-${i}`} className="selected-player empty">
              <span>Select player {selectedPlayers.length + i + 1}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Recent players section */}
      {recentPlayers.length > 0 && (
        <div className="player-list-section">
          <h4>Recent Players</h4>
          <div className="player-list">
            {recentPlayers.map(player => {
              const isSelected = selectedPlayers.some(p => p.id === player.id);
              const pref = playerPreferences.find(p => p.playerId === player.id);
              
              return (
                <div 
                  key={player.id}
                  className={`player-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => togglePlayer(player)}
                >
                  <div className="player-checkbox">
                    {isSelected ? '✓' : '○'}
                  </div>
                  <div className="player-details">
                    <span className="player-name">{player.name}</span>
                    <span className="player-index">{player.index}</span>
                    {pref?.defaultTeam && (
                      <span className={`team-indicator team-${pref.defaultTeam.toLowerCase()}`}>
                        {pref.defaultTeam}
                      </span>
                    )}
                  </div>
                  <button 
                    className="edit-player-btn" 
                    onClick={(e) => handleEditPlayer(player, e)}
                    title="Edit player"
                  >
                    ✎
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* All other players section */}
      <div className="player-list-section">
        <h4>All Players</h4>
        <div className="player-list">
          {remainingPlayers
            .filter(player => player.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(player => {
              const isSelected = selectedPlayers.some(p => p.id === player.id);
              
              return (
                <div 
                  key={player.id}
                  className={`player-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => togglePlayer(player)}
                >
                  <div className="player-checkbox">
                    {isSelected ? '✓' : '○'}
                  </div>
                  <div className="player-details">
                    <span className="player-name">{player.name}</span>
                    <span className="player-index">{player.index}</span>
                  </div>
                  <button 
                    className="edit-player-btn" 
                    onClick={(e) => handleEditPlayer(player, e)}
                    title="Edit player"
                  >
                    ✎
                  </button>
                </div>
              );
            })}
        </div>
      </div>
      
      {/* Add new player button & form */}
      {!showAddForm ? (
        <button 
          className="add-player-button"
          onClick={() => setShowAddForm(true)}
        >
          + Add New Player
        </button>
      ) : (
        <div className="add-player-form">
          <h4>Add New Player</h4>
          <div className="form-row">
            <input
              type="text"
              placeholder="Player Name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
            />
          </div>
          <div className="form-row">
            <input
              type="number"
              step="0.1"
              placeholder="Handicap Index"
              value={newPlayerIndex}
              onChange={(e) => setNewPlayerIndex(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button onClick={() => setShowAddForm(false)}>Cancel</button>
            <button 
              onClick={handleAddPlayer}
              disabled={!newPlayerName || !newPlayerIndex}
            >
              Add Player
            </button>
          </div>
        </div>
      )}
      
      {/* Confirm selection button */}
      <button
        className="confirm-button"
        disabled={selectedPlayers.length !== 4}
        onClick={handleConfirmSelection}
      >
        Continue with Selected Players
      </button>
    </div>
  );
};

export default PlayerRoster; 
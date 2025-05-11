import { useState, useEffect } from 'react';
import { useFirestorePlayers } from '../../hooks/useFirestorePlayers';
import { Player, Team } from '../../store/gameStore';
import { QuickHandicapEditor } from './QuickHandicapEditor';
import { Chip } from '../Chip';
import '../../App.css';

// Interface for component props
interface PlayerRosterProps {
  onPlayersSelected: (players: Player[], teams: Team[]) => void;
}

// Create a local storage key for recently used players
const PLAYER_PREFERENCES_KEY = 'millbrook_player_preferences';

// Type for player preferences
interface PlayerPreference {
  playerId: string;
  lastUsed: string; // ISO date string
  defaultTeam?: Team;
}

const PlayerRoster = ({ onPlayersSelected }: PlayerRosterProps) => {
  // Access database with Firestore and Dexie fallback
  const { 
    players: dbPlayers, 
    isLoading, 
    createPlayer, 
    updatePlayer,
    deletePlayerById,
    error
  } = useFirestorePlayers();
  
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
  const remainingPlayersLogic = players.filter(player => 
    !recentPlayers.some(rp => rp.id === player.id)
  );
  
  // Toggle player selection
  const togglePlayer = (player: Player) => {
    setSelectedPlayers(prev => {
      // If already selected, remove from selection
      if (prev.some(p => p.id === player.id)) {
        return prev.filter(p => p.id !== player.id);
      }
      
      // If we already have 4 players selected, do not add more (UI should guide this)
      // For now, simple replacement of the last one if trying to add a 5th.
      // This behavior might need refinement based on desired UX.
      if (prev.length >= 4) {
         // alert("You can only select 4 players."); // Or some other UI feedback
         // return prev; // Prevent adding more than 4
        const newSelection = [...prev];
        newSelection[3] = player; // Example: replace last
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
      if (isNaN(index) || index < 0 || index > 54) { // Basic validation for index
        alert("Please enter a valid handicap index (e.g., 0 to 54).");
        return;
      }
      
      const newPlayer = await createPlayer({
        name: newPlayerName,
        index,
      });
      
      // The useFirestorePlayers hook will update dbPlayers, which useEffect will pick up to update local players state
      // setPlayers(prev => [...prev, newPlayer]); // This might be redundant if dbPlayers updates promptly
      setNewPlayerName('');
      setNewPlayerIndex('');
      setShowAddForm(false);
      
      // Auto-select the new player if we have less than 4
      if (selectedPlayers.length < 4) {
        togglePlayer(newPlayer);
      }
    } catch (error) {
      console.error('Failed to create player:', error);
      alert('Failed to create player. See console for details.');
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
      await updatePlayer(updatedPlayer);
      // dbPlayers will update via the hook, triggering useEffect to update local players state
      
      // Update selected players if needed
      setSelectedPlayers(prev => 
        prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p)
      );
      
      setShowHandicapEditor(false);
      setEditingPlayer(null);
    } catch (error) {
      console.error('Failed to update player:', error);
      alert('Failed to update player. See console for details.');
    }
  };
  
  // Handle deleting a player
  const handleDeletePlayer = async (playerId: string) => {
    try {
      await deletePlayerById(playerId);
      // dbPlayers will update, local players state will update via useEffect
      setSelectedPlayers(prev => prev.filter(p => p.id !== playerId));
      setShowHandicapEditor(false);
      setEditingPlayer(null);
    } catch (error) {
      console.error('Failed to delete player:', error);
      alert('Failed to delete player. See console for details.');
    }
  };
  
  // Handle canceling edit
  const handleCancelEdit = () => {
    setShowHandicapEditor(false);
    setEditingPlayer(null);
  };
  
  // Handle final selection
  const handleConfirmSelection = () => {
    if (selectedPlayers.length !== 4) {
      alert("Please select exactly 4 players.");
      return;
    }
    
    const updatedPrefs = [...playerPreferences];
    selectedPlayers.forEach((player, index) => {
      const existingPrefIndex = updatedPrefs.findIndex(p => p.playerId === player.id);
      const team = teams[index]; // Assuming teams array aligns with selectedPlayers
      
      if (existingPrefIndex >= 0) {
        updatedPrefs[existingPrefIndex] = {
          ...updatedPrefs[existingPrefIndex],
          lastUsed: new Date().toISOString(),
          defaultTeam: team
        };
      } else {
        updatedPrefs.push({
          playerId: player.id,
          lastUsed: new Date().toISOString(),
          defaultTeam: team
        });
      }
    });
    
    setPlayerPreferences(updatedPrefs);
    localStorage.setItem(PLAYER_PREFERENCES_KEY, JSON.stringify(updatedPrefs));
    
    onPlayersSelected(selectedPlayers, teams);
  };
  
  // Assign default teams based on preferences
  useEffect(() => {
    if (selectedPlayers.length > 0) {
      const updatedTeams = selectedPlayers.map((player, index) => {
        const pref = playerPreferences.find(p => p.playerId === player.id);
        return pref?.defaultTeam || teams[index] || (index < 2 ? 'Red' : 'Blue'); // Fallback team logic
      }) as Team[]; // Ensure it's correctly typed
      
      // Only update if there's a change to avoid potential loops, though selectedPlayers dependency should handle this.
      if (JSON.stringify(updatedTeams) !== JSON.stringify(teams.slice(0, selectedPlayers.length))) {
         setTeams(prevTeams => {
            const newTeamsState = [...prevTeams] as Team[];
            selectedPlayers.forEach((_, idx) => {
                if(updatedTeams[idx]) newTeamsState[idx] = updatedTeams[idx];
            });
            return newTeamsState;
         });
      }
    }
  // Only run if selectedPlayers or playerPreferences change. Avoid direct dependency on 'teams' if it causes loops.
  }, [selectedPlayers, playerPreferences]); 


  if (isLoading) {
    return <div className="loading-message mobile-loading">Loading players...</div>;
  }

  // Filtered players based on search query
  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate recent and remaining from the filtered list
  const displayRecentPlayers = filteredPlayers.filter(player =>
    recentPlayers.some(rp => rp.id === player.id)
  );
  // Ensure remainingPlayersLogic is used here, or re-filter from 'players' not 'filteredPlayers' if that was the intent
  const displayRemainingPlayers = filteredPlayers.filter(player => 
    !displayRecentPlayers.some(rp => rp.id === player.id) // Ensure we use the already filtered recent players
  );

  // Selected Players section in the component
  const SelectedPlayers = () => (
    <div className="selected-players mb-4">
      <h4 className="text-base font-medium mb-2">Selected Players ({selectedPlayers.length}/4)</h4>
      <div className="selected-grid flex flex-wrap gap-2">
        {selectedPlayers.map((player, idx) => (
          <div key={player.id} className="flex items-center">
            <Chip
              name={player.name}
              onRemove={() => togglePlayer(player)}
            />
            <select
              value={teams[idx]}
              onChange={(e) => updateTeam(idx, e.target.value as Team)}
              className="ml-2 h-8 rounded px-2 text-sm border border-grey30"
            >
              <option value="Red">Red</option>
              <option value="Blue">Blue</option>
            </select>
          </div>
        ))}
        {/* Empty slots */}
        {Array.from({ length: 4 - selectedPlayers.length }, (_, i) => (
          <div key={`empty-${i}`} className="h-8 px-3 bg-grey30 rounded-full text-grey60 flex items-center">
            Player {selectedPlayers.length + i + 1}
          </div>
        ))}
      </div>
    </div>
  );

  // Search Box section in the component
  const SearchBox = () => (
    <div className="search-container mb-4">
      <input
        type="text"
        placeholder="Search players..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full h-10 px-3 border rounded"
      />
    </div>
  );

  // Add Player Button section in the component
  const AddPlayerButton = () => (
    <button
      onClick={() => setShowAddForm(true)}
      className="add-player-button btn-primary w-full h-10 rounded"
      disabled={selectedPlayers.length >= 4}
    >
      Add New Player
    </button>
  );

  return (
    <div className="player-roster-container mobile-player-roster">
      {/* Error Display */}
      {error && <div className="error-message mobile-error">{error}</div>}

      {/* Selected Players Summary - Crucial for Mobile */}
      <SelectedPlayers />

      {/* Search Bar */}
      <SearchBox />

      {/* Add New Player Button/Form */}
      <AddPlayerButton />

      {/* Player Lists */}
      <div className="player-lists-container mobile-scrollable-list-container">
        {displayRecentPlayers.length > 0 && (
          <div className="player-list-section mobile-list-section">
            <h5>Recent Players</h5>
            {displayRecentPlayers.map(player => (
              <div 
                key={player.id} 
                className={`player-item mobile-player-item ${selectedPlayers.some(p => p.id === player.id) ? 'selected' : ''}`}
                onClick={() => togglePlayer(player)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && togglePlayer(player) }
                aria-pressed={selectedPlayers.some(p => p.id === player.id)}
              >
                <span className="player-name-display">{player.name} ({player.index.toFixed(1)})</span>
                <button 
                  onClick={(e) => handleEditPlayer(player, e)} 
                  className="edit-player-button mobile-edit-button icon-button"
                  aria-label={`Edit ${player.name}`}
                >
                  ✎
                </button>
              </div>
            ))}
          </div>
        )}

        {displayRemainingPlayers.length > 0 && (
          <div className="player-list-section mobile-list-section">
            <h5>{searchQuery ? 'Search Results' : (displayRecentPlayers.length > 0 ? 'Other Players' : 'All Players')}</h5>
            {displayRemainingPlayers.map(player => (
              <div 
                key={player.id} 
                className={`player-item mobile-player-item ${selectedPlayers.some(p => p.id === player.id) ? 'selected' : ''}`}
                onClick={() => togglePlayer(player)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && togglePlayer(player) }
                aria-pressed={selectedPlayers.some(p => p.id === player.id)}
              >
                <span className="player-name-display">{player.name} ({player.index.toFixed(1)})</span>
                <button 
                  onClick={(e) => handleEditPlayer(player, e)} 
                  className="edit-player-button mobile-edit-button icon-button"
                  aria-label={`Edit ${player.name}`}
                >
                  ✎
                </button>
              </div>
            ))}
          </div>
        )}
         {filteredPlayers.length === 0 && !isLoading && (
            <p className="no-players-message mobile-centered-text">
              {searchQuery ? `No players found matching "${searchQuery}".` : "No players available. Try adding some!"}
            </p>
          )}
      </div>
      
      {/* Handicap Editor Modal */}
      {showHandicapEditor && editingPlayer && (
        <QuickHandicapEditor
          player={editingPlayer}
          onSave={handleSavePlayerEdit}
          onCancel={handleCancelEdit}
          onDelete={handleDeletePlayer}
        />
      )}

      {/* Action Button to Confirm */}
      <div className="confirm-selection-section mobile-confirm-button-sticky">
        <button 
          onClick={handleConfirmSelection} 
          disabled={selectedPlayers.length !== 4}
          className="confirm-button mobile-button-fullwidth primary-action-button"
          aria-live="polite"
        >
          {selectedPlayers.length === 4 ? 'Confirm Players & Set Course' : `Select ${4 - selectedPlayers.length} More Player(s)`}
        </button>
      </div>
    </div>
  );
};

export default PlayerRoster; 
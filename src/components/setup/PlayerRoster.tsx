import { useState, useEffect } from 'react';
import { useFirestorePlayers } from '../../hooks/useFirestorePlayers';
import { Player, Team } from '../../store/gameStore';
import { QuickHandicapEditor } from './QuickHandicapEditor';
import { Chip } from '../Chip';
import './PlayersRoster.css';
import { getFullName, splitNameParts } from '../../utils/nameUtils';
import PlayerName from '../../components/PlayerName';

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

// Simple helper function to sort players by last name, then first name
const sortPlayersByLastName = (players: Player[]): Player[] => {
  // Log the players before sorting for diagnostic purposes
  console.log('Players before sorting:', players.map(p => ({ 
    id: p.id, 
    first: p.first || '', 
    last: p.last || '', 
    name: p.name || ''
  })));
  
  const sorted = [...players].sort((a, b) => {
    // Compare last names
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
  
  // Log the players after sorting for diagnostic purposes
  console.log('Players after sorting by last name:', sorted.map(p => ({ 
    id: p.id, 
    first: p.first || '', 
    last: p.last || '', 
    sortKey: ((p.last || '') + ' ' + (p.first || '')).toLowerCase()
  })));
  
  return sorted;
};

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
  
  // Debug mode state
  const [debugMode, setDebugMode] = useState(true);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for new player form
  const [newPlayerFirst, setNewPlayerFirst] = useState('');
  const [newPlayerLast, setNewPlayerLast] = useState('');
  const [newPlayerIndex, setNewPlayerIndex] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // State for player preferences 
  const [playerPreferences, setPlayerPreferences] = useState<PlayerPreference[]>([]);
  
  // State for handicap editor
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showHandicapEditor, setShowHandicapEditor] = useState(false);

  // Function to migrate player data from legacy format
  const migratePlayersWithLegacyData = async (playersToCheck: Player[]) => {
    const playersToUpdate: Player[] = [];
    
    playersToCheck.forEach(player => {
      // Check if the player has only 'name' field but missing or empty first/last
      if (player.name && (!player.first || !player.last || player.first === '' || player.last === '')) {
        const { first, last } = splitNameParts(player.name);
        
        // Only update if we have valid parts to split
        if (first || last) {
          playersToUpdate.push({
            ...player,
            first: first || '',
            last: last || '',
            // We'll keep the original name for backward compatibility, but clients should use first/last
          });
        }
      }
    });
    
    // Update players in database if any need migration
    if (playersToUpdate.length > 0) {
      console.log(`Migrating ${playersToUpdate.length} players from legacy format...`);
      
      // Update each player
      for (const player of playersToUpdate) {
        try {
          await updatePlayer(player);
          console.log(`Migrated player: ${player.first} ${player.last}`);
        } catch (error) {
          console.error(`Failed to migrate player ${player.id}:`, error);
        }
      }
    }
  };

  // Load players and preferences on component mount
  useEffect(() => {
    // Set players from database
    setPlayers(dbPlayers);
    
    // Attempt to migrate any players with legacy data format
    migratePlayersWithLegacyData(dbPlayers);
    
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
    if ((!newPlayerFirst && !newPlayerLast) || !newPlayerIndex) return;
    
    try {
      const index = parseFloat(newPlayerIndex);
      if (isNaN(index) || index < 0 || index > 54) {
        alert("Please enter a valid handicap index (e.g., 0 to 54).");
        return;
      }
      
      const newPlayer = await createPlayer({
        first: newPlayerFirst,
        last: newPlayerLast,
        name: `${newPlayerFirst} ${newPlayerLast}`.trim(),
        index,
      });
      
      setNewPlayerFirst('');
      setNewPlayerLast('');
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

  // Enhanced search function that searches in both first and last name
  const filterPlayers = (players: Player[], query: string): Player[] => {
    if (!query) return players;
    
    const normalizedQuery = query.toLowerCase().trim();
    
    return players.filter(player => {
      const fullName = `${player.first} ${player.last}`.toLowerCase();
      const firstName = (player.first || '').toLowerCase();
      const lastName = (player.last || '').toLowerCase();
      const legacyName = (player.name || '').toLowerCase();
      
      return (
        fullName.includes(normalizedQuery) || 
        firstName.includes(normalizedQuery) || 
        lastName.includes(normalizedQuery) ||
        legacyName.includes(normalizedQuery)
      );
    });
  };

  if (isLoading) {
    return <div className="loading-message mobile-loading">Loading players...</div>;
  }

  // Filtered players based on search query
  const filteredPlayers = filterPlayers(players, searchQuery);

  // Separate recent and remaining from the filtered list
  const displayRecentPlayers = filteredPlayers.filter(player =>
    recentPlayers.some(rp => rp.id === player.id)
  );
  // Apply sorting alphabetically by last name to recent players
  const sortedRecentPlayers = sortPlayersByLastName(displayRecentPlayers);
  
  // Get remaining players and sort alphabetically by last name
  const displayRemainingPlayers = sortPlayersByLastName(
    filteredPlayers.filter(player => 
      !displayRecentPlayers.some(rp => rp.id === player.id)
    )
  );

  // Component to display selected players and team selection
  const SelectedPlayers = () => {
    // Ensure we have at most 4 selected players for display
    const displayPlayers = selectedPlayers.slice(0, 4);

    return (
      <div className="selected-players-summary mobile-selected-players-sticky">
        <h4 className="selected-players-title">Selected Players</h4>
        <div className="selected-players-grid">
          {Array.from({ length: 4 }).map((_, index) => {
            const player = displayPlayers[index];
            const team = teams[index];

            if (player) {
              return (
                <div key={player.id || index} className="team-selection-cell">
                  <Chip
                    name={getFullName(player)}
                    onRemove={() => togglePlayer(player)}
                    className={team === 'Blue' ? 'chip-blue' : 'chip-red'}
                  />
                  <select
                    value={team}
                    onChange={(e) => updateTeam(index, e.target.value as Team)}
                    className="team-select-dropdown"
                  >
                    <option value="Blue">Blue</option>
                    <option value="Red">Red</option>
                  </select>
                </div>
              );
            } else {
              // Placeholder for empty slot
              const isBlueTeamSlot = index % 2 === 1; // 0: Red, 1: Blue, 2: Red, 3: Blue
              return (
                <div
                  key={`empty-${index}`}
                  className={`empty-player-slot ${isBlueTeamSlot ? 'empty-player-slot-blue' : 'empty-player-slot-red'}`}
                  style={{
                    backgroundColor: isBlueTeamSlot ? 'rgba(0, 0, 255, 0.1)' : 'rgba(255, 0, 0, 0.1)',
                  }}
                >
                  {isBlueTeamSlot ? 'Select Blue Player' : 'Select Red Player'}
                </div>
              );
            }
          })}
        </div>
      </div>
    );
  };

  // Component for search box
  const SearchBox = () => (
    <div className="search-box-wrapper"> {/* Was search-container mb-4 */}
      <input
        type="text"
        placeholder="Search Players..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-input-field" // Was "w-full h-10 px-3 border rounded"
      />
    </div>
  );

  // Component for "Add New Player" button
  const AddPlayerButton = () => (
    <button
      onClick={() => setShowAddForm(true)}
      // Keeping add-player-button and btn-primary, adding general-button-styling
      className="add-player-button btn-primary general-button-styling" // Was "add-player-button btn-primary w-full h-10 rounded"
    >
      Add New Player
    </button>
  );

  return (
    <div className="player-roster-container mobile-player-roster">
      {/* Error Display */}
      {error && <div className="error-message mobile-error">{error}</div>}

      {/* Debug Information */}
      {debugMode && (
        <div style={{ background: '#ffe0e0', padding: '8px', margin: '8px 0', fontSize: '12px', border: '1px solid #ff0000', flexShrink: 0 }}>
          <h4>Debug Mode</h4>
          <button onClick={() => setDebugMode(false)} style={{ fontSize: '12px', padding: '2px 5px' }}>Hide Debug</button>
          <div>
            <strong>Players data:</strong>
            <pre style={{ maxHeight: '100px', overflow: 'auto', fontSize: '10px' }}>
              {JSON.stringify(players.slice(0, 3).map(p => ({
                id: p.id.substring(0, 8),
                first: p.first || '',
                last: p.last || '',
                sortKey: `${p.last || ''}, ${p.first || ''}`
              })), null, 2)}
              {players.length > 3 ? `... and ${players.length - 3} more` : ''}
            </pre>
          </div>
          <div>Check browser console for complete sorting logs</div>
        </div>
      )}

      {/* Selected Players Summary - Crucial for Mobile */}
      <SelectedPlayers />

      {/* Search Bar */}
      <SearchBox />

      {/* Add New Player Button */}
      <AddPlayerButton />

      {/* Add Player Form */}
      {showAddForm && (
        <div className="add-player-form-container"> {/* Was add-player-form mb-4 */}
          <h4 className="add-player-form-title">Add New Player</h4> {/* Was text-base font-medium mb-2 */}
          <input
            type="text"
            placeholder="First Name"
            value={newPlayerFirst}
            onChange={(e) => setNewPlayerFirst(e.target.value)}
            // Using form-input-field and form-input-field-spacing
            className="form-input-field form-input-field-spacing" // Was "w-full h-10 px-3 border rounded mb-3"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={newPlayerLast}
            onChange={(e) => setNewPlayerLast(e.target.value)}
            // Using form-input-field and form-input-field-spacing
            className="form-input-field form-input-field-spacing" // Was "w-full h-10 px-3 border rounded mb-3"
          />
          <input
            type="number"
            placeholder="Handicap Index"
            value={newPlayerIndex}
            onChange={(e) => setNewPlayerIndex(e.target.value)}
            // Using form-input-field and form-input-field-spacing
            className="form-input-field form-input-field-spacing" // Was "w-full h-10 px-3 border rounded mb-3"
          />
          <div className="form-actions-row"> {/* Was flex gap-2 */}
            <button
              onClick={() => setShowAddForm(false)}
              // Keeping cancel-button, adding form-button and general-button-styling
              className="cancel-button form-button general-button-styling" // Was "cancel-button flex-1 h-10 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleAddPlayer}
              // Keeping save-button, adding form-button and general-button-styling
              className="save-button btn-primary form-button general-button-styling" // Was "save-button flex-1 h-10 rounded"
            >
              Save Player
            </button>
          </div>
        </div>
      )}

      {/* Player Lists */}
      <div className="player-lists-container mobile-scrollable-list-container">
        {sortedRecentPlayers.length > 0 && (
          <div className="player-list-section mobile-list-section">
            <h5>Recent Players</h5>
            {sortedRecentPlayers.map(player => (
              <div 
                key={player.id} 
                className={`player-item mobile-player-item ${selectedPlayers.some(p => p.id === player.id) ? 'selected' : ''}`}
                onClick={() => togglePlayer(player)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && togglePlayer(player) }
                aria-pressed={selectedPlayers.some(p => p.id === player.id)}
              >
                <span className="player-name-display">
                  <PlayerName player={player} /> ({player.index.toFixed(1)})
                </span>
                <button 
                  onClick={(e) => handleEditPlayer(player, e)} 
                  className="edit-player-button mobile-edit-button icon-button"
                  aria-label={`Edit ${getFullName(player)}`}
                >
                  ✎
                </button>
              </div>
            ))}
          </div>
        )}

        {displayRemainingPlayers.length > 0 && (
          <div className="player-list-section mobile-list-section">
            <h5>{searchQuery ? 'Search Results' : (sortedRecentPlayers.length > 0 ? 'Other Players' : 'All Players')}</h5>
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
                <span className="player-name-display">
                  <PlayerName player={player} /> ({player.index.toFixed(1)})
                </span>
                <button 
                  onClick={(e) => handleEditPlayer(player, e)} 
                  className="edit-player-button mobile-edit-button icon-button"
                  aria-label={`Edit ${getFullName(player)}`}
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
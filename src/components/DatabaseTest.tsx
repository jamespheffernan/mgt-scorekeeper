import { useState } from 'react';
import { useDatabase } from '../hooks/useDatabase';
import { Player, Match } from '../db/API-GameState';

/**
 * A test component to verify our database functionality
 */
export function DatabaseTest() {
  const { 
    players,
    activeMatches,
    isLoading, 
    error,
    createPlayer,
    createMatch,
    getGameState
  } = useDatabase();

  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerIndex, setNewPlayerIndex] = useState('');
  const [playerTestResult, setPlayerTestResult] = useState<string | null>(null);
  
  // Match creation states
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [bigGameEnabled, setBigGameEnabled] = useState(false);
  const [matchTestResult, setMatchTestResult] = useState<string | null>(null);

  // Dummy par and stroke index values for testing
  const defaultPar = Array(18).fill(4);
  const defaultSI = Array(18).fill(0).map((_, i) => i + 1);

  // Test creating a player
  const handleCreatePlayer = async () => {
    if (!newPlayerName || !newPlayerIndex) {
      setPlayerTestResult('Please enter a name and handicap index');
      return;
    }

    try {
      const index = parseFloat(newPlayerIndex);
      if (isNaN(index)) {
        setPlayerTestResult('Handicap index must be a valid number');
        return;
      }

      const player: Omit<Player, 'id'> = {
        name: newPlayerName,
        index
      };

      const createdPlayer = await createPlayer(player);
      setPlayerTestResult(`Player created with ID: ${createdPlayer.id}`);
      setNewPlayerName('');
      setNewPlayerIndex('');
    } catch (err) {
      setPlayerTestResult('Error creating player');
      console.error(err);
    }
  };

  // Handle player selection for a match
  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds(prev => {
      // If already selected, remove
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      // If we already have 4 players and trying to add another, replace the first one
      if (prev.length >= 4) {
        const newSelection = [...prev];
        newSelection[0] = playerId;
        return newSelection;
      }
      // Otherwise add to selection
      return [...prev, playerId];
    });
  };

  // Create a match
  const handleCreateMatch = async () => {
    if (selectedPlayerIds.length !== 4) {
      setMatchTestResult('Please select exactly 4 players');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const newMatch = await createMatch({
        date: today,
        bigGame: bigGameEnabled,
        playerIds: selectedPlayerIds as [string, string, string, string],
        holePar: defaultPar,
        holeSI: defaultSI
      });

      // Verify we can retrieve the game state
      const gameState = await getGameState(newMatch.id);
      
      setMatchTestResult(
        `Match created with ID: ${newMatch.id.substring(0, 8)}. ` + 
        `Game state created: ${gameState ? 'Yes' : 'No'}`
      );
      
      // Reset selection
      setSelectedPlayerIds([]);
      setBigGameEnabled(false);
    } catch (err) {
      setMatchTestResult('Error creating match');
      console.error(err);
    }
  };

  if (isLoading) {
    return <div>Loading database...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="database-test">
      <h2>Database Test</h2>
      
      <div className="player-form">
        <h3>Create Player</h3>
        <div>
          <label>
            Name:
            <input 
              type="text" 
              value={newPlayerName} 
              onChange={(e) => setNewPlayerName(e.target.value)} 
            />
          </label>
        </div>
        <div>
          <label>
            Handicap Index:
            <input 
              type="text" 
              value={newPlayerIndex} 
              onChange={(e) => setNewPlayerIndex(e.target.value)} 
            />
          </label>
        </div>
        <button onClick={handleCreatePlayer}>Create Player</button>
        
        {playerTestResult && <div className="test-result">{playerTestResult}</div>}
      </div>
      
      <div className="player-list">
        <h3>Saved Players ({players.length})</h3>
        {players.length === 0 ? (
          <p>No players saved yet</p>
        ) : (
          <ul>
            {players.map((player) => (
              <li 
                key={player.id}
                className={selectedPlayerIds.includes(player.id) ? 'selected-player' : ''}
                onClick={() => togglePlayerSelection(player.id)}
              >
                <strong>{player.name}</strong> - Index: {player.index}
                {selectedPlayerIds.includes(player.id) && ' ✓'}
              </li>
            ))}
          </ul>
        )}
      </div>

      {players.length >= 4 && (
        <div className="match-form">
          <h3>Create Match</h3>
          <p>Selected Players: {selectedPlayerIds.length}/4</p>
          <div>
            <label>
              <input 
                type="checkbox" 
                checked={bigGameEnabled}
                onChange={(e) => setBigGameEnabled(e.target.checked)}
              />
              Enable Big Game
            </label>
          </div>
          <button 
            onClick={handleCreateMatch}
            disabled={selectedPlayerIds.length !== 4}
          >
            Create Match
          </button>
          
          {matchTestResult && <div className="test-result">{matchTestResult}</div>}
        </div>
      )}

      <div className="match-list">
        <h3>Active Matches ({activeMatches.length})</h3>
        {activeMatches.length === 0 ? (
          <p>No active matches</p>
        ) : (
          <ul>
            {activeMatches.map((match) => (
              <li key={match.id}>
                <strong>Match {match.id.substring(0, 8)}</strong> - 
                Date: {match.date}, 
                Current Hole: {match.currentHole},
                Big Game: {match.bigGame ? 'Yes' : 'No'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 
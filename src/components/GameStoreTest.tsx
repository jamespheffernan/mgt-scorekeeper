import { useState } from 'react';
import { useGameStore, Player, Team, JunkFlags } from '../store/gameStore';

export function GameStoreTest() {
  // Test state
  const [playerName, setPlayerName] = useState('');
  const [playerIndex, setPlayerIndex] = useState(8.4);
  const [playerTeam, setPlayerTeam] = useState<Team>('Red');
  const [enableBigGame, setEnableBigGame] = useState(false);
  const [grossScore, setGrossScore] = useState(4);
  
  // Get values from the store
  const {
    match,
    players,
    playerTeams,
    holeScores,
    ledger,
    junkEvents,
    bigGameRows,
    isDoubleAvailable,
    trailingTeam,
    // Actions
    createMatch,
    enterHoleScores,
    callDouble,
    finishRound,
    // Utilities
    getPlayerById
  } = useGameStore();
  
  // Add a player to the test state
  const addPlayer = () => {
    if (!playerName.trim()) {
      alert('Player name is required');
      return;
    }
    
    // Split the name into first and last name
    const nameParts = playerName.trim().split(/\s+/);
    const first = nameParts[0] || '';
    const last = nameParts.slice(1).join(' ') || '';
    
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      first,
      last,
      name: playerName,
      index: playerIndex,
      defaultTeam: playerTeam
    };
    
    // Add to local state
    setTestPlayers([...testPlayers, newPlayer]);
    setTestTeams([...testTeams, playerTeam]);
    
    // Reset form
    setPlayerName('');
  };
  
  // Local state for players and teams before creating match
  const [testPlayers, setTestPlayers] = useState<Player[]>([]);
  const [testTeams, setTestTeams] = useState<Team[]>([]);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  
  // Create a test match
  const handleCreateMatch = async () => {
    if (testPlayers.length !== 4) {
      alert('You need exactly 4 players to create a match');
      return;
    }
    setIsCreatingMatch(true);
    try {
      await createMatch(testPlayers, testTeams, { bigGame: enableBigGame });
    } finally {
      setIsCreatingMatch(false);
    }
  };
  
  // Enter scores for the current hole
  const handleEnterScores = () => {
    if (players.length !== 4 || match.state !== 'active') {
      alert('No active match with 4 players');
      return;
    }
    
    // Simple example - everyone gets the same gross score and no junk flags
    const grossScores: [number, number, number, number] = [grossScore, grossScore, grossScore, grossScore];
    const defaultFlags: JunkFlags = {
      hadBunkerShot: false,
      isOnGreenFromTee: false,
      isClosestOnGreen: false,
      hadThreePutts: false,
      isLongDrive: false
    };
    
    enterHoleScores(match.currentHole, grossScores, [defaultFlags, defaultFlags, defaultFlags, defaultFlags]);
  };
  
  // Test the double feature
  const handleCallDouble = () => {
    if (!isDoubleAvailable) {
      alert('Double is not available at this time');
      return;
    }
    
    callDouble();
  };
  
  // Test finishing the round
  const handleFinishRound = () => {
    finishRound();
  };
  
  return (
    <div className="test-container">
      <h2>Game Store Test</h2>
      
      <div className="store-section">
        <h3>Match Setup</h3>
        {players.length === 0 ? (
          <div>
            <div className="player-form">
              <div>
                <label>Player Name:</label>
                <input 
                  type="text" 
                  value={playerName} 
                  onChange={(e) => setPlayerName(e.target.value)}
                />
              </div>
              
              <div>
                <label>Handicap Index:</label>
                <input 
                  type="number" 
                  value={playerIndex} 
                  onChange={(e) => setPlayerIndex(Number(e.target.value))}
                  step="0.1" 
                  min="0" 
                  max="36"
                />
              </div>
              
              <div>
                <label>Team:</label>
                <select value={playerTeam} onChange={(e) => setPlayerTeam(e.target.value as Team)}>
                  <option value="Red">Red</option>
                  <option value="Blue">Blue</option>
                </select>
              </div>
              
              <button onClick={addPlayer}>Add Player</button>
            </div>
            
            <div className="players-list">
              <h4>Added Players ({testPlayers.length}/4)</h4>
              <ul>
                {testPlayers.map((player, idx) => (
                  <li key={player.id}>
                    {player.name} (Index: {player.index}) - Team {testTeams[idx]}
                  </li>
                ))}
              </ul>
              
              <div>
                <label>
                  <input 
                    type="checkbox" 
                    checked={enableBigGame} 
                    onChange={(e) => setEnableBigGame(e.target.checked)}
                  />
                  Enable Big Game
                </label>
              </div>
              
              <button 
                onClick={handleCreateMatch}
                disabled={testPlayers.length !== 4}
              >
                Create Match
              </button>
            </div>
          </div>
        ) : (
          <div className="active-match">
            <h4>Active Match</h4>
            <p>Match ID: {match.id}</p>
            <p>Date: {match.date}</p>
            <p>Current Hole: {match.currentHole}</p>
            <p>Base: ${match.base}</p>
            <p>Carry: ${match.carry}</p>
            <p>Doubles: {match.doubles}</p>
            <p>Big Game Total: {match.bigGameTotal}</p>
            <p>Players:</p>
            <ul>
              {players.map((player, idx) => (
                <li key={player.id}>
                  {player.name} (Index: {player.index}) - Team {playerTeams[idx]}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {players.length > 0 && match.state === 'active' && (
        <div className="store-section">
          <h3>Enter Scores</h3>
          <div>
            <label>Gross Score (all players):</label>
            <input 
              type="number" 
              value={grossScore} 
              onChange={(e) => setGrossScore(Number(e.target.value))}
              min="1" 
              max="15"
            />
          </div>
          
          <button onClick={handleEnterScores}>
            Enter Scores for Hole {match.currentHole}
          </button>
          
          {isDoubleAvailable && (
            <div>
              <p>Double is available for team {trailingTeam}</p>
              <button onClick={handleCallDouble}>Call Double</button>
            </div>
          )}
          
          <button onClick={handleFinishRound}>Finish Round</button>
        </div>
      )}
      
      {holeScores.length > 0 && (
        <div className="store-section">
          <h3>Match Results</h3>
          
          <div className="ledger">
            <h4>Ledger</h4>
            <table>
              <thead>
                <tr>
                  <th>Hole</th>
                  <th>Base</th>
                  <th>Carry</th>
                  <th>Doubles</th>
                  <th>Payout</th>
                  <th>Running Totals</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.hole}</td>
                    <td>${row.base}</td>
                    <td>${row.carryAfter}</td>
                    <td>{row.doubles}</td>
                    <td>${row.payout}</td>
                    <td>
                      {row.runningTotals.map((total, pIdx) => (
                        <span key={pIdx}>
                          P{pIdx+1}: {total > 0 ? '+' : ''}${total} 
                        </span>
                      )).join(' | ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {junkEvents.length > 0 && (
            <div className="junk-events">
              <h4>Junk Events</h4>
              <ul>
                {junkEvents.map((event, idx) => (
                  <li key={idx}>
                    Hole {event.hole}: {event.type} (${event.value}) - {getPlayerById(event.playerId)?.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {match.bigGame && bigGameRows.length > 0 && (
            <div className="big-game">
              <h4>Big Game</h4>
              <table>
                <thead>
                  <tr>
                    <th>Hole</th>
                    <th>Best Net</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {bigGameRows.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.hole}</td>
                      <td>{row.bestNet.join(', ')}</td>
                      <td>{row.subtotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>Total: {match.bigGameTotal}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
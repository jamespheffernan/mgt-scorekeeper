import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { millbrookDb } from '../db/millbrookDb';
import { GameHistory } from '../db/API-GameState';
import { getFullName } from '../utils/nameUtils';

const GameHistoryView = () => {
  const [gameRecords, setGameRecords] = useState<GameHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGameHistory = async () => {
      try {
        setIsLoading(true);
        const history = await millbrookDb.getAllGameHistory();
        // Sort by date, newest first
        const sortedHistory = history.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setGameRecords(sortedHistory);
        setError(null);
      } catch (err) {
        console.error('Error fetching game history:', err);
        setError('Failed to load game history records');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameHistory();
  }, []);

  // Format a date string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format time duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Handle both old and new game history formats
  const getPlayerName = (record: GameHistory, index: number): string => {
    // If using new format with playerInfo
    if (record.playerInfo && record.playerInfo[index]) {
      const player = record.playerInfo[index];
      return `${player.first} ${player.last}`.trim();
    }
    
    // Fallback to old format if playerNames exists
    // @ts-ignore - Handling backward compatibility
    if (record.playerNames && record.playerNames[index]) {
      // @ts-ignore
      return record.playerNames[index];
    }
    
    return `Player ${index + 1}`;
  };
  
  // Get team assignment, handling both formats
  const getPlayerTeam = (record: GameHistory, index: number): string => {
    // If using new format with playerInfo
    if (record.playerInfo && record.playerInfo[index]) {
      return record.playerInfo[index].team;
    }
    
    // Fallback to old format
    // @ts-ignore - Handling backward compatibility
    if (record.teamAssignments && record.teamAssignments[index]) {
      // @ts-ignore
      return record.teamAssignments[index];
    }
    
    return 'Unknown';
  };

  return (
    <div className="game-history-container">
      <h2>Game History</h2>
      
      <div className="game-history-actions">
        <Link to="/" className="button">Back to Main Menu</Link>
      </div>
      
      {isLoading ? (
        <div className="loading">Loading game records...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : gameRecords.length === 0 ? (
        <div className="empty-state">
          <p>No game records found. Complete a game to see it here.</p>
        </div>
      ) : (
        <div className="game-records">
          <div className="records-count">
            Showing {gameRecords.length} game {gameRecords.length === 1 ? 'record' : 'records'}
          </div>
          
          <table className="records-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Course</th>
                <th>Players</th>
                <th>Final Scores</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {gameRecords.map(record => (
                <tr key={record.id} className={record.isComplete ? 'complete-game' : 'cancelled-game'}>
                  <td>{formatDate(record.date)}</td>
                  <td>{record.courseName}</td>
                  <td>
                    <div className="players-list">
                      {/* Show player info for either 4 players or however many are in playerInfo */}
                      {[0, 1, 2, 3].map((idx) => (
                        <div key={idx} className={`player-team-${getPlayerTeam(record, idx)}`}>
                          {getPlayerName(record, idx)}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    {record.isComplete ? (
                      <div className="final-scores">
                        <div className="team-red">
                          Red: {formatCurrency(record.teamTotals[0])}
                        </div>
                        <div className="team-blue">
                          Blue: {formatCurrency(record.teamTotals[1])}
                        </div>
                        {record.bigGameEnabled && (
                          <div className="big-game-score">
                            Big Game: {record.bigGameTotal}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="no-scores">—</span>
                    )}
                  </td>
                  <td>{formatDuration(record.duration)}</td>
                  <td>
                    {record.isComplete ? (
                      <span className="status-complete">Completed</span>
                    ) : (
                      <span className="status-cancelled">Cancelled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GameHistoryView; 
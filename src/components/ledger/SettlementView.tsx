import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import html2canvas from 'html2canvas';
import '../../App.css';

interface SettlementViewProps {
  matchId: string;
}

// Format currency utility (re-added after accidental removal)
const formatCurrency = (amount: number): string => {
  const formattedAmount = Math.abs(amount).toString();
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}$${formattedAmount}`;
};

const SettlementView: React.FC<SettlementViewProps> = ({ matchId }) => {
  const navigate = useNavigate();
  const createMatch = useGameStore(state => state.createMatch);
  const resetGame = useGameStore(state => state.resetGame);
  const screenshotRef = useRef<HTMLDivElement>(null);
  
  // Local state for UI control
  const [activeTab, setActiveTab] = useState<'summary' | 'details' | 'bigGame'>('summary');
  
  // Get current game state
  const match = useGameStore(state => state.match);
  const players = useGameStore(state => state.players);
  const playerTeams = useGameStore(state => state.playerTeams);
  const ledger = useGameStore(state => state.ledger);
  const junkEvents = useGameStore(state => state.junkEvents);
  const bigGameRows = useGameStore(state => state.bigGameRows);
  const holeScores = useGameStore(state => state.holeScores);
  
  // Verify that the matchId matches the current match
  useEffect(() => {
    if (matchId && matchId !== match.id) {
      console.warn(`Settlement view loaded with matchId ${matchId} but current match is ${match.id}`);
    }
  }, [matchId, match.id]);
  
  // Calculate final ledger values
  const finalLedger = ledger.length > 0 ? ledger[ledger.length - 1] : null;
  
  // Game statistics
  const gameStats = {
    holesPlayed: ledger.length,
    duration: match.startTime && match.endTime 
      ? getTimeDuration(match.startTime, match.endTime)
      : '00:00',
    totalDoublesPlayed: ledger.length > 0 ? 
      // Count instances where the doubles value increases between consecutive rows
      ledger.reduce((count, row, index) => {
        // For the first row, check if doubles is already > 0
        if (index === 0) {
          return row.doubles > 0 ? 1 : 0;
        }
        // For subsequent rows, check if doubles increased from previous row
        return count + (row.doubles > ledger[index - 1].doubles ? 1 : 0);
      }, 0) : 0,
    totalJunkEvents: junkEvents.length,
    totalJunkValue: junkEvents.reduce((sum, event) => sum + event.value, 0),
    bigGamePoints: match.bigGameTotal
  };
  
  // Calculate hole wins
  const holeWins = holeScores.reduce((wins, score) => {
    if (score.teamNet[0] < score.teamNet[1]) wins.red++;
    else if (score.teamNet[1] < score.teamNet[0]) wins.blue++;
    else wins.push++;
    return wins;
  }, { red: 0, blue: 0, push: 0 });
  
  // Get player junk total
  const getPlayerJunkTotal = (playerId: string): number => {
    return junkEvents
      .filter(event => event.playerId === playerId)
      .reduce((sum, event) => sum + event.value, 0);
  };
  
  // Get team junk total
  const getTeamJunkTotal = (team: 'Red' | 'Blue'): number => {
    return junkEvents
      .filter(event => event.teamId === team)
      .reduce((sum, event) => sum + event.value, 0);
  };
  
  // Calculate team totals from running totals
  const getTeamTotals = () => {
    if (!finalLedger) return { red: 0, blue: 0 };
    
    // Count the number of players on each team
    const redCount = playerTeams.filter(team => team === 'Red').length;
    const blueCount = playerTeams.filter(team => team === 'Blue').length;
    
    // Log the runningTotals and team counts for debugging
    console.log('[DEBUG] finalLedger.runningTotals:', finalLedger.runningTotals);
    console.log('[DEBUG] playerTeams:', playerTeams);
    console.log('[DEBUG] redCount:', redCount, 'blueCount:', blueCount);
    
    // Calculate team totals and divide by the number of players on each team
    const redTotal = players.reduce((sum, _player, index) => 
      playerTeams[index] === 'Red' ? sum + finalLedger.runningTotals[index] : sum, 0) / redCount;
    
    const blueTotal = players.reduce((sum, _player, index) => 
      playerTeams[index] === 'Blue' ? sum + finalLedger.runningTotals[index] : sum, 0) / blueCount;
    
    console.log('[DEBUG] redTotal:', redTotal, 'blueTotal:', blueTotal);
    return { red: redTotal, blue: blueTotal };
  };
  
  const teamTotals = getTeamTotals();
  const winningTeam = teamTotals.red > teamTotals.blue ? 'Red' : teamTotals.blue > teamTotals.red ? 'Blue' : 'Tie';
  
  // Get time duration in hours:minutes format
  function getTimeDuration(startTime: string, endTime: string): string {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const diffMs = end - start;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // Start a new match with the same players
  const handleRematch = () => {
    // Create a new match with the same players and teams
    createMatch(players, playerTeams, {
      bigGame: match.bigGame,
      courseId: match.courseId,
      playerTeeIds: match.playerTeeIds
    });
    
    // Navigate to the hole view
    navigate('/hole/1');
  };
  
  // Export results as CSV
  const handleExportCSV = () => {
    // Create CSV header
    let csv = 'Millbrook Game Summary\n';
    csv += `Date,${new Date(match.date).toLocaleDateString()}\n\n`;
    
    // Add team totals
    csv += 'Team Totals\n';
    csv += `Red Team,$${teamTotals.red}\n`;
    csv += `Blue Team,$${teamTotals.blue}\n\n`;
    
    // Add team junk totals
    csv += 'Team Junk Totals\n';
    csv += `Red Team Junk,$${getTeamJunkTotal('Red')}\n`;
    csv += `Blue Team Junk,$${getTeamJunkTotal('Blue')}\n\n`;
    
    // Add player results
    csv += 'Player,Team,Final Total,Junk Total\n';
    players.forEach((player, index) => {
      const finalTotal = finalLedger ? finalLedger.runningTotals[index] : 0;
      const junkTotal = getPlayerJunkTotal(player.id);
      
      csv += `${player.name},${playerTeams[index]},${finalTotal},${junkTotal}\n`;
    });
    
    // Add hole statistics
    csv += `\nHole Wins,Red:${holeWins.red},Blue:${holeWins.blue},Push:${holeWins.push}\n`;
    
    // Add game stats
    csv += `\nGame Stats\n`;
    csv += `Holes Played,${gameStats.holesPlayed}\n`;
    csv += `Duration,${gameStats.duration}\n`;
    csv += `Doubles Played,${gameStats.totalDoublesPlayed}\n`;
    csv += `Junk Events,${gameStats.totalJunkEvents}\n`;
    
    // Add Big Game total if enabled
    if (match.bigGame) {
      csv += `\nBig Game Total,${match.bigGameTotal}\n`;
      
      // Add hole-by-hole Big Game breakdown
      csv += '\nHole,Best Net Scores,Subtotal,Running Total\n';
      let runningTotal = 0;
      bigGameRows.forEach(row => {
        runningTotal += row.subtotal;
        csv += `${row.hole},"${row.bestNet[0]} + ${row.bestNet[1]}",${row.subtotal},${runningTotal}\n`;
      });
    }
    
    // Add hole-by-hole details
    csv += '\nHole-by-Hole Details\n';
    csv += 'Hole,Base,Carry,Doubles,Result,Payout\n';
    ledger.forEach((row, index) => {
      // Determine winner
      let holeResult = 'Push';
      if (holeScores[index]) {
        if (holeScores[index].teamNet[0] < holeScores[index].teamNet[1]) holeResult = 'Red';
        else if (holeScores[index].teamNet[1] < holeScores[index].teamNet[0]) holeResult = 'Blue';
      }
      
      csv += `${row.hole},${row.base},${row.carryAfter},${row.doubles},${holeResult},${row.payout}\n`;
    });
    
    // Trigger download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `millbrook-game-${new Date(match.date).toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  // Export results as PNG
  const handleExportPNG = async () => {
    if (!screenshotRef.current) return;
    
    try {
      // Add a class to style the element for screenshot
      screenshotRef.current.classList.add('screenshot-mode');
      
      // Take the screenshot
      const canvas = await html2canvas(screenshotRef.current, {
        scale: 2, // Higher resolution
        logging: false,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      
      // Remove screenshot mode class
      screenshotRef.current.classList.remove('screenshot-mode');
      
      // Convert to data URL and trigger download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `millbrook-game-${new Date(match.date).toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating PNG:', error);
      alert('Failed to generate PNG. Please try again.');
    }
  };
  
  // Setup a new game
  const handleNewRound = () => {
    navigate('/setup');
  };
  
  // Return to main menu
  const handleReturnToMainMenu = () => {
    resetGame(); // Reset the game state
    navigate('/'); // Navigate to main menu
  };
  
  // Render player trend chart (mini sparkline)
  const renderPlayerTrend = (playerIndex: number) => {
    const width = 100;
    const height = 30;
    const padding = 2;
    const totalHoles = ledger.length;
    
    if (totalHoles < 2) return null;
    
    // Get player running totals across all holes
    const runningTotals = ledger.map(row => row.runningTotals[playerIndex]);
    
    // Find min and max values
    const minValue = Math.min(...runningTotals);
    const maxValue = Math.max(...runningTotals);
    const valueRange = maxValue - minValue || 1; // Avoid division by zero
    
    // Calculate scaling factors
    const xScale = (width - padding * 2) / (totalHoles - 1);
    const yScale = (height - padding * 2) / valueRange;
    
    // Generate SVG path
    const points = runningTotals.map((value, index) => {
      const x = padding + index * xScale;
      const y = height - padding - (value - minValue) * yScale;
      return `${x},${y}`;
    });
    
    // Determine trend line color
    let trendColor = '#909399'; // Neutral
    if (runningTotals[0] < runningTotals[runningTotals.length - 1]) {
      trendColor = '#67c23a'; // Positive trend (green)
    } else if (runningTotals[0] > runningTotals[runningTotals.length - 1]) {
      trendColor = '#f56c6c'; // Negative trend (red)
    }
    
    return (
      <svg width={width} height={height} className="player-trend-chart">
        <polyline
          fill="none"
          stroke={trendColor}
          strokeWidth="2"
          points={points.join(' ')}
        />
        {/* Start point */}
        <circle cx={points[0].split(',')[0]} cy={points[0].split(',')[1]} r="3" fill={trendColor} />
        {/* End point */}
        <circle 
          cx={points[points.length - 1].split(',')[0]} 
          cy={points[points.length - 1].split(',')[1]} 
          r="3" 
          fill={trendColor} 
        />
      </svg>
    );
  };
  
  // Render the summary tab
  const renderSummaryTab = () => (
    <div className="settlement-summary-tab">
      <div className="game-result-banner" 
           style={{ backgroundColor: winningTeam === 'Red' ? 'rgba(245, 108, 108, 0.2)' : 
                                    winningTeam === 'Blue' ? 'rgba(64, 158, 255, 0.2)' : 
                                    'rgba(144, 147, 153, 0.2)' }}>
        {winningTeam !== 'Tie' ? (
          <h3>{winningTeam} Team Wins!</h3>
        ) : (
          <h3>It's a Tie!</h3>
        )}
      </div>
      
      <div className="team-summary">
        <div className={`team-total team-red ${winningTeam === 'Red' ? 'winning-team' : ''}`}>
          <div className="team-name">Red Team</div>
          <div className="team-amount">{formatCurrency(teamTotals.red)}</div>
          <div className="team-holes-won">{holeWins.red} holes won</div>
        </div>
        
        <div className="team-summary-separator">vs</div>
        
        <div className={`team-total team-blue ${winningTeam === 'Blue' ? 'winning-team' : ''}`}>
          <div className="team-name">Blue Team</div>
          <div className="team-amount">{formatCurrency(teamTotals.blue)}</div>
          <div className="team-holes-won">{holeWins.blue} holes won</div>
        </div>
      </div>
      
      <div className="player-results">
        {players.map((player, index) => {
          const finalTotal = finalLedger?.runningTotals[index] || 0;
          const playerJunkTotal = getPlayerJunkTotal(player.id);
          const teamClass = playerTeams[index].toLowerCase();
          
          return (
            <div key={player.id} className={`player-result team-${teamClass}`}>
              <div className="player-result-header">
                <span className="player-name">{player.name}</span>
                <span className="player-team">{playerTeams[index]}</span>
              </div>
              
              <div className="player-details">
                <div className="player-trend">
                  {renderPlayerTrend(index)}
                </div>
                
                <div className="player-total-container">
                  <div className="player-total">{formatCurrency(finalTotal)}</div>
                  {playerJunkTotal > 0 && (
                    <div className="player-junk-total">
                      Junk: ${playerJunkTotal}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="game-stats">
        <div className="stats-row">
          <div className="stat-item">
            <div className="stat-label">Holes Played</div>
            <div className="stat-value">{gameStats.holesPlayed}</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Duration</div>
            <div className="stat-value">{gameStats.duration}</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Doubles</div>
            <div className="stat-value">{gameStats.totalDoublesPlayed}</div>
          </div>
          
          {match.bigGame && (
            <div className="stat-item">
              <div className="stat-label">Big Game</div>
              <div className="stat-value">{gameStats.bigGamePoints}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  // Render hole-by-hole details tab
  const renderDetailsTab = () => (
    <div className="settlement-details-tab">
      <div className="hole-details">
        <table className="hole-details-table">
          <thead>
            <tr className="hole-details-header">
              <th>Hole</th>
              <th>Base</th>
              <th>Carry</th>
              <th>Dbl</th>
              <th>Winner</th>
              {players.map((player, idx) => (
                <th key={idx} className={`team-${playerTeams[idx].toLowerCase()}`}>
                  {player.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ledger.map((row, index) => {
              // Determine winner based on hole scores
              let holeWinner = 'Push';
              let winnerClass = 'winner-push';
              
              if (holeScores[index]) {
                if (holeScores[index].teamNet[0] < holeScores[index].teamNet[1]) {
                  holeWinner = 'Red';
                  winnerClass = 'winner-red';
                } else if (holeScores[index].teamNet[1] < holeScores[index].teamNet[0]) {
                  holeWinner = 'Blue';
                  winnerClass = 'winner-blue';
                }
              }
              
              return (
                <tr key={index} className={`hole-row ${holeWinner !== 'Push' ? `winner-${holeWinner.toLowerCase()}-bg` : ''}`}>
                  <td className="hole-number">{row.hole}</td>
                  <td className="hole-base">${row.base}</td>
                  <td className="hole-carry">${row.carryAfter}</td>
                  <td className="hole-doubles">{row.doubles > 0 ? '✓' : ''}</td>
                  <td className={`hole-winner ${winnerClass}`}>
                    {holeWinner !== 'Push' ? (
                      <div className={`winner-badge ${holeWinner.toLowerCase()}`}>
                        {holeWinner}
                      </div>
                    ) : (
                      'Push'
                    )}
                  </td>
                  {players.map((player, playerIdx) => {
                    // Calculate player change for this hole
                    let change = 0;
                    if (index > 0) {
                      change = row.runningTotals[playerIdx] - ledger[index - 1].runningTotals[playerIdx];
                    } else {
                      change = row.runningTotals[playerIdx];
                    }
                    // Check if player had junk on this hole
                    const playerJunk = junkEvents.filter(
                      event => event.hole === row.hole && event.playerId === player.id
                    );
                    // Get scores if available
                    const grossScore = holeScores[index]?.gross[playerIdx];
                    const netScore = holeScores[index]?.net[playerIdx];
                    return (
                      <td key={playerIdx} className={`player-hole-details ${change > 0 ? 'positive-change' : change < 0 ? 'negative-change' : ''}`}>
                        <div className="player-scores">
                          {grossScore && (
                            <div className="player-score-wrapper">
                              <span className="gross-score">{grossScore}</span>
                              {netScore !== grossScore && (
                                <span className="net-score">({netScore})</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="player-money-change">
                          {formatCurrency(change)}
                        </div>
                        {playerJunk.length > 0 && (
                          <div className="player-hole-junk">
                            {playerJunk.map((junk, jIdx) => (
                              <span key={jIdx} className={`junk-item junk-${junk.type.toLowerCase().replace(/\s+/g, '-')}`} title={`${junk.type}: $${junk.value}`}>
                                {junk.type.includes('Birdie') ? '🐦' : 
                                 junk.type.includes('Sand') ? '🏖️' : 
                                 junk.type.includes('Green') ? '🟢' : 
                                 junk.type.includes('Pole') ? '🕳️' :
                                 junk.type.includes('Long') || junk.type.includes('LD') ? '🚀' :
                                 junk.type.substring(0, 1)}
                                <span className="junk-value">${junk.value}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
  
  // Render the big game tab
  const renderBigGameTab = () => (
    <div className="settlement-big-game-tab">
      {/* Implementation of renderBigGameTab */}
    </div>
  );
  
  // Render the active tab
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'summary':
        return renderSummaryTab();
      case 'details':
        return renderDetailsTab();
      case 'bigGame':
        return renderBigGameTab();
      default:
        return null;
    }
  };
  
  return (
    <div className="settlement-view" ref={screenshotRef}>
      <div className="settlement-header">
        <h2>Game Summary</h2>
        <div className="settlement-date">
          {new Date(match.date).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>
      <div className="settlement-tabs">
        <button
          className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Hole-by-Hole
        </button>
        {match.bigGame && (
          <button
            className={`tab-button ${activeTab === 'bigGame' ? 'active' : ''}`}
            onClick={() => setActiveTab('bigGame')}
          >
            Big Game
          </button>
        )}
      </div>
      <div className="settlement-content">
        {renderActiveTab()}
      </div>
      <div className="settlement-actions">
        <div className="export-actions">
          <button className="export-button" onClick={handleExportCSV}>
            Export CSV
          </button>
          <button className="export-button" onClick={handleExportPNG}>
            Save PNG
          </button>
        </div>
        <div className="game-actions">
          <button className="action-button rematch-button" onClick={handleRematch}>
            Rematch
          </button>
          <button className="action-button new-game-button" onClick={handleNewRound}>
            New Game
          </button>
          <button className="action-button menu-button" onClick={handleReturnToMainMenu}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettlementView;
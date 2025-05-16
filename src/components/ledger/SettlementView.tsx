import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import html2canvas from 'html2canvas';
import useSettlementCalculations from '../../hooks/useSettlementCalculations';
import TabContainer, { TabPanel } from './TabContainer';

// Import the newer CSS styles
import '../../styles/settlement-variables.css';
import '../../styles/settlement-new.css';

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
  
  // Use the custom hook to handle calculations
  const {
    finalLedger,
    gameStats,
    holeWins,
    teamTotals,
    winningTeam,
    getPlayerJunkTotal,
    getTeamJunkTotal,
    formatCurrency,
    generateCsvDataForExport
  } = useSettlementCalculations({
    match,
    players,
    playerTeams,
    ledger,
    junkEvents,
    bigGameRows,
    holeScores
  });
  
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
    const csv = generateCsvDataForExport();
    
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
      
      // Make sure to remove the screenshot mode class if there's an error
      if (screenshotRef.current) {
        screenshotRef.current.classList.remove('screenshot-mode');
      }
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
           style={{ backgroundColor: winningTeam === 'Red' ? 'var(--team-red-bg)' : 
                                    winningTeam === 'Blue' ? 'var(--team-blue-bg)' : 
                                    'var(--border-color-light)' }}>
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
      <div className="hole-cards-container">
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
            <div key={index} className={`hole-card ${holeWinner !== 'Push' ? `winner-${holeWinner.toLowerCase()}-border` : ''}`}>
              <div className="hole-card-header">
                <span className="hole-number-card">Hole {row.hole}</span>
                <span className={`hole-winner-card ${winnerClass}`}>
                  Winner: {holeWinner !== 'Push' ? (
                    <span className={`winner-badge-card ${holeWinner.toLowerCase()}`}>{holeWinner}</span>
                  ) : (
                    'Push'
                  )}
                </span>
              </div>
              <div className="hole-card-main-info">
                <span>Base: ${row.base}</span>
                <span>Carry: ${row.carryAfter}</span>
                <span>Doubles: {row.doubles > 0 ? 'Yes' : 'No'}</span>
              </div>

              <div className="player-details-grid">
                {players.map((player, playerIdx) => {
                  let change = 0;
                  if (index > 0) {
                    change = row.runningTotals[playerIdx] - ledger[index - 1].runningTotals[playerIdx];
                  } else {
                    change = row.runningTotals[playerIdx];
                  }
                  const playerJunk = junkEvents.filter(
                    event => event.hole === row.hole && event.playerId === player.id
                  );
                  const grossScore = holeScores[index]?.gross[playerIdx];
                  const netScore = holeScores[index]?.net[playerIdx];
                  const playerTeamClass = playerTeams[playerIdx]?.toLowerCase();

                  return (
                    <div key={player.id} className={`player-details-card team-text-${playerTeamClass}`}>
                      <strong className="player-name-card">{player.name} ({playerTeams[playerIdx]})</strong>
                      {grossScore !== undefined && (
                        <div className="player-score-card">
                          Score: <span className="gross-score-card">{grossScore}</span>
                          {netScore !== undefined && netScore !== grossScore && <span className="net-score-card"> (Net: {netScore})</span>}
                        </div>
                      )}
                      <div className="player-change-card">Change: {formatCurrency(change)}</div>
                      {playerJunk.length > 0 && (
                        <div className="player-junk-card">
                          Junk:
                          {playerJunk.map((junk, jIdx) => (
                            <span key={jIdx} className={`junk-item-card junk-${junk.type.toLowerCase().replace(/\s+/g, '-')}`} title={`${junk.type}: $${junk.value}`}>
                              {junk.type.includes('Birdie') ? '🐦' : 
                               junk.type.includes('Sand') ? '🏖️' : 
                               junk.type.includes('Green') ? '🟢' : 
                               junk.type.includes('Pole') ? '🕳️' :
                               junk.type.includes('Long') || junk.type.includes('LD') ? '🚀' :
                               junk.type.substring(0, 1)}
                              (${junk.value})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  
  // Render the big game tab
  const renderBigGameTab = () => {
    if (!match.bigGame || bigGameRows.length === 0) {
      return (
        <div className="settlement-big-game-tab big-game-disabled">
          <p>Big Game was not enabled for this match, or no Big Game scores were recorded.</p>
        </div>
      );
    }

    let runningTotal = 0;

    return (
      <div className="settlement-big-game-tab">
        <div className="big-game-overall-total">
          <h3>Total Big Game Score</h3>
          <div className="big-game-total-value">{match.bigGameTotal}</div>
        </div>
        <div className="big-game-cards-container">
          {bigGameRows.map((row) => {
            runningTotal += row.subtotal;

            const holeScoreEntry = holeScores.find(hs => hs.hole === row.hole);
            let playerNamesForBestScores: string[] = ['N/A', 'N/A'];

            if (holeScoreEntry) {
              const netScoresForHole = holeScoreEntry.net;
              
              // Create an array of { score, originalPlayerIndex } to handle multiple players having the same score
              const scoresWithOriginalIndices = netScoresForHole.map((score, playerIdx) => ({
                score,
                originalPlayerIndex: playerIdx
              }));

              // Find first player matching bestNet[0]
              const p1Entry = scoresWithOriginalIndices.find(entry => entry.score === row.bestNet[0]);
              if (p1Entry) {
                playerNamesForBestScores[0] = players[p1Entry.originalPlayerIndex]?.name || 'P?';
              }

              // Find second player matching bestNet[1], ensuring it's a different player if scores are identical
              const p2Entry = scoresWithOriginalIndices.find(entry => 
                entry.score === row.bestNet[1] && 
                (p1Entry ? entry.originalPlayerIndex !== p1Entry.originalPlayerIndex : true)
              );
              
              if (p2Entry) {
                playerNamesForBestScores[1] = players[p2Entry.originalPlayerIndex]?.name || 'P?';
              } else if (row.bestNet[0] === row.bestNet[1] && p1Entry) {
                // If bestNet scores are identical and we found the first player,
                // look for another player with the same score but different index.
                const secondP1Entry = scoresWithOriginalIndices.find(entry => 
                  entry.score === row.bestNet[0] && entry.originalPlayerIndex !== p1Entry.originalPlayerIndex
                );
                if (secondP1Entry) {
                  playerNamesForBestScores[1] = players[secondP1Entry.originalPlayerIndex]?.name || 'P?';
                }
              }
              // Fallback if the second player wasn't found distinctly (e.g. if bestNet[0] !== bestNet[1] but p2Entry logic failed)
              if (playerNamesForBestScores[1] === 'N/A' || (row.bestNet[0] !== row.bestNet[1] && playerNamesForBestScores[1] === playerNamesForBestScores[0])){
                  const sortedByScore = [...scoresWithOriginalIndices].sort((a,b) => a.score - b.score);
                  if(sortedByScore.length > 1){
                      const secondBestPlayerIndex = sortedByScore[1].originalPlayerIndex;
                      // Ensure the second distinct player is chosen if the top two scores are the same from one player
                      if(sortedByScore[0].originalPlayerIndex === secondBestPlayerIndex && sortedByScore[0].score === sortedByScore[1].score && sortedByScore.length > 2){
                          playerNamesForBestScores[1] = players[sortedByScore[2].originalPlayerIndex]?.name || 'P?';
                      } else {
                          playerNamesForBestScores[1] = players[secondBestPlayerIndex]?.name || 'P?';
                      }
                      // Re-verify the first player if the general sort picked a different primary for bestNet[0]
                      if (players[sortedByScore[0].originalPlayerIndex]?.name !== playerNamesForBestScores[0] && row.bestNet[0] === sortedByScore[0].score) {
                          playerNamesForBestScores[0] = players[sortedByScore[0].originalPlayerIndex]?.name || 'P?';
                      }
                  }
              }
            }

            return (
              <div key={row.hole} className="big-game-card">
                <div className="big-game-card-header">
                  <span className="hole-number-card">Hole {row.hole}</span>
                </div>
                <div className="big-game-card-scores">
                  Best Scores: 
                  <span className="best-net-score-player">
                    {row.bestNet[0]} ({playerNamesForBestScores[0]})
                  </span> + 
                  <span className="best-net-score-player">
                    {row.bestNet[1]} ({playerNamesForBestScores[1]})
                  </span>
                </div>
                <div className="big-game-card-subtotal">
                  Hole Subtotal: <span className="subtotal-value">{row.subtotal}</span>
                </div>
                <div className="big-game-card-running-total">
                  Running Total: <span className="running-total-value">{runningTotal}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Render the component
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
      
      <TabContainer 
        tabs={[
          { id: 'summary', label: 'Summary' },
          { id: 'details', label: 'Hole-by-Hole' },
          ...(match.bigGame ? [{ id: 'bigGame', label: 'Big Game' }] : [])
        ]}
        defaultActiveTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as 'summary' | 'details' | 'bigGame')}
      >
        <TabPanel id="summary">
          {renderSummaryTab()}
        </TabPanel>
        <TabPanel id="details">
          {renderDetailsTab()}
        </TabPanel>
        {match.bigGame && (
          <TabPanel id="bigGame">
            {renderBigGameTab()}
          </TabPanel>
        )}
      </TabContainer>
      
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
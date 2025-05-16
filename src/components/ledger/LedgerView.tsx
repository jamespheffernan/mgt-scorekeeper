import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { Team } from '../../db/API-GameState';
import type { JunkEvent } from '../../store/gameStore';
import './LedgerView.css';
import { getFullName } from '../../utils/nameUtils';
import PlayerName from '../../components/PlayerName';

export const LedgerView = () => {
  const navigate = useNavigate();
  
  // Access store state
  const match = useGameStore(state => state.match);
  const players = useGameStore(state => state.players);
  const playerTeams = useGameStore(state => state.playerTeams);
  const ledger = useGameStore(state => state.ledger);
  const junkEvents = useGameStore(state => state.junkEvents);
  const bigGameRows = useGameStore(state => state.bigGameRows);
  const holeScores = useGameStore(state => state.holeScores);
  
  // Local state for drawer
  const [isOpen, setIsOpen] = useState(false);
  const [compactView, setCompactView] = useState(true);
  const [holeJunkEvents, setHoleJunkEvents] = useState<{ [hole: number]: JunkEvent[] }>({});
  
  // Group junk events by hole when junkEvents changes
  useEffect(() => {
    const groupedEvents: { [hole: number]: JunkEvent[] } = {};
    junkEvents.forEach(event => {
      if (!groupedEvents[event.hole]) {
        groupedEvents[event.hole] = [];
      }
      groupedEvents[event.hole].push(event);
    });
    setHoleJunkEvents(groupedEvents);
  }, [junkEvents]);
  
  // Toggle drawer
  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  };
  
  // Toggle view mode
  const toggleViewMode = () => {
    setCompactView(!compactView);
  };
  
  // Get junk events for a specific hole
  const getJunkEventsForHole = (hole: number): JunkEvent[] => {
    return holeJunkEvents[hole] || [];
  };
  
  // Get junk total for a specific team on a specific hole
  const getTeamJunkTotalForHole = (hole: number, team: Team): number => {
    return getJunkEventsForHole(hole)
      .filter(event => event.teamId === team)
      .reduce((sum, event) => sum + event.value, 0);
  };
  
  // Get player name by ID
  const getPlayerName = (playerId: string): string => {
    const player = players.find(p => p.id === playerId);
    return player ? getFullName(player) : 'Unknown';
  };
  
  // Get team junk total
  const getTeamJunkTotal = (team: Team): number => {
    return junkEvents
      .filter(event => event.teamId === team)
      .reduce((sum, event) => sum + event.value, 0);
  };
  
  // Calculate team totals from running totals
  const getTeamTotals = () => {
    if (ledger.length === 0) return { red: 0, blue: 0 };
    
    const lastLedgerRow = ledger[ledger.length - 1];
    
    // Count the number of players on each team
    const redCount = playerTeams.filter(team => team === 'Red').length;
    const blueCount = playerTeams.filter(team => team === 'Blue').length;
    
    // Calculate team totals by dividing the sum by the number of team members
    // This ensures we display the correct team total, not the sum of all player amounts
    const redTotal = players.reduce((sum, _player, index) => 
      playerTeams[index] === 'Red' ? sum + lastLedgerRow.runningTotals[index] : sum, 0) / redCount;
    
    const blueTotal = players.reduce((sum, _player, index) => 
      playerTeams[index] === 'Blue' ? sum + lastLedgerRow.runningTotals[index] : sum, 0) / blueCount;
    
    console.log(`[DEBUG] Team totals (adjusted): Red=${redTotal}, Blue=${blueTotal}`);
    
    return { red: redTotal, blue: blueTotal };
  };
  
  // Determine winner of a hole
  const getHoleWinner = (holeIndex: number): 'Red' | 'Blue' | 'Push' => {
    if (!holeScores[holeIndex]) return 'Push';
    
    const { teamNet } = holeScores[holeIndex];
    if (teamNet[0] < teamNet[1]) return 'Red';
    if (teamNet[1] < teamNet[0]) return 'Blue';
    return 'Push';
  };
  
  // Format currency
  const formatCurrency = (amount: number): string => {
    const formattedAmount = Math.abs(amount).toString();
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}$${formattedAmount}`;
  };
  
  // Export to CSV
  const exportToCsv = () => {
    // Create CSV header
    let csv = 'Hole,Base,Carry,Doubles,Payout';
    players.forEach(player => {
      csv += `,${getFullName(player)} Gross`;
    });
    players.forEach(player => {
      csv += `,${getFullName(player)} Net`;
    });
    players.forEach(player => {
      csv += `,${getFullName(player)} Money`;
    });
    csv += ',Red Junk,Blue Junk';
    if (match.bigGame) {
      csv += ',Big Game';
    }
    csv += '\n';
    
    // Add each ledger row
    ledger.forEach((row, index) => {
      const redJunk = getTeamJunkTotalForHole(row.hole, 'Red');
      const blueJunk = getTeamJunkTotalForHole(row.hole, 'Blue');
      csv += `${row.hole},${row.base},${row.carryAfter},${row.doubles},${row.payout + redJunk + blueJunk}`;
      // Add gross scores
      if (holeScores[index]) {
        holeScores[index].gross.forEach(gross => {
          csv += `,${gross}`;
        });
      } else {
        players.forEach(() => { csv += ','; });
      }
      // Add net scores
      if (holeScores[index]) {
        holeScores[index].net.forEach(net => {
          csv += `,${net}`;
        });
      } else {
        players.forEach(() => { csv += ','; });
      }
      // Add running totals
      row.runningTotals.forEach(total => {
        csv += `,${total}`;
      });
      // Add team junk totals
      csv += `,${getTeamJunkTotalForHole(row.hole, 'Red')}`;
      csv += `,${getTeamJunkTotalForHole(row.hole, 'Blue')}`;
      if (match.bigGame && bigGameRows[index]) {
        csv += `,${bigGameRows[index].subtotal}`;
      }
      csv += '\n';
    });
    
    // Add totals row
    csv += `Total,,,,`;
    if (ledger.length > 0) {
      const lastRow = ledger[ledger.length - 1];
      players.forEach(() => { csv += ','; }); // For gross
      players.forEach(() => { csv += ','; }); // For net
      lastRow.runningTotals.forEach(total => {
        csv += `,${total}`;
      });
      // Add total team junk
      csv += `,${getTeamJunkTotal('Red')}`;
      csv += `,${getTeamJunkTotal('Blue')}`;
    }
    if (match.bigGame) {
      csv += `,${match.bigGameTotal}`;
    }
    
    // Trigger download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `millbrook-game-${match.date}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  // Calculate team colors for display
  const teamColor = (team: Team) => {
    return team === 'Red' ? 'team-red' : 'team-blue';
  };
  
  // Get class for winner
  const getWinnerClass = (winner: 'Red' | 'Blue' | 'Push') => {
    if (winner === 'Push') return 'result-push';
    return winner === 'Red' ? 'result-red' : 'result-blue';
  };
  
  // Team totals for display
  const teamTotals = getTeamTotals();
  
  // Determine if we have any data to display
  const hasData = ledger.length > 0;
  
  // Calculate running Big Game total (enhanced for T-13)
  const getRunningBigGameTotal = (upToIndex: number): number => {
    return bigGameRows
      .slice(0, upToIndex + 1)
      .reduce((total, row) => total + row.subtotal, 0);
  };

  // Function to navigate back to current hole
  const handleBackToHole = () => {
    navigate(`/hole/${match.currentHole}`);
  };

  return (
    <div className="ledger-container">
      <div className="back-button-container">
        <button 
          className="back-to-hole-button"
          onClick={handleBackToHole}
        >
          Back to Hole {match.currentHole}
        </button>
      </div>
      
      <div className="ledger-header" onClick={toggleDrawer}>
        <h3>Running Totals</h3>
        <div className="team-totals">
          <span className="team-red">Red {formatCurrency(teamTotals.red)}</span>
          <span className="team-blue">Blue {formatCurrency(teamTotals.blue)}</span>
          {match.bigGame && (
            <span className="big-game-total">Big Game: {match.bigGameTotal}</span>
          )}
        </div>
        <div className="drawer-toggle">{isOpen ? '▲' : '▼'}</div>
      </div>
      
      {isOpen && (
        <div className="ledger-details">
          {hasData ? (
            <>
              <div className="ledger-controls">
                <div className="view-controls">
                  <button 
                    className="view-toggle-button"
                    onClick={toggleViewMode}
                  >
                    {compactView ? 'Show Detailed View' : 'Show Compact View'}
                  </button>
                  <button 
                    className="export-button"
                    onClick={exportToCsv}
                  >
                    Export CSV
                  </button>
                </div>
              </div>
              
              {compactView ? (
                <table className="ledger-table compact-view">
                  <thead>
                    <tr>
                      <th>Hole</th>
                      <th>Base</th>
                      <th>Carry</th>
                      <th>Dbl</th>
                      <th>Result</th>
                      <th>Win $</th>
                      <th>Red Junk</th>
                      <th>Blue Junk</th>
                      {match.bigGame && <th>Big Game</th>}
                      {match.bigGame && <th>Running</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((row, index) => {
                      const holeWinner = getHoleWinner(index);
                      const redJunk = getTeamJunkTotalForHole(row.hole, 'Red');
                      const blueJunk = getTeamJunkTotalForHole(row.hole, 'Blue');
                      const bgRow = bigGameRows[index];
                      const runningBigGameTotal = getRunningBigGameTotal(index);
                      
                      return (
                        <tr key={index} className={index === match.currentHole - 1 ? "current-hole-row" : ""}>
                          <td>{row.hole}</td>
                          <td>${row.base}</td>
                          <td>${row.carryAfter}</td>
                          <td>{row.doubles > 0 ? '✓' : ''}</td>
                          <td className={getWinnerClass(holeWinner)}>{holeWinner}</td>
                          <td className="win-amount">${row.payout + redJunk + blueJunk}</td>
                          <td className="junk-amount team-red">${redJunk}</td>
                          <td className="junk-amount team-blue">${blueJunk}</td>
                          {match.bigGame && (
                            <td className="big-game-cell">
                              {bgRow ? bgRow.subtotal : '-'}
                            </td>
                          )}
                          {match.bigGame && (
                            <td className="big-game-running">
                              {runningBigGameTotal}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}>Final Totals</td>
                      <td colSpan={match.bigGame ? 8 : 6}>
                        <div className="player-totals-grid">
                          {players.map((player, index) => (
                            <div 
                              key={index} 
                              className={`player-total ${teamColor(playerTeams[index])}`}
                            >
                              {getFullName(player)}: {formatCurrency(ledger.length > 0 ? ledger[ledger.length - 1].runningTotals[index] : 0)}
                            </div>
                          ))}
                          <div className="team-junk-totals">
                            <div className="team-red">Red Junk: ${getTeamJunkTotal('Red')}</div>
                            <div className="team-blue">Blue Junk: ${getTeamJunkTotal('Blue')}</div>
                          </div>
                        </div>
                        {match.bigGame && (
                          <div className="big-game-final">
                            Big Game Total: {match.bigGameTotal}
                          </div>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <table className="ledger-table detailed-view">
                  <thead>
                    <tr>
                      <th>Hole</th>
                      <th>Base</th>
                      <th>Carry</th>
                      <th>Dbl</th>
                      <th>Result</th>
                      {players.map((_, playerIndex) => (
                        <th key={playerIndex} className={teamColor(playerTeams[playerIndex])}>
                          {getFullName(players[playerIndex])}
                        </th>
                      ))}
                      {match.bigGame && <th className="ledger-big-game-header-cell">Big Game</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((row, index) => {
                      const holeWinner = getHoleWinner(index);
                      const bgRow = bigGameRows[index];
                      
                      return (
                        <tr key={index} className={index === match.currentHole - 1 ? "current-hole-row" : ""}>
                          <td>{row.hole}</td>
                          <td>${row.base}</td>
                          <td>${row.carryAfter}</td>
                          <td>{row.doubles > 0 ? '✓' : ''}</td>
                          <td className={getWinnerClass(holeWinner)}>{holeWinner}</td>
                          
                          {players.map((_, playerIndex) => {
                            const teamJunkEvents = getJunkEventsForHole(row.hole)
                              .filter(event => event.teamId === playerTeams[playerIndex]);
                            const teamJunkValue = teamJunkEvents.reduce((sum, event) => sum + event.value, 0);
                            const runningTotal = row.runningTotals[playerIndex];
                            const previousTotal = index > 0 ? ledger[index - 1].runningTotals[playerIndex] : 0;
                            const holeChange = runningTotal - previousTotal;
                            
                            return (
                              <td key={playerIndex} className="player-ledger-cell">
                                <div className={`player-hole-change ${holeChange > 0 ? 'positive' : holeChange < 0 ? 'negative' : ''}`}>
                                  {formatCurrency(holeChange)}
                                </div>
                                {teamJunkValue > 0 && (
                                  <div className="player-junk-events">
                                    {teamJunkEvents.map((event, eventIndex) => (
                                      <div key={eventIndex} className={`junk-pill junk-${event.type.toLowerCase()}`}>
                                        {event.type} ${event.value} ({getPlayerName(event.playerId)})
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="player-running-total">
                                  Total: {formatCurrency(runningTotal)}
                                </div>
                              </td>
                            );
                          })}
                          
                          {match.bigGame && (
                            <td className="big-game-cell">
                              <div className="big-game-detail">
                                <div className="big-game-scores">
                                  <span className="best-net">{bgRow?.bestNet[0]}</span>
                                  <span className="best-net-plus">+</span>
                                  <span className="best-net">{bgRow?.bestNet[1]}</span>
                                </div>
                                <div className="big-game-subtotal">= {bgRow?.subtotal}</div>
                              </div>
                              <div className="big-game-running">
                                Running: {getRunningBigGameTotal(index)}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5}>
                        <strong>Final Totals</strong>
                      </td>
                      
                      {players.map((_, index) => {
                        const finalTotal = ledger.length > 0 ? ledger[ledger.length - 1].runningTotals[index] : 0;
                        
                        return (
                          <td key={index} className={`player-final-cell ${teamColor(playerTeams[index])}`}>
                            <div className="player-final-total">
                              {formatCurrency(finalTotal)}
                            </div>
                          </td>
                        );
                      })}
                      
                      {match.bigGame && (
                        <td className="big-game-final-cell">
                          <strong>{match.bigGameTotal}</strong>
                          <div className="big-game-detail-link">
                            Per hole breakdown above
                          </div>
                        </td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              )}
            </>
          ) : (
            <div className="ledger-empty">
              <p>No score data available yet. Complete a hole to see the ledger.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import html2canvas from 'html2canvas';
import '../../App.css';

interface SettlementViewProps {
  matchId: string;
}

const SettlementView: React.FC<SettlementViewProps> = ({ matchId }) => {
  const navigate = useNavigate();
  const createMatch = useGameStore(state => state.createMatch);
  const screenshotRef = useRef<HTMLDivElement>(null);
  
  // Get current game state
  const match = useGameStore(state => state.match);
  const players = useGameStore(state => state.players);
  const playerTeams = useGameStore(state => state.playerTeams);
  const ledger = useGameStore(state => state.ledger);
  const junkEvents = useGameStore(state => state.junkEvents);
  const bigGameRows = useGameStore(state => state.bigGameRows);
  
  // Verify that the matchId matches the current match
  useEffect(() => {
    if (matchId && matchId !== match.id) {
      console.warn(`Settlement view loaded with matchId ${matchId} but current match is ${match.id}`);
    }
  }, [matchId, match.id]);
  
  // Calculate final ledger values
  const finalLedger = ledger.length > 0 ? ledger[ledger.length - 1] : null;
  
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
  
  // Format currency
  const formatCurrency = (amount: number): string => {
    const formattedAmount = Math.abs(amount).toString();
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}$${formattedAmount}`;
  };
  
  // Calculate team totals from running totals
  const getTeamTotals = () => {
    if (!finalLedger) return { red: 0, blue: 0 };
    
    // Count the number of players on each team
    const redCount = playerTeams.filter(team => team === 'Red').length;
    const blueCount = playerTeams.filter(team => team === 'Blue').length;
    
    // Calculate team totals by dividing the sum by the number of team members
    // This ensures we display the correct team total, not the sum of all player amounts
    const redTotal = players.reduce((sum, player, index) => 
      playerTeams[index] === 'Red' ? sum + finalLedger.runningTotals[index] : sum, 0) / redCount;
    
    const blueTotal = players.reduce((sum, player, index) => 
      playerTeams[index] === 'Blue' ? sum + finalLedger.runningTotals[index] : sum, 0) / blueCount;
    
    console.log(`[DEBUG] Settlement team totals (adjusted): Red=${redTotal}, Blue=${blueTotal}`);
    
    return { red: redTotal, blue: blueTotal };
  };
  
  const teamTotals = getTeamTotals();
  
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
    
    // Add team junk totals
    csv += 'Team Junk Totals\n';
    csv += `Red Team Junk,$${getTeamJunkTotal('Red')}\n`;
    csv += `Blue Team Junk,$${getTeamJunkTotal('Blue')}\n\n`;
    
    // Add player results
    csv += 'Player,Team,Final Total\n';
    players.forEach((player, index) => {
      const finalTotal = finalLedger ? finalLedger.runningTotals[index] : 0;
      
      csv += `${player.name},${playerTeams[index]},${finalTotal}\n`;
    });
    
    // Add team totals
    csv += `\nTeam Totals,Red,${teamTotals.red},Blue,${teamTotals.blue}\n`;
    
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
      // Determine winner based on running totals comparison
      let holeResult = 'Push';
      if (index > 0) {
        const prevRunningTotals = ledger[index - 1].runningTotals;
        const redChange = row.runningTotals[0] - prevRunningTotals[0]; // Assuming player 0 is Red
        const blueChange = row.runningTotals[2] - prevRunningTotals[2]; // Assuming player 2 is Blue
        
        if (redChange > blueChange) holeResult = 'Red';
        else if (blueChange > redChange) holeResult = 'Blue';
      }
      
      // Calculate junk for this hole
      const holeRedJunk = junkEvents
        .filter(event => event.hole === row.hole && event.teamId === 'Red')
        .reduce((sum, event) => sum + event.value, 0);
      
      const holeBlueJunk = junkEvents
        .filter(event => event.hole === row.hole && event.teamId === 'Blue')
        .reduce((sum, event) => sum + event.value, 0);
      
      csv += `${row.hole},${row.base},${row.carryAfter},${row.doubles},${holeResult},${row.payout + holeRedJunk + holeBlueJunk}\n`;
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
  
  // Go to home/setup
  const handleNewRound = () => {
    navigate('/setup');
  };
  
  return (
    <div className="settlement-view">
      <h2>Round Summary</h2>
      
      <div className="settlement-summary" ref={screenshotRef}>
        <div className="settlement-date">
          {new Date(match.date).toLocaleDateString(undefined, { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
        
        <h3>Final Totals</h3>
        <div className="team-summary">
          <div className="team-total team-red">
            Red Team: {formatCurrency(teamTotals.red)}
          </div>
          <div className="team-total team-blue">
            Blue Team: {formatCurrency(teamTotals.blue)}
          </div>
        </div>
        
        <div className="player-results">
          {players.map((player, index) => {
            const finalTotal = finalLedger?.runningTotals[index] || 0;
            
            return (
              <div 
                key={player.id} 
                className={`player-result ${playerTeams[index]}`}
              >
                <div className="player-result-header">
                  <span className="player-name">{player.name}</span>
                  <span className="player-team">{playerTeams[index]}</span>
                </div>
                <div className="player-total-container">
                  <div className="player-total">
                    {formatCurrency(finalTotal)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {match.bigGame && (
          <div className="big-game-result">
            <h3>Big Game Total</h3>
            <div className="big-game-total">{match.bigGameTotal}</div>
            
            <div className="big-game-breakdown">
              <h4>Hole-by-Hole Breakdown</h4>
              <div className="big-game-holes">
                {bigGameRows.map((row, index) => {
                  // Calculate running total up to this point
                  const runningTotal = bigGameRows
                    .slice(0, index + 1)
                    .reduce((sum, r) => sum + r.subtotal, 0);
                  
                  return (
                    <div key={row.hole} className="big-game-hole">
                      <div className="hole-number">Hole {row.hole}</div>
                      <div className="best-nets">
                        <span className="best-net">{row.bestNet[0]}</span>
                        <span>+</span>
                        <span className="best-net">{row.bestNet[1]}</span>
                        <span>=</span>
                        <span className="subtotal">{row.subtotal}</span>
                      </div>
                      <div className="running-total">Total: {runningTotal}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="settlement-actions">
        <button 
          className="export-button" 
          onClick={handleExportCSV}
        >
          Export CSV
        </button>
        
        <button 
          className="export-button" 
          onClick={handleExportPNG}
        >
          Save PNG
        </button>
      </div>
      
      <div className="rematch-actions">
        <button 
          className="rematch-button" 
          onClick={handleRematch}
        >
          Quick Rematch (Same Players & Teams)
        </button>
        
        <button 
          className="new-round-button" 
          onClick={handleNewRound}
        >
          New Round
        </button>
      </div>
    </div>
  );
};

export default SettlementView; 
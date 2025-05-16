// Utility functions for settlement calculations

/**
 * Format a currency amount with sign (+ or -) and dollar sign
 */
export const formatCurrency = (amount: number): string => {
  const formattedAmount = Math.abs(amount).toString();
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}$${formattedAmount}`;
};

/**
 * Get the duration between two timestamps in HH:MM format
 */
export const getTimeDuration = (startTime: string, endTime: string): string => {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const diffMs = end - start;
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Calculate totals for each team based on ledger data
 */
export const getTeamTotals = (finalLedger: any, players: any[], playerTeams: string[]) => {
  if (!finalLedger) return { red: 0, blue: 0 };
  
  // Count the number of players on each team
  const redCount = playerTeams.filter(team => team === 'Red').length;
  const blueCount = playerTeams.filter(team => team === 'Blue').length;
  
  // Calculate team totals and divide by the number of players on each team
  const redTotal = players.reduce((sum, _player, index) => 
    playerTeams[index] === 'Red' ? sum + finalLedger.runningTotals[index] : sum, 0) / redCount;
  
  const blueTotal = players.reduce((sum, _player, index) => 
    playerTeams[index] === 'Blue' ? sum + finalLedger.runningTotals[index] : sum, 0) / blueCount;
  
  return { red: redTotal, blue: blueTotal };
};

/**
 * Calculate total junk value for a player
 */
export const getPlayerJunkTotal = (playerId: string, junkEvents: any[]): number => {
  return junkEvents
    .filter(event => event.playerId === playerId)
    .reduce((sum, event) => sum + event.value, 0);
};

/**
 * Calculate total junk value for a team
 */
export const getTeamJunkTotal = (team: 'Red' | 'Blue', junkEvents: any[]): number => {
  return junkEvents
    .filter(event => event.teamId === team)
    .reduce((sum, event) => sum + event.value, 0);
};

/**
 * Calculate game statistics
 */
export const calculateGameStats = (
  ledger: any[], 
  junkEvents: any[], 
  match: any
) => {
  return {
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
};

/**
 * Calculate hole wins by team
 */
export const calculateHoleWins = (holeScores: any[]) => {
  return holeScores.reduce((wins, score) => {
    if (score.teamNet[0] < score.teamNet[1]) wins.red++;
    else if (score.teamNet[1] < score.teamNet[0]) wins.blue++;
    else wins.push++;
    return wins;
  }, { red: 0, blue: 0, push: 0 });
};

/**
 * Determine the winning team based on team totals
 */
export const determineWinningTeam = (teamTotals: { red: number, blue: number }) => {
  return teamTotals.red > teamTotals.blue 
    ? 'Red' 
    : teamTotals.blue > teamTotals.red 
      ? 'Blue' 
      : 'Tie';
};

/**
 * Generate CSV data for export
 */
export const generateCsvData = (
  match: any,
  teamTotals: { red: number, blue: number },
  getTeamJunkTotal: (team: 'Red' | 'Blue') => number,
  players: any[],
  playerTeams: string[],
  finalLedger: any,
  getPlayerJunkTotal: (playerId: string) => number,
  holeWins: { red: number, blue: number, push: number },
  gameStats: any,
  bigGameRows: any[],
  ledger: any[],
  holeScores: any[]
) => {
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
  
  return csv;
}; 
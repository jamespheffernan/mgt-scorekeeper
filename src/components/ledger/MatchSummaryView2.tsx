import * as React from 'react';
import { useGameStore } from '../../store/gameStore';
import { getTimeDuration } from '../../utils/settlementUtils';
import { colors } from '../../theme/tokens';
import './MatchSummaryView2.css';
import { useNavigate } from 'react-router-dom';

// Simple currency formatter
const formatCurrency = (amount: number) => {
  return `$${amount.toFixed(2)}`;
};

// Determine winning team (zero-sum)
const getWinningTeam = (redTotal: number, blueTotal: number) => {
  if (redTotal > 0) return 'Red';
  if (blueTotal > 0) return 'Blue';
  return 'Tie';
};

// Placeholder for the new Match Summary screen, based on the wireframe and analytics requirements
const MatchSummaryView2: React.FC = () => {
  // Get match and players from store
  const match = useGameStore(state => state.match);
  const players = useGameStore(state => state.players);
  const playerTeams = useGameStore(state => state.playerTeams);
  const ledger = useGameStore(state => state.ledger);
  const junkEvents = useGameStore(state => state.junkEvents);
  const bigGameRows = useGameStore(state => state.bigGameRows);
  const holeScores = useGameStore(state => state.holeScores);
  const navigate = useNavigate();

  // Compute date
  const dateStr = match?.date ? new Date(match.date).toLocaleDateString() : '[No Date]';

  // Compute course name (placeholder for now)
  // TODO: Lookup course name from courseId if available
  const courseName = match?.courseId ? '[Course Name]' : '[No Course]';

  // Compute round length
  let roundLength = '00:00';
  if (match?.startTime && match?.endTime) {
    roundLength = getTimeDuration(match.startTime, match.endTime);
  }

  // Compute team totals (zero-sum)
  let redTotal = 0, blueTotal = 0;
  if (ledger.length > 0) {
    const last = ledger[ledger.length - 1];
    players.forEach((_, idx) => {
      if (playerTeams[idx] === 'Red') {
        redTotal += last.runningTotals[idx];
      } else if (playerTeams[idx] === 'Blue') {
        blueTotal += last.runningTotals[idx];
      }
    });
    // By Millbrook rules, redTotal + blueTotal = 0
  }

  // Determine winning team
  const winningTeam = getWinningTeam(redTotal, blueTotal);

  // Big Game total
  const bigGameTotal = match?.bigGame ? match.bigGameTotal : null;

  // Helper: get junk total for a player
  const getPlayerJunkTotal = (playerId: string) => {
    return junkEvents
      .filter(event => event.playerId === playerId)
      .reduce((sum, event) => sum + event.value, 0);
  };

  // Helper: get junk breakdown for a player
  const getPlayerJunkBreakdown = (playerId: string) => {
    const events = junkEvents.filter(event => event.playerId === playerId);
    const counts: Record<string, { count: number, value: number }> = {};
    events.forEach(event => {
      if (!counts[event.type]) {
        counts[event.type] = { count: 0, value: 0 };
      }
      counts[event.type].count += 1;
      counts[event.type].value += event.value;
    });
    return counts;
  };

  // Helper: get per-player net result (full team total, not divided)
  const getPlayerNetResult = (team: string) => {
    if (team === 'Red') return redTotal;
    if (team === 'Blue') return blueTotal;
    return 0;
  };

  // Calculate total money exchanged (2x the absolute value of the team total)
  const totalMoneyExchanged = 2 * Math.abs(redTotal !== 0 ? redTotal : blueTotal);

  const [expandedIdx, setExpandedIdx] = React.useState<number | null>(null);

  // CSV export helper
  const handleExportCSV = () => {
    // Build summary CSV header
    const header = ['Player','Team','Match Payout','Junk Total','Big Game Holes Counted','Big Game Strokes Saved'];
    // Build summary rows
    const rows = players.map((player, idx) => {
      const team = playerTeams[idx];
      const netResult = getPlayerNetResult(team);
      const junkTotal = getPlayerJunkTotal(player.id);
      // Big Game analytics
      let holesCounted = 0;
      let strokesSaved = 0;
      if (match.bigGame && bigGameRows.length > 0 && holeScores.length > 0) {
        bigGameRows.forEach((row) => {
          const holeScore = holeScores.find(hs => hs.hole === row.hole);
          if (!holeScore) return;
          const netScores = holeScore.net;
          const playerNet = netScores[idx];
          if (playerNet === row.bestNet[0] || playerNet === row.bestNet[1]) holesCounted++;
          const otherNets = netScores.filter((_, i) => i !== idx);
          if (otherNets.length === 3) {
            const sorted = [...otherNets].sort((a, b) => a - b);
            const altSubtotal = sorted[0] + sorted[1];
            if (playerNet === row.bestNet[0] || playerNet === row.bestNet[1]) {
              strokesSaved += (altSubtotal - row.subtotal);
            }
          }
        });
      }
      return [
        player.name,
        team,
        netResult,
        junkTotal,
        holesCounted,
        strokesSaved
      ];
    });
    // Convert summary to CSV string
    const summaryCsv = [header, ...rows].map(r => r.map(x => `"${x}"`).join(",")).join("\n");

    // --- Ledger CSV section (adapted from LedgerView) ---
    let ledgerCsv = '\n\nHole,Base,Carry,Doubles,Payout';
    players.forEach(player => {
      ledgerCsv += `,${player.name} Gross`;
    });
    players.forEach(player => {
      ledgerCsv += `,${player.name} Net`;
    });
    players.forEach(player => {
      ledgerCsv += `,${player.name} Money`;
    });
    ledgerCsv += ',Red Junk,Blue Junk';
    if (match.bigGame) {
      ledgerCsv += ',Big Game';
    }
    ledgerCsv += '\n';
    ledger.forEach((row, index) => {
      // Junk per hole
      const getTeamJunkTotalForHole = (hole: number, team: string) =>
        junkEvents.filter(e => e.hole === hole && e.teamId === team).reduce((sum, e) => sum + e.value, 0);
      const redJunk = getTeamJunkTotalForHole(row.hole, 'Red');
      const blueJunk = getTeamJunkTotalForHole(row.hole, 'Blue');
      ledgerCsv += `${row.hole},${row.base},${row.carryAfter},${row.doubles},${row.payout + redJunk + blueJunk}`;
      // Gross
      if (holeScores[index]) {
        holeScores[index].gross.forEach(gross => {
          ledgerCsv += `,${gross}`;
        });
      } else {
        players.forEach(() => { ledgerCsv += ','; });
      }
      // Net
      if (holeScores[index]) {
        holeScores[index].net.forEach(net => {
          ledgerCsv += `,${net}`;
        });
      } else {
        players.forEach(() => { ledgerCsv += ','; });
      }
      // Running totals
      row.runningTotals.forEach(total => {
        ledgerCsv += `,${total}`;
      });
      // Team junk
      ledgerCsv += `,${redJunk}`;
      ledgerCsv += `,${blueJunk}`;
      if (match.bigGame && bigGameRows[index]) {
        ledgerCsv += `,${bigGameRows[index].subtotal}`;
      }
      ledgerCsv += '\n';
    });
    // Totals row
    ledgerCsv += `Total,,,,`;
    if (ledger.length > 0) {
      const lastRow = ledger[ledger.length - 1];
      players.forEach(() => { ledgerCsv += ','; }); // For gross
      players.forEach(() => { ledgerCsv += ','; }); // For net
      lastRow.runningTotals.forEach(total => {
        ledgerCsv += `,${total}`;
      });
      // Add total team junk
      const getTeamJunkTotal = (team: string) =>
        junkEvents.filter(e => e.teamId === team).reduce((sum, e) => sum + e.value, 0);
      ledgerCsv += `,${getTeamJunkTotal('Red')}`;
      ledgerCsv += `,${getTeamJunkTotal('Blue')}`;
    }
    if (match.bigGame) {
      ledgerCsv += `,${match.bigGameTotal}`;
    }

    // --- Combine and download ---
    const csv = summaryCsv + ledgerCsv;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'match-summary.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="match-summary-view2">
      {/* Header */}
      <div className="summary-header">
        <h2>Match Summary</h2>
        <div className="summary-date">Date: {dateStr}</div>
        <div className="summary-course">Course: {courseName}</div>
        <div className="summary-duration">Round Length: {roundLength}</div>
      </div>

      {/* Final Results */}
      <div className="final-results">
        <h3>Final Results</h3>
        <div>
          {winningTeam !== 'Tie' ? (
            <>Winners: Team {winningTeam}</>
          ) : (
            <>It's a Tie!</>
          )}
        </div>
        <div>
          {/* Each losing player pays the full amount to each winning player */}
          Total Payout (per player): {redTotal > 0 ? formatCurrency(redTotal) + ' (Blue to Red)' : blueTotal > 0 ? formatCurrency(blueTotal) + ' (Red to Blue)' : '$0.00'}
        </div>
        <div>
          <em>Each losing player pays the full amount to each winning player. Total money exchanged: {formatCurrency(totalMoneyExchanged)}</em>
        </div>
      </div>

      {/* Scoreline Chart */}
      <div className="scoreline-chart-section">
        <h3>Scoreline Chart</h3>
        <ScorelineChart 
          ledger={ledger} 
          junkEvents={junkEvents} 
        />
        <div style={{fontSize:'0.9em',marginTop:8}}>
          <span style={{marginRight:16}}><strong>D</strong> = Double played</span>
          <span><span role="img" aria-label="Junk">💰</span> = Junk event</span>
        </div>
      </div>

      {/* Overall Totals */}
      <div className="overall-totals">
        <h3>Overall Totals</h3>
        <div>Millbrook Game:</div>
        <div>Team Red: {formatCurrency(redTotal)}</div>
        <div>Team Blue: {formatCurrency(blueTotal)}</div>
        {bigGameTotal !== null && (
          <>
            <div>Big Game (if played):</div>
            <div>Foursome Total: {bigGameTotal} strokes</div>
            <div>[Optional: Top 2 players/scores]</div>
          </>
        )}
      </div>

      {/* Player Details (Expandable) */}
      <div className="player-details-section">
        <h3>Player Details (Tap to Expand)</h3>
        {players.map((player, idx) => {
          const team = playerTeams[idx];
          const netResult = getPlayerNetResult(team);
          const junkTotal = getPlayerJunkTotal(player.id);
          const junkBreakdown = getPlayerJunkBreakdown(player.id);
          // Big Game contribution analytics
          let holesCounted = 0;
          let strokesSaved = 0;
          if (match.bigGame && bigGameRows.length > 0 && holeScores.length > 0) {
            // For each hole, check if this player's net score was one of the two best
            bigGameRows.forEach((row, holeIdx) => {
              const holeScore = holeScores.find(hs => hs.hole === row.hole);
              if (!holeScore) return;
              // Find all player indexes whose net score matches either bestNet[0] or bestNet[1]
              const netScores = holeScore.net;
              const playerNet = netScores[idx];
              // Count how many times this player's net matches a bestNet value (ties allowed)
              if (playerNet === row.bestNet[0] || playerNet === row.bestNet[1]) {
                holesCounted++;
              }
              // For strokes saved: recalculate subtotal if this player's score is excluded
              // (i.e., use the next two best net scores among the other 3 players)
              const otherNets = netScores.filter((_, i) => i !== idx);
              if (otherNets.length === 3) {
                const sorted = [...otherNets].sort((a, b) => a - b);
                const altSubtotal = sorted[0] + sorted[1];
                // Only count if this player's net was used in the real subtotal
                if (playerNet === row.bestNet[0] || playerNet === row.bestNet[1]) {
                  strokesSaved += (altSubtotal - row.subtotal);
                }
              }
            });
          }
          const expanded = expandedIdx === idx;
          return (
            <div
              className={`player-card ${team.toLowerCase()}${expanded ? ' expanded' : ''}`}
              key={player.id}
              onClick={() => setExpandedIdx(expanded ? null : idx)}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
              aria-label={`Expand details for ${player.name} (${team})`}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setExpandedIdx(expanded ? null : idx);
                }
              }}
            >
              <div className="player-name">
                <strong>{player.name}</strong>
                <span
                  className="chevron"
                  aria-controls={`player-details-${player.id}`}
                  aria-label={expanded ? 'Collapse details' : 'Expand details'}
                >
                  ▼
                </span>
              </div> ({team})
              {expanded && (
                <div id={`player-details-${player.id}`}>
                  <div>Match Payout: {formatCurrency(netResult)}</div>
                  <div>Junk Bets: {junkTotal > 0 ? formatCurrency(junkTotal) : '$0.00'}</div>
                  <ul>
                    {Object.entries(junkBreakdown).map(([type, { count, value }]) => (
                      <li key={type}>{type} ({count}): {formatCurrency(value)}</li>
                    ))}
                  </ul>
                  <div>Big Game Contribution:</div>
                  <ul>
                    <li>Holes where their net score could have counted: {holesCounted}</li>
                    <li>Strokes saved (team would have lost if their scores never counted): {strokesSaved}</li>
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="summary-actions">
        <button onClick={handleExportCSV}>Export Detailed CSV</button>
        <button onClick={() => navigate('/ledger2')}>View Full Ledger (LedgerView2)</button>
        <button onClick={() => navigate('/setup')}>Start New Game</button>
      </div>
    </div>
  );
};

const ScorelineChart: React.FC<{ledger: any[], junkEvents: any[]}> = ({ ledger, junkEvents }) => {
  const playerTeams = useGameStore(state => state.playerTeams);
  if (!ledger || ledger.length === 0) return <div style={{color:colors.grey60}}>No data</div>;
  // Calculate running team totals per hole using playerTeams
  const redTotals = ledger.map((row: any) =>
    row.runningTotals.reduce((sum: number, val: number, idx: number) => playerTeams[idx] === 'Red' ? sum + val : sum, 0)
  );
  const blueTotals = ledger.map((row: any) =>
    row.runningTotals.reduce((sum: number, val: number, idx: number) => playerTeams[idx] === 'Blue' ? sum + val : sum, 0)
  );
  // X axis: holes 1..N
  const holes = ledger.map((row: any) => row.hole);
  // Y axis: min/max for scaling
  const allTotals = [...redTotals, ...blueTotals];
  const minY = Math.min(...allTotals);
  const maxY = Math.max(...allTotals);
  const yRange = maxY - minY || 1;
  const width = 340;
  const height = 120;
  const padding = 28;
  const xStep = (width - 2*padding) / (holes.length-1 || 1);
  const yScale = (val: number) => height - padding - ((val-minY)/yRange)*(height-2*padding);
  // Markers for doubles and junk
  const doubles = ledger.map((row: any, i: number) => row.doubles > 0 ? i : null).filter((i: number | null) => i !== null);
  const junkByHole = holes.map((hole: number) => junkEvents.some((e: any) => e.hole === hole));
  // SVG polylines for team totals
  const redPoints = redTotals.map((v: number,i: number) => `${padding + i*xStep},${yScale(v)}`).join(' ');
  const bluePoints = blueTotals.map((v: number,i: number) => `${padding + i*xStep},${yScale(v)}`).join(' ');
  return (
    <svg width={width} height={height} style={{background:colors.brand20,borderRadius:8,boxShadow:'0 1px 4px #0001',width:'100%',maxWidth:400}}>
      {/* Axes */}
      <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke={colors.grey30} strokeWidth={1}/>
      <line x1={padding} y1={padding} x2={padding} y2={height-padding} stroke={colors.grey30} strokeWidth={1}/>
      {/* Team lines */}
      <polyline points={redPoints} fill="none" stroke={colors.red} strokeWidth={2}/>
      <polyline points={bluePoints} fill="none" stroke={colors.blue} strokeWidth={2}/>
      {/* Markers and value labels for each hole */}
      {holes.map((hole: number, i: number) => {
        const x = padding + i*xStep;
        const yRed = yScale(redTotals[i]);
        const yBlue = yScale(blueTotals[i]);
        const isDouble = ledger[i].doubles > 0;
        const hasJunk = junkByHole[i];
        return (
          <g key={hole}>
            {/* Hole marker */}
            <circle cx={x} cy={height-padding+2} r={3} fill={colors.grey60} />
            {/* Double marker */}
            {isDouble && <text x={x} y={padding-4} fontSize={13} fill={colors.brand} textAnchor="middle" fontWeight="bold">D</text>}
            {/* Junk marker */}
            {hasJunk && <text x={x} y={height-padding+18} fontSize={16} textAnchor="middle" role="img" aria-label="Junk">💰</text>}
            {/* Red value label */}
            <text x={x} y={yRed-8} fontSize={11} fill={colors.red} textAnchor="middle">{redTotals[i]}</text>
            {/* Blue value label */}
            <text x={x} y={yBlue+14} fontSize={11} fill={colors.blue} textAnchor="middle">{blueTotals[i]}</text>
          </g>
        );
      })}
      {/* Hole numbers */}
      {holes.map((hole: number, i: number) => {
        const x = padding + i*xStep;
        return <text key={hole} x={x} y={height-padding+16} fontSize={11} fill={colors.grey60} textAnchor="middle">{hole}</text>;
      })}
      {/* Y axis labels */}
      <text x={padding-8} y={yScale(redTotals[0])} fontSize={11} fill={colors.red} textAnchor="end">{redTotals[0]}</text>
      <text x={padding-8} y={yScale(blueTotals[0])} fontSize={11} fill={colors.blue} textAnchor="end">{blueTotals[0]}</text>
      <text x={padding-8} y={yScale(maxY)} fontSize={10} fill={colors.grey30} textAnchor="end">max</text>
      <text x={padding-8} y={yScale(minY)} fontSize={10} fill={colors.grey30} textAnchor="end">min</text>
    </svg>
  );
};

export default MatchSummaryView2; 
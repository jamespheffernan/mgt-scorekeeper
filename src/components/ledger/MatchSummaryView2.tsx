import * as React from 'react';
import { useGameStore } from '../../store/gameStore';
import { getTimeDuration } from '../../utils/settlementUtils';
import { colors } from '../../theme/tokens';
import './MatchSummaryView2.css';
import { useNavigate } from 'react-router-dom';
import { millbrookDb } from '../../db/millbrookDb';
import { Course } from '../../db/courseModel';
import html2canvas from 'html2canvas';

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

// Tab state for summary/details
const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'holes', label: 'Hole-by-Hole' },
];

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
  const [courseName, setCourseName] = React.useState<string>('[No Course]');
  React.useEffect(() => {
    const fetchCourseName = async () => {
      if (match?.courseId) {
        const course: Course | undefined = await millbrookDb.getCourse(match.courseId);
        setCourseName(course?.name || '[No Course]');
      } else {
        setCourseName('[No Course]');
      }
    };
    fetchCourseName();
  }, [match?.courseId]);

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
  const [activeTab, setActiveTab] = React.useState<'summary' | 'holes'>('summary');
  const summaryRef = React.useRef<HTMLDivElement>(null);

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

  // PNG export helper
  const handleExportPNG = async () => {
    if (!summaryRef.current) return;
    // Set width for mobile export
    const width = 375; // iPhone X width
    const canvas = await html2canvas(summaryRef.current, {
      width,
      windowWidth: width,
      backgroundColor: '#fff',
      scale: 2
    });
    const link = document.createElement('a');
    link.download = 'match-summary-topline.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="match-summary-view2">
      {/* Tab Switcher */}
      <div style={{display:'flex',justifyContent:'center',marginBottom:16,gap:8}}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'summary' | 'holes')}
            style={{
              padding:'6px 18px',
              borderRadius:8,
              border:'none',
              background:activeTab===tab.id?'#1A5E46':'#e4efe8',
              color:activeTab===tab.id?'#fff':'#1A5E46',
              fontWeight:600,
              fontSize:'1.05em',
              cursor:'pointer',
              boxShadow:activeTab===tab.id?'0 1px 4px #0001':'none',
              transition:'all 0.15s'
            }}
            aria-selected={activeTab===tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Tab Content */}
      {activeTab === 'summary' && (
        <>
          {/* Header */}
          <div className="summary-header">
            <h2>Match Summary</h2>
            <div className="summary-date">Date: {dateStr}</div>
            <div className="summary-course">Course: {courseName}</div>
            <div className="summary-duration">Round Length: {roundLength}</div>
          </div>
          {/* PNG Export Topline Section */}
          <div ref={summaryRef} style={{
            maxWidth: 400,
            margin: '16px auto',
            padding: '16px 8px',
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 2px 8px #0002',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{fontWeight: 700, fontSize: '1.3em', color: '#1A5E46', textAlign: 'center', marginBottom: 8}}>
              Final Results
            </div>
            <div style={{fontWeight: 600, fontSize: '1.1em', textAlign: 'center', marginBottom: 4}}>
              {winningTeam !== 'Tie' ? (
                <>Winners: <span style={{color: winningTeam === 'Red' ? '#b91c1c' : '#2563eb'}}>{`Team ${winningTeam}`}</span></>
              ) : (
                <>It's a Tie!</>
              )}
            </div>
            <div style={{fontWeight: 600, fontSize: '1.1em', textAlign: 'center', marginBottom: 4}}>
              Total Payout (per player): <span style={{color:'#1A5E46'}}>{redTotal > 0 ? formatCurrency(redTotal) + ' (Blue to Red)' : blueTotal > 0 ? formatCurrency(blueTotal) + ' (Red to Blue)' : '$0.00'}</span>
            </div>
            <div style={{fontWeight: 500, fontSize: '1em', textAlign: 'center', color: '#64748b', marginBottom: 8}}>
              <em>Total money exchanged: {formatCurrency(totalMoneyExchanged)}</em>
            </div>
            <div style={{fontWeight: 700, fontSize: '1.2em', color: '#1A5E46', textAlign: 'center', margin: '12px 0 4px 0'}}>
              Overall Totals
            </div>
            <div style={{display:'flex', justifyContent:'space-between', fontWeight:600, fontSize:'1.1em', marginBottom:4}}>
              <span style={{color:'#b91c1c'}}>Red: {formatCurrency(redTotal)}</span>
              <span style={{color:'#2563eb'}}>Blue: {formatCurrency(blueTotal)}</span>
            </div>
            {bigGameTotal !== null && (
              <div style={{fontWeight:600, fontSize:'1.05em', textAlign:'center', marginTop:4}}>
                Big Game (if played): <span style={{color:'#1A5E46'}}>Foursome Total: {bigGameTotal} strokes</span>
              </div>
            )}
            {/* Player Gross/Net Table for PNG Export */}
            <div style={{marginTop: 12}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'1em',margin:'0 auto'}}>
                <thead>
                  <tr style={{background:'#e4efe8'}}>
                    <th style={{padding:'6px 4px',fontWeight:700,textAlign:'left'}}>Player</th>
                    <th style={{padding:'6px 4px',fontWeight:700,textAlign:'right'}}>Gross 18</th>
                    <th style={{padding:'6px 4px',fontWeight:700,textAlign:'right'}}>Net 18</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, idx) => {
                    let gross18 = 0, net18 = 0;
                    if (holeScores && holeScores.length >= 18) {
                      gross18 = holeScores.map(h => h.gross[idx]).reduce((a, b) => a + b, 0);
                      net18 = holeScores.map(h => h.net[idx]).reduce((a, b) => a + b, 0);
                    }
                    return (
                      <tr key={player.id} style={{background: idx%2 ? '#f8fafc' : '#fff'}}>
                        <td style={{padding:'6px 4px',fontWeight:600}}>{player.name}</td>
                        <td style={{padding:'6px 4px',textAlign:'right',fontWeight:600}}>{gross18}</td>
                        <td style={{padding:'6px 4px',textAlign:'right',fontWeight:600}}>{net18}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
              // Gross/Net breakdown for 9/18 holes
              const getSum = (arr: number[], from: number, to: number) => arr.slice(from, to).reduce((a, b) => a + b, 0);
              let grossFront9 = 0, grossBack9 = 0, gross18 = 0;
              let netFront9 = 0, netBack9 = 0, net18 = 0;
              if (holeScores && holeScores.length >= 18) {
                grossFront9 = getSum(holeScores.map(h => h.gross[idx]), 0, 9);
                grossBack9 = getSum(holeScores.map(h => h.gross[idx]), 9, 18);
                gross18 = grossFront9 + grossBack9;
                netFront9 = getSum(holeScores.map(h => h.net[idx]), 0, 9);
                netBack9 = getSum(holeScores.map(h => h.net[idx]), 9, 18);
                net18 = netFront9 + netBack9;
              }
              const expanded = expandedIdx === idx;
              return (
                <div
                  className={`player-card ${team.toLowerCase()}${expanded ? ' expanded' : ''}`}
                  key={player.id}
                  onClick={() => setExpandedIdx(expanded ? null : idx)}
                  style={{ cursor: 'pointer', position: 'relative' }}
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
                    <span className="player-final-scores">
                      <span className="player-final-label">Gross</span>
                      <span className="player-final-value">{gross18}</span>
                      <span className="player-final-label" style={{marginLeft:8}}>Net</span>
                      <span className="player-final-value">{net18}</span>
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
                      <div style={{marginTop:8, marginBottom:8}}>
                        <strong>Gross/Net Breakdown</strong>
                        <table style={{width:'100%', fontSize:'0.98em', marginTop:4, marginBottom:4}}>
                          <thead>
                            <tr>
                              <th style={{textAlign:'left'}}> </th>
                              <th style={{textAlign:'right'}}>Gross</th>
                              <th style={{textAlign:'right'}}>Net</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Front 9</td>
                              <td style={{textAlign:'right'}}>{grossFront9}</td>
                              <td style={{textAlign:'right'}}>{netFront9}</td>
                            </tr>
                            <tr>
                              <td>Back 9</td>
                              <td style={{textAlign:'right'}}>{grossBack9}</td>
                              <td style={{textAlign:'right'}}>{netBack9}</td>
                            </tr>
                            <tr>
                              <td>18 Holes</td>
                              <td style={{textAlign:'right'}}>{gross18}</td>
                              <td style={{textAlign:'right'}}>{net18}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
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
            <button onClick={handleExportPNG}>Export Topline PNG</button>
            <button onClick={handleExportCSV}>Export Detailed CSV</button>
            <button onClick={() => navigate('/ledger2')}>View Full Ledger (LedgerView2)</button>
            <button onClick={() => navigate('/setup')}>Start New Game</button>
          </div>
        </>
      )}
      {activeTab === 'holes' && (
        <div
          className="hole-breakdown-tab"
          style={{
            marginTop: 8,
            overflowX: 'auto',
            width: '100%',
            maxWidth: '100vw'
          }}
        >
          <table
            style={{
              minWidth: 700,
              width: 'max-content',
              fontSize: '0.98em',
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 1px 4px #0001',
              overflow: 'hidden'
            }}
          >
            <thead style={{background:'#e4efe8'}}>
              <tr>
                <th>Hole</th>
                <th>Base</th>
                <th>Carry</th>
                <th>Dbl</th>
                <th>Win</th>
                <th>$</th>
                <th>Junk</th>
                {players.map((p, idx) => (
                  <th key={p.id} style={{color:playerTeams[idx]==='Blue'?'#2563eb':'#b91c1c'}}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledger.map((row, i) => {
                // Determine winner
                let winner = 'Push';
                if (holeScores[i]) {
                  if (holeScores[i].teamNet[0] < holeScores[i].teamNet[1]) winner = 'Red';
                  else if (holeScores[i].teamNet[1] < holeScores[i].teamNet[0]) winner = 'Blue';
                }
                // Junk summary
                const redJunk = junkEvents.filter(e => e.hole === row.hole && e.teamId === 'Red').reduce((sum, e) => sum + e.value, 0);
                const blueJunk = junkEvents.filter(e => e.hole === row.hole && e.teamId === 'Blue').reduce((sum, e) => sum + e.value, 0);
                const junkCol = [redJunk>0?`R+$${redJunk}`:'',blueJunk>0?`B+$${blueJunk}`:''].filter(Boolean).join(' ');
                return (
                  <tr key={i} style={{background:i%2?'#f8fafc':'#fff'}}>
                    <td>{row.hole}</td>
                    <td>${row.base}</td>
                    <td>${row.carryAfter}</td>
                    <td>{row.doubles>0?'✓':''}</td>
                    <td style={{color:winner==='Red'?'#b91c1c':winner==='Blue'?'#2563eb':'#64748b'}}>{winner}</td>
                    <td>${row.payout + redJunk + blueJunk}</td>
                    <td>{junkCol}</td>
                    {players.map((p, idx) => (
                      <td key={p.id} style={{textAlign:'center'}}>
                        {holeScores[i]?.gross[idx] ?? '-'} / {holeScores[i]?.net[idx] ?? '-'}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
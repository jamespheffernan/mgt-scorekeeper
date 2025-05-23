import React from 'react';
import { useGameStore, selectHoleSummary } from '../../store/gameStore';

const playerOrder = (players: any[], playerTeams: string[]): number[] => {
  // Return indices in blue, blue, red, red order
  const blue: number[] = [], red: number[] = [];
  playerTeams.forEach((team: string, idx: number) => {
    if (team === 'Blue') blue.push(idx);
    else if (team === 'Red') red.push(idx);
  });
  return [...blue, ...red];
};

const HoleAccordion: React.FC<{onSelectHole:(hole:number)=>void}> = ({onSelectHole}) => {
  const match = useGameStore(state => state.match);
  const players = useGameStore(state => state.players);
  const playerTeams = useGameStore(state => state.playerTeams);
  const ledger = useGameStore(state => state.ledger);
  const holeScores = useGameStore(state => state.holeScores);
  const junkEvents = useGameStore(state => state.junkEvents);
  const bigGameRows = useGameStore(state => state.bigGameRows);

  const order = playerOrder(players, playerTeams);

  return (
    <div
      style={{
        overflowX: 'auto',
        maxWidth: '95vw',
        width: '100%',
        minWidth: 320,
        margin: '0 auto',
        background: '#f9fafb',
        borderRadius: 8,
        boxSizing: 'border-box',
      }}
    >
      <table style={{width:'100%',fontSize:14,minWidth:600,maxWidth:600,margin:'0 auto'}} aria-label="Ledger hole summary">
        <caption style={{textAlign:'left',fontWeight:600,marginBottom:4}}>Hole-by-hole ledger</caption>
        <thead>
          <tr style={{background:'#f3f4f6'}}>
            <th>Hole</th>
            <th>Base</th>
            <th>Carry</th>
            <th>Dbl</th>
            <th>Win</th>
            <th>$</th>
            <th>Junk</th>
            {match.bigGame && <th>BG</th>}
            {order.map(idx => (
              <th key={idx} style={{color:playerTeams[idx]==='Blue'?'#2563eb':'#b91c1c'}}>
                {players[idx]?.name || `P${idx+1}`}
              </th>
            ))}
            <th>Junk Events</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((row, i) => {
            const summary = selectHoleSummary({match,players,playerTeams,ledger,holeScores,junkEvents,bigGameRows,ghostJunkEvents:{},isDoubleAvailable:false}, i);
            if (!summary) return null;
            const winner = summary.winner;
            const bgRow = match.bigGame ? bigGameRows[i] : null;
            // Compose junk summary for this hole
            const junkCol = summary.junkEvents.map(e => `${e.playerName}:${e.type}`).join(', ');
            const isCurrent = row.hole === match.currentHole;
            return (
              <tr
                key={i}
                tabIndex={0}
                role="button"
                aria-label={`View paper trail for hole ${row.hole}`}
                aria-current={isCurrent ? 'true' : undefined}
                style={{cursor:'pointer', background: isCurrent ? '#e0f2fe' : undefined}}
                onClick={()=>onSelectHole(row.hole)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectHole(row.hole);
                }}
              >
                <td>{row.hole}</td>
                <td>${row.base}</td>
                <td>${row.carryAfter}</td>
                <td>{row.doubles>0?'✓':''}</td>
                <td style={{color:winner==='Red'?'#b91c1c':winner==='Blue'?'#2563eb':'#64748b'}}>{winner}</td>
                <td>${row.payout}</td>
                <td>{summary.junkByTeam.Red>0?`R+$${summary.junkByTeam.Red}`:''}{summary.junkByTeam.Blue>0?` B+$${summary.junkByTeam.Blue}`:''}</td>
                {match.bigGame && <td>{bgRow?bgRow.subtotal:'-'}</td>}
                {order.map(idx => (
                  <td key={idx}>
                    {holeScores[i]?.gross[idx] ?? '-'} / {holeScores[i]?.net[idx] ?? '-'}
                  </td>
                ))}
                <td>{junkCol}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default HoleAccordion; 
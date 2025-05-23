import React from 'react';
import { useGameStore, selectHoleSummary } from '../../store/gameStore';

const PaperTrailDrawer: React.FC<{open:boolean, hole:number|null, onClose:()=>void}> = ({open, hole, onClose}) => {
  const match = useGameStore(state => state.match);
  const players = useGameStore(state => state.players);
  const playerTeams = useGameStore(state => state.playerTeams);
  const ledger = useGameStore(state => state.ledger);
  const holeScores = useGameStore(state => state.holeScores);
  const junkEvents = useGameStore(state => state.junkEvents);
  const bigGameRows = useGameStore(state => state.bigGameRows);

  let summary: any = null;
  if (hole !== null && hole > 0 && hole <= ledger.length) {
    summary = selectHoleSummary({match,players,playerTeams,ledger,holeScores,junkEvents,bigGameRows,ghostJunkEvents:{},ghostRevealState:{},isDoubleAvailable:false}, hole-1);
  }

  // Responsive style: maxWidth 390px on small screens, up to 600px or 95vw on larger screens
  const drawerStyle: React.CSSProperties = {
    background: '#fff',
    padding: 16,
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    boxShadow: '0 -2px 8px #0002',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    width: '95vw',
    maxWidth: 600,
    minWidth: 320,
    margin: '0 auto',
  };

  return open ? (
    <div
      style={drawerStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paper-trail-title"
      tabIndex={-1}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <button
        onClick={onClose}
        style={{float:'right',marginBottom:8}}
        aria-label="Close paper trail dialog"
        autoFocus
      >
        Close
      </button>
      <h3 id="paper-trail-title" style={{marginTop:0}}>Paper Trail {hole !== null ? `(Hole ${hole})` : ''}</h3>
      {summary ? (
        <div style={{fontSize:14,lineHeight:1.6}}>
          <ol style={{paddingLeft: '1.2em'}}>
            <li><b>Base bet:</b> ${summary.base}</li>
            <li><b>Carry In:</b> ${summary.carryIn}</li>
            {summary.doubles > 0 && (
              <li><b>Doubles:</b> Yes ({summary.doubles})</li>
            )}
            {summary.junkEvents.length > 0 && (
              <li><b>Junk Events:</b>
                <ul style={{marginTop:4,marginBottom:4}}>
                  {summary.junkEvents.map((e:any,i:number) => (
                    <li key={i}>{e.playerName}: {e.type} (${e.value})</li>
                  ))}
                </ul>
              </li>
            )}
            <li><b>Winner:</b> {summary.winner}</li>
            <li><b>Payout:</b> {
              (() => {
                const parts = [];
                // Always show base bet as both 'for win' and 'for hole value'
                if (summary.base) {
                  parts.push(`$${summary.base} for win`);
                  parts.push(`$${summary.base} for hole value`);
                }
                if (summary.carryIn) parts.push(`$${summary.carryIn} for carry`);
                if (summary.doubles) parts.push(`$${summary.base * summary.doubles} for doubles`);
                if (summary.junkEvents.length > 0) {
                  summary.junkEvents.forEach((e:any) => {
                    parts.push(`$${e.value} for ${e.playerName} ${e.type}`);
                  });
                }
                return `${summary.winner} +$${summary.payout}: ` + parts.join(' + ');
              })()
            }</li>
            <li><b>Team Totals Before:</b> Red ${summary.scoresBeforeHole.redScore}, Blue ${summary.scoresBeforeHole.blueScore}</li>
            <li><b>Team Totals After:</b> Red ${summary.scoresAfterHole.redScore}, Blue ${summary.scoresAfterHole.blueScore}</li>
          </ol>
        </div>
      ) : (
        <div style={{color:'#888'}}>No data for this hole.</div>
      )}
    </div>
  ) : null;
};
export default PaperTrailDrawer; 
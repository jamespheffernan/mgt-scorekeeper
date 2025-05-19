import React from 'react';
import { useGameStore } from '../../store/gameStore';
import '../../styles/ledger.css';

const formatCurrency = (amount: number) => {
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(amount)}`;
};

const TotalsRibbon: React.FC = () => {
  const match = useGameStore(state => state.match);
  const players = useGameStore(state => state.players);
  const playerTeams = useGameStore(state => state.playerTeams);
  const ledger = useGameStore(state => state.ledger);

  // Calculate team totals from running totals
  // FIX: Team totals should be the sum of all players on that team (zero-sum), not the average.
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
    // No division by team size! Zero-sum: Red + Blue = 0
  }

  // Only show the team with a positive total (winner), or nothing if both are zero.
  let winnerLabel = null;
  if (redTotal > 0) {
    winnerLabel = <span style={{color:'#b91c1c'}}>Red {formatCurrency(redTotal)}</span>;
  } else if (blueTotal > 0) {
    winnerLabel = <span style={{color:'#2563eb'}}>Blue {formatCurrency(blueTotal)}</span>;
  } // else show nothing if both are zero or negative

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: '#fff',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        maxWidth: 390,
        margin: '0 auto',
        fontWeight: 600,
        fontSize: 18
      }}
      aria-live="polite"
    >
      <span style={{position:'absolute',left:-9999,top:'auto',width:1,height:1,overflow:'hidden'}}>Score ribbon: shows current team totals</span>
      {winnerLabel}
      {match.bigGame && (
        <span style={{color:'#92400e'}}>Big Game: ${match.bigGameTotal}</span>
      )}
    </div>
  );
};

export default TotalsRibbon; 
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
  let redTotal = 0, blueTotal = 0;
  if (ledger.length > 0) {
    const last = ledger[ledger.length - 1];
    let redCount = 0, blueCount = 0;
    players.forEach((_, idx) => {
      if (playerTeams[idx] === 'Red') {
        redTotal += last.runningTotals[idx];
        redCount++;
      } else if (playerTeams[idx] === 'Blue') {
        blueTotal += last.runningTotals[idx];
        blueCount++;
      }
    });
    if (redCount) redTotal = redTotal / redCount;
    if (blueCount) blueTotal = blueTotal / blueCount;
  }

  return (
    <div style={{
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
    }}>
      <span style={{color:'#b91c1c'}}>Red {formatCurrency(redTotal)}</span>
      <span style={{color:'#2563eb'}}>Blue {formatCurrency(blueTotal)}</span>
      {match.bigGame && (
        <span style={{color:'#92400e'}}>Big Game: ${match.bigGameTotal}</span>
      )}
    </div>
  );
};

export default TotalsRibbon; 
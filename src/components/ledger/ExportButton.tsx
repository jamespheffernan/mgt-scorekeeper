import React from 'react';
import { useGameStore, selectHoleSummary } from '../../store/gameStore';
import { getFullName } from '../../utils/nameUtils';

const ExportButton: React.FC = () => {
  const match = useGameStore(state => state.match);
  const players = useGameStore(state => state.players);
  const playerTeams = useGameStore(state => state.playerTeams);
  const ledger = useGameStore(state => state.ledger);
  const holeScores = useGameStore(state => state.holeScores);
  const junkEvents = useGameStore(state => state.junkEvents);
  const bigGameRows = useGameStore(state => state.bigGameRows);

  const handleExport = () => {
    let csv = '';

    // 1. Basic Scorecard
    csv += 'Scorecard\n';
    csv += 'Hole,Par,SI';
    players.forEach(player => {
      csv += `,${getFullName(player)} Gross`;
    });
    players.forEach(player => {
      csv += `,${getFullName(player)} Net`;
    });
    players.forEach(player => {
      csv += `,${getFullName(player)} Team`;
    });
    csv += '\n';
    for (let i = 0; i < 18; i++) {
      csv += `${i+1},${match.holePar[i] || ''},${match.holeSI[i] || ''}`;
      if (holeScores[i]) {
        holeScores[i].gross.forEach(gross => { csv += `,${gross}`; });
        holeScores[i].net.forEach(net => { csv += `,${net}`; });
        playerTeams.forEach(team => { csv += `,${team}`; });
      } else {
        players.forEach(() => { csv += ','; });
        players.forEach(() => { csv += ','; });
        players.forEach(() => { csv += ','; });
      }
      csv += '\n';
    }

    // Blank row
    csv += '\n';

    // 2. Main Ledger Table
    csv += 'Ledger\n';
    csv += 'Hole,Base,Carry,Doubles,Payout';
    players.forEach(player => { csv += `,${getFullName(player)} Gross`; });
    players.forEach(player => { csv += `,${getFullName(player)} Net`; });
    players.forEach(player => { csv += `,${getFullName(player)} Money`; });
    csv += ',Red Junk,Blue Junk';
    if (match.bigGame) { csv += ',Big Game'; }
    csv += '\n';
    ledger.forEach((row, index) => {
      const redJunk = junkEvents.filter(e => e.hole === row.hole && e.teamId === 'Red').reduce((sum, e) => sum + e.value, 0);
      const blueJunk = junkEvents.filter(e => e.hole === row.hole && e.teamId === 'Blue').reduce((sum, e) => sum + e.value, 0);
      const carryIn = index === 0 ? 0 : ledger[index - 1].carryAfter;
      csv += `${row.hole},${row.base},${carryIn},${row.doubles},${row.payout + redJunk + blueJunk}`;
      if (holeScores[index]) {
        holeScores[index].gross.forEach(gross => { csv += `,${gross}`; });
        holeScores[index].net.forEach(net => { csv += `,${net}`; });
      } else {
        players.forEach(() => { csv += ','; });
        players.forEach(() => { csv += ','; });
      }
      row.runningTotals.forEach(total => { csv += `,${total}`; });
      csv += `,${redJunk},${blueJunk}`;
      if (match.bigGame && bigGameRows[index]) { csv += `,${bigGameRows[index].subtotal}`; }
      csv += '\n';
    });
    // Totals row
    csv += 'Total,,,,';
    if (ledger.length > 0) {
      const lastRow = ledger[ledger.length - 1];
      players.forEach(() => { csv += ','; }); // For gross
      players.forEach(() => { csv += ','; }); // For net
      lastRow.runningTotals.forEach(total => { csv += `,${total}`; });
      // Add total team junk
      const totalRedJunk = junkEvents.filter(e => e.teamId === 'Red').reduce((sum, e) => sum + e.value, 0);
      const totalBlueJunk = junkEvents.filter(e => e.teamId === 'Blue').reduce((sum, e) => sum + e.value, 0);
      csv += `,${totalRedJunk},${totalBlueJunk}`;
    }
    if (match.bigGame) { csv += `,${match.bigGameTotal}`; }
    csv += '\n';

    // Blank row
    csv += '\n';

    // 3. Paper-Trail Section
    csv += 'Paper Trail\n';
    csv += 'Hole,Step,Detail\n';
    ledger.forEach((row, i) => {
      const summary = selectHoleSummary({match,players,playerTeams,ledger,holeScores,junkEvents,bigGameRows,isDoubleAvailable:false}, i);
      if (!summary) return;
      const steps = [];
      steps.push(['Base bet', `$${summary.base}`]);
      steps.push(['Carry In', `$${summary.carryIn}`]);
      if (summary.doubles > 0) steps.push(['Doubles', `Yes (${summary.doubles})`]);
      if (summary.junkEvents.length > 0) {
        summary.junkEvents.forEach(e => {
          steps.push(['Junk', `${e.playerName}: ${e.type} ($${e.value})`]);
        });
      }
      steps.push(['Winner', summary.winner]);
      steps.push(['Payout', `$${summary.payout}`]);
      steps.push(['Team Totals Before', `Red $${summary.scoresBeforeHole.redScore}, Blue $${summary.scoresBeforeHole.blueScore}`]);
      steps.push(['Team Totals After', `Red $${summary.scoresAfterHole.redScore}, Blue $${summary.scoresAfterHole.blueScore}`]);
      steps.forEach(([step, detail]) => {
        csv += `${row.hole},${step},${detail}\n`;
      });
      // Blank line between holes
      csv += ',,\n';
    });

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

  return <button style={{marginTop:8}} onClick={handleExport} aria-label="Export ledger, scorecard, and paper trail as CSV">Export CSV</button>;
};

export default ExportButton; 
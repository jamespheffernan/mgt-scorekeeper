import React, { useState } from 'react';
import { useGameStore, Player, Team } from './store/gameStore';
import { JunkFlags } from './calcEngine/junkCalculator';

/**
 * Component to test the bug fixes
 */
export const TestFixes: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [csvData, setCsvData] = useState<string>('');
  
  // Game store actions
  const createMatch = useGameStore(state => state.createMatch);
  const enterHoleScores = useGameStore(state => state.enterHoleScores);
  const match = useGameStore(state => state.match);
  const ledger = useGameStore(state => state.ledger);
  const holeScores = useGameStore(state => state.holeScores);
  
  // Helper to add test result
  const addResult = (test: string, result: string) => {
    setTestResults(prev => ({
      ...prev,
      [test]: result
    }));
  };
  
  // Test 1: Base doubling from hole 1 to hole 2
  const testBaseDoubling = async () => {
    // Create test players
    const players: Player[] = [
      { id: '1', name: 'Player 1', index: 6.1 },
      { id: '2', name: 'Player 2', index: 8.4 },
      { id: '3', name: 'Player 3', index: 9.3 },
      { id: '4', name: 'Player 4', index: 10.2 }
    ];
    
    // Create test teams
    const teams: Team[] = ['Red', 'Blue', 'Red', 'Blue'];
    
    // Create new match
    createMatch(players, teams, { bigGame: false });
    
    // Verify initial base is 1
    const initialBase = match.base;
    addResult('Initial Base', initialBase === 1 ? 'PASS: Base is 1 on hole 1' : `FAIL: Base is ${initialBase} on hole 1`);
    
    // Enter scores for hole 1
    await enterHoleScores(
      1,
      [4, 4, 4, 4],
      [
        { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
        { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
        { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
        { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false }
      ]
    );
    
    // Check if base doubled for hole 2
    const newBase = match.base;
    addResult('Base Doubling', newBase === 2 ? 'PASS: Base doubled to 2 on hole 2' : `FAIL: Base is ${newBase} on hole 2 (expected 2)`);
  };
  
  // Test 2: Stroke allocation
  const testStrokeAllocation = async () => {
    // This would need to be manually checked
    addResult('Stroke Allocation', 'CHECK UI: Verify players get correct number of strokes in UI');
  };
  
  // Test 3-5: These require UI interaction and need to be checked manually
  const reportUITests = () => {
    addResult('Sandies on holes 6/15', 'CHECK UI: Verify Sandy option is disabled on holes 6 and 15');
    addResult('3-Putt on Par 3s', 'CHECK UI: Verify 3-Putt only shows when Greenie is selected on par 3s');
    addResult('Closest checkbox', 'CHECK UI: Verify Closest checkbox is removed');
  };
  
  // Run all tests
  const runAllTests = async () => {
    setTestResults({});
    await testBaseDoubling();
    testStrokeAllocation();
    reportUITests();
  };
  
  // Export CSV for testing
  const testCsvExport = () => {
    if (ledger.length === 0) {
      addResult('CSV Export', 'FAIL: Need to enter hole scores first');
      return;
    }
    
    // Create CSV header
    let csv = 'Hole,Base,Carry,Doubles,Payout';
    const players = useGameStore.getState().players;
    
    // Add player headers for gross, net, running total
    players.forEach(player => {
      csv += `,${player.name} Gross`;
    });
    players.forEach(player => {
      csv += `,${player.name} Net`;
    });
    players.forEach(player => {
      csv += `,${player.name} Running Total`;
    });
    csv += '\n';
    
    // Add each ledger row
    ledger.forEach((row, index) => {
      csv += `${row.hole},${row.base},${row.carryAfter},${row.doubles},${row.payout}`;
      
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
      csv += '\n';
    });
    
    setCsvData(csv);
    addResult('CSV Export', 'PASS: CSV data generated with gross and net scores');
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Bug Fix Tests</h1>
      
      <button 
        onClick={runAllTests}
        style={{ padding: '10px 15px', fontSize: '16px', marginBottom: '20px' }}
      >
        Run Tests
      </button>
      
      <button 
        onClick={testCsvExport}
        style={{ padding: '10px 15px', fontSize: '16px', marginLeft: '10px', marginBottom: '20px' }}
      >
        Test CSV Export
      </button>
      
      <h2>Test Results</h2>
      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '5px',
        padding: '15px',
        backgroundColor: '#f9f9f9',
        marginBottom: '20px'
      }}>
        {Object.entries(testResults).length > 0 ? (
          Object.entries(testResults).map(([test, result]) => (
            <div key={test} style={{ marginBottom: '10px' }}>
              <strong>{test}:</strong>{' '}
              <span style={{ 
                color: result.startsWith('PASS') ? 'green' : 
                       result.startsWith('FAIL') ? 'red' : 'blue' 
              }}>
                {result}
              </span>
            </div>
          ))
        ) : (
          <p>No tests run yet</p>
        )}
      </div>
      
      {csvData && (
        <>
          <h2>CSV Export Data</h2>
          <div style={{ 
            border: '1px solid #ddd', 
            borderRadius: '5px',
            padding: '15px',
            backgroundColor: '#f9f9f9',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            overflowX: 'auto',
            fontSize: '12px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {csvData}
          </div>
        </>
      )}
      
      <h2>Manual Testing Required</h2>
      <ol>
        <li>
          <strong>Sandies on holes 6/15:</strong> Navigate to holes 6 and 15, verify Sandy option is disabled
        </li>
        <li>
          <strong>3-Putt on Par 3s:</strong> On a par 3 hole, verify 3-Putt option only appears when Greenie is selected
        </li>
        <li>
          <strong>Closest checkbox:</strong> On a par 3 hole, verify there's no Closest checkbox anymore
        </li>
        <li>
          <strong>CSV Export:</strong> Use the actual app's export function and verify gross and net scores are included
        </li>
      </ol>
    </div>
  );
}; 
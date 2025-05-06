import { useState, useEffect } from 'react';
import { calculateHolePayout, calculatePlayerPayouts, updateRunningTotals } from '../calcEngine/payoutCalculator';

export function PayoutCalculatorTest() {
  // State for test inputs
  const [winner, setWinner] = useState<'Red' | 'Blue' | 'Push'>('Red');
  const [base, setBase] = useState(2);
  const [carry, setCarry] = useState(0);
  const [playerTeams, setPlayerTeams] = useState<('Red' | 'Blue')[]>(['Red', 'Blue', 'Red', 'Blue']);
  const [runningTotals, setRunningTotals] = useState<number[]>([0, 0, 0, 0]);
  
  // State for test outputs
  const [holePayout, setHolePayout] = useState(0);
  const [newCarry, setNewCarry] = useState(0);
  const [playerPayouts, setPlayerPayouts] = useState<number[]>([0, 0, 0, 0]);
  const [newTotals, setNewTotals] = useState<number[]>([0, 0, 0, 0]);

  // Test cases with properly typed winner
  const testCases: {
    name: string;
    winner: 'Red' | 'Blue' | 'Push';
    base: number;
    carry: number;
    expected: { payout: number; newCarry: number }
  }[] = [
    { name: 'TC-04: Carry-over push then win', winner: 'Blue', base: 8, carry: 6, expected: { payout: 22, newCarry: 0 } },
    { name: 'Simple push test', winner: 'Push', base: 2, carry: 0, expected: { payout: 0, newCarry: 2 } },
    { name: 'Simple win test (Red)', winner: 'Red', base: 2, carry: 0, expected: { payout: 4, newCarry: 0 } },
    { name: 'Multiple pushes then win', winner: 'Blue', base: 2, carry: 4, expected: { payout: 8, newCarry: 0 } },
  ];

  // Calculate results when inputs change
  useEffect(() => {
    const result = calculateHolePayout(winner, base, carry);
    setHolePayout(result.payout);
    setNewCarry(result.newCarry);
    
    const payouts = calculatePlayerPayouts(winner, result.payout, playerTeams);
    setPlayerPayouts(payouts);
    
    const updated = updateRunningTotals(runningTotals, payouts);
    setNewTotals(updated);
  }, [winner, base, carry, playerTeams, runningTotals]);

  // Run a specific test case
  const runTestCase = (testCase: { 
    winner: 'Red' | 'Blue' | 'Push';
    base: number;
    carry: number;
    expected: { payout: number; newCarry: number }
  }) => {
    setWinner(testCase.winner);
    setBase(testCase.base);
    setCarry(testCase.carry);
  };

  // Helper to swap a player's team
  const togglePlayerTeam = (index: number) => {
    const newTeams = [...playerTeams];
    newTeams[index] = newTeams[index] === 'Red' ? 'Blue' : 'Red';
    setPlayerTeams(newTeams);
  };

  // Apply the calculated payouts to running totals
  const applyToRunningTotals = () => {
    setRunningTotals(newTotals);
  };

  return (
    <div className="test-container">
      <h2>Payout Calculator Test</h2>
      
      <div className="test-controls">
        <div>
          <label>Winner:</label>
          <select value={winner} onChange={(e) => setWinner(e.target.value as 'Red' | 'Blue' | 'Push')}>
            <option value="Red">Red</option>
            <option value="Blue">Blue</option>
            <option value="Push">Push</option>
          </select>
        </div>
        
        <div>
          <label>Base ($):</label>
          <input 
            type="number" 
            value={base} 
            onChange={(e) => setBase(Number(e.target.value))} 
            min={1}
          />
        </div>
        
        <div>
          <label>Carry ($):</label>
          <input 
            type="number" 
            value={carry} 
            onChange={(e) => setCarry(Number(e.target.value))} 
            min={0}
          />
        </div>
      </div>
      
      <div className="player-teams">
        <h3>Player Teams</h3>
        {playerTeams.map((team, idx) => (
          <div key={idx} className="player-team">
            <span>Player {idx + 1}:</span>
            <button 
              className={team === 'Red' ? 'team-red' : 'team-blue'}
              onClick={() => togglePlayerTeam(idx)}
            >
              {team}
            </button>
          </div>
        ))}
      </div>
      
      <div className="results">
        <h3>Results</h3>
        <div>Hole Payout: ${holePayout}</div>
        <div>New Carry: ${newCarry}</div>
        <div>Player Payouts: {playerPayouts.map((p, i) => `P${i+1}: ${p > 0 ? '+' : ''}$${p.toFixed(2)}`).join(', ')}</div>
        <div className="totals">
          <div>Running Totals: {runningTotals.map((t, i) => `P${i+1}: ${t > 0 ? '+' : ''}$${t.toFixed(2)}`).join(', ')}</div>
          <div>New Totals: {newTotals.map((t, i) => `P${i+1}: ${t > 0 ? '+' : ''}$${t.toFixed(2)}`).join(', ')}</div>
          <button onClick={applyToRunningTotals}>Apply to Running Totals</button>
        </div>
      </div>
      
      <div className="test-cases">
        <h3>Test Cases</h3>
        {testCases.map((test, idx) => (
          <div key={idx} className="test-case">
            <button onClick={() => runTestCase(test)}>{test.name}</button>
            <div className="expected">
              Expected: Payout ${test.expected.payout}, Carry ${test.expected.newCarry}
            </div>
            <div className={
              holePayout === test.expected.payout && newCarry === test.expected.newCarry 
                ? 'passing' : 'failing'
            }>
              {holePayout === test.expected.payout && newCarry === test.expected.newCarry 
                ? '✅ PASS' : '❌ FAIL'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
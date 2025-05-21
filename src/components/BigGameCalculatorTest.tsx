import { useState } from 'react';
import { 
  calculateBigGameRow, 
  calculateBigGameTotal,
  findBestScoreIndexes,
  BigGameRow
} from '../calcEngine/bigGameCalculator';

export function BigGameCalculatorTest() {
  // State for test inputs
  const [hole, setHole] = useState(1);
  const [netScores, setNetScores] = useState<number[]>([3, 4, 5, 6]);
  const [bigGameRows, setBigGameRows] = useState<BigGameRow[]>([]);
  
  // Results
  const [currentRow, setCurrentRow] = useState<BigGameRow | null>(null);
  const [bestIndexes, setBestIndexes] = useState<number[]>([]);
  const [runningTotal, setRunningTotal] = useState(0);
  
  // Test cases
  const testCases = [
    { 
      name: 'TC-07: Two-best (3,4,5,6)',
      hole: 1,
      netScores: [3, 4, 5, 6],
      expected: { bestNet: [3, 4], subtotal: 7 }
    },
    { 
      name: 'All equal scores (4,4,4,4)',
      hole: 2,
      netScores: [4, 4, 4, 4],
      expected: { bestNet: [4, 4], subtotal: 8 }
    },
    { 
      name: 'One good score (2,5,5,5)',
      hole: 3,
      netScores: [5, 5, 2, 5],
      expected: { bestNet: [2, 5], subtotal: 7 }
    },
    { 
      name: 'Mixed scores (6,3,5,4)',
      hole: 4,
      netScores: [6, 3, 5, 4],
      expected: { bestNet: [3, 4], subtotal: 7 }
    },
    {
      name: 'Three players (4,5,6)',
      hole: 5,
      netScores: [4, 5, 6],
      expected: { bestNet: [4, 5], subtotal: 9 }
    },
    {
      name: 'Two players (4,5)',
      hole: 6,
      netScores: [4, 5],
      expected: { bestNet: [4, 5], subtotal: 9 }
    }
  ];
  
  // Calculate Big Game row
  const calculate = () => {
    try {
      const row = calculateBigGameRow(hole, netScores);
      setCurrentRow(row);
      setBestIndexes(findBestScoreIndexes(netScores));
    } catch (error) {
      console.error('Error calculating Big Game row:', error);
    }
  };
  
  // Add current row to big game rows
  const addToBigGame = () => {
    if (currentRow) {
      const updatedRows = [...bigGameRows, currentRow];
      setBigGameRows(updatedRows);
      setRunningTotal(calculateBigGameTotal(updatedRows));
    }
  };
  
  // Reset big game rows
  const resetBigGame = () => {
    setBigGameRows([]);
    setRunningTotal(0);
  };
  
  // Update a single net score
  const updateNetScore = (index: number, value: number) => {
    const newScores = [...netScores];
    newScores[index] = value;
    setNetScores(newScores);
  };
  
  // Run a specific test case
  const runTestCase = (testCase: any) => {
    setHole(testCase.hole);
    setNetScores(testCase.netScores);
    
    // Set timeout to allow state to update before calculating
    setTimeout(() => {
      calculate();
    }, 50);
  };
  
  // Check if test passes
  const checkTestResult = (expected: { bestNet: number[], subtotal: number }) => {
    if (!currentRow) return false;
    
    return (
      currentRow.bestNet[0] === expected.bestNet[0] &&
      currentRow.bestNet[1] === expected.bestNet[1] &&
      currentRow.subtotal === expected.subtotal
    );
  };
  
  return (
    <div className="test-container">
      <h2>Big Game Calculator Test</h2>
      
      <div className="test-controls">
        <div>
          <label>Hole (1-18):</label>
          <input 
            type="number" 
            value={hole} 
            onChange={(e) => setHole(Number(e.target.value))} 
            min={1} max={18}
          />
        </div>
        
        <div className="net-scores">
          <h3>Net Scores</h3>
          {netScores.map((score, idx) => (
            <div key={idx} className={bestIndexes.includes(idx) ? 'best-score' : ''}>
              <label>Player {idx + 1}:</label>
              <input 
                type="number" 
                value={score} 
                onChange={(e) => updateNetScore(idx, Number(e.target.value))} 
                min={1} 
              />
              {bestIndexes.includes(idx) && <span className="best-indicator">✓ Best</span>}
            </div>
          ))}
          
          <button onClick={calculate}>Calculate</button>
        </div>
      </div>
      
      <div className="results">
        <h3>Current Result</h3>
        {currentRow ? (
          <div>
            <div>Hole: {currentRow.hole}</div>
            <div>Best Net Scores: {currentRow.bestNet.join(', ')}</div>
            <div>Subtotal: {currentRow.subtotal}</div>
            <button onClick={addToBigGame}>Add to Big Game</button>
          </div>
        ) : (
          <p>No calculation yet.</p>
        )}
      </div>
      
      <div className="big-game-summary">
        <h3>Big Game Running Total</h3>
        <div>Holes recorded: {bigGameRows.length}</div>
        <div>Running total: {runningTotal}</div>
        <button onClick={resetBigGame}>Reset</button>
        
        {bigGameRows.length > 0 && (
          <div className="hole-list">
            <h4>Hole History</h4>
            <table>
              <thead>
                <tr>
                  <th>Hole</th>
                  <th>Best Net</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {bigGameRows.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.hole}</td>
                    <td>{row.bestNet.join(', ')}</td>
                    <td>{row.subtotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="test-cases">
        <h3>Test Cases</h3>
        {testCases.map((test, idx) => (
          <div key={idx} className="test-case">
            <button onClick={() => runTestCase(test)}>{test.name}</button>
            <div className="expected">
              Expected: Best {test.expected.bestNet.join(', ')}, Subtotal {test.expected.subtotal}
            </div>
            <div className={checkTestResult(test.expected) ? 'passing' : 'failing'}>
              {checkTestResult(test.expected) ? '✅ PASS' : '❌ FAIL'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
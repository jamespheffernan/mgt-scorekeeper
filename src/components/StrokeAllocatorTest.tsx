import { useState } from 'react';
import { allocateStrokes } from '../calcEngine/strokeAllocator';

/**
 * Visual test component for the stroke allocator
 */
export function StrokeAllocatorTest() {
  const [indexes, setIndexes] = useState<string[]>(['6.1', '8.4', '9.3', '10.2']);
  const [strokeMatrix, setStrokeMatrix] = useState<number[][]>([]);
  
  // Default stroke index table
  const defaultSI = [7, 15, 5, 11, 1, 13, 3, 17, 9, 2, 14, 6, 18, 10, 4, 16, 8, 12];
  
  // Handle index change
  const handleIndexChange = (index: number, value: string) => {
    const newIndexes = [...indexes];
    newIndexes[index] = value;
    setIndexes(newIndexes);
  };
  
  // Calculate strokes
  const calculateStrokes = () => {
    const parsedIndexes = indexes.map(idx => parseFloat(idx));
    if (parsedIndexes.some(isNaN)) {
      alert('Please enter valid handicap indexes');
      return;
    }
    
    const result = allocateStrokes(parsedIndexes, defaultSI);
    setStrokeMatrix(result);
  };
  
  return (
    <div className="stroke-allocator-test">
      <h2>Stroke Allocator Test</h2>
      
      <div className="player-indexes">
        <h3>Player Handicap Indexes</h3>
        {indexes.map((value, idx) => (
          <div key={idx} className="index-input">
            <label>
              Player {idx + 1}:
              <input
                type="text"
                value={value}
                onChange={(e) => handleIndexChange(idx, e.target.value)}
              />
            </label>
          </div>
        ))}
        <button onClick={calculateStrokes}>Calculate Strokes</button>
      </div>
      
      {strokeMatrix.length > 0 && (
        <div className="stroke-results">
          <h3>Stroke Allocation</h3>
          <table>
            <thead>
              <tr>
                <th>Hole</th>
                <th>SI</th>
                {indexes.map((_, idx) => (
                  <th key={idx}>Player {idx + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array(18).fill(0).map((_, holeIdx) => (
                <tr key={holeIdx}>
                  <td>{holeIdx + 1}</td>
                  <td>{defaultSI[holeIdx]}</td>
                  {strokeMatrix.map((_, playerIdx) => (
                    <td key={playerIdx} className={strokeMatrix[playerIdx][holeIdx] > 0 ? 'has-stroke' : ''}>
                      {strokeMatrix[playerIdx][holeIdx] > 0 ? strokeMatrix[playerIdx][holeIdx] : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="stroke-summary">
            <h3>Summary</h3>
            <ul>
              {strokeMatrix.map((playerStrokes, playerIdx) => {
                const total = playerStrokes.reduce((sum, count) => sum + count, 0);
                return (
                  <li key={playerIdx}>
                    Player {playerIdx + 1}: {total} stroke{total !== 1 ? 's' : ''}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
} 
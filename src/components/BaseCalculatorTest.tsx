import { useState } from 'react';
import {
  DoublingState,
  getInitialDoublingState,
  callDouble,
  advanceToNextHole
} from '../calcEngine/baseCalculator';

/**
 * Visual test component for the base calculator
 */
export function BaseCalculatorTest() {
  const [state, setState] = useState<DoublingState>(getInitialDoublingState());
  const [history, setHistory] = useState<DoublingState[]>([getInitialDoublingState()]);

  // Call a double for a team
  const handleDouble = (team: 'Red' | 'Blue') => {
    const newState = callDouble(state, team);
    
    // Only update state and history if the double was accepted
    if (newState.doubles !== state.doubles) {
      setState(newState);
      setHistory(prev => [...prev, newState]);
    }
  };

  // Advance to the next hole
  const handleAdvance = (winner: 'Red' | 'Blue' | 'Push') => {
    const additionalCarry = 0; // Default no additional carry
    const newState = advanceToNextHole(state, winner, additionalCarry);
    setState(newState);
    setHistory(prev => [...prev, newState]);
  };

  // Reset the game
  const handleReset = () => {
    const initialState = getInitialDoublingState();
    setState(initialState);
    setHistory([initialState]);
  };

  return (
    <div className="base-calculator-test">
      <h2>Base & Doubling Test</h2>
      
      <div className="current-state">
        <h3>Current State</h3>
        <div className="state-grid">
          <div className="state-item">
            <div className="label">Hole</div>
            <div className="value">{state.currentHole}</div>
          </div>
          <div className="state-item">
            <div className="label">Base</div>
            <div className="value">${state.base}</div>
          </div>
          <div className="state-item">
            <div className="label">Carry</div>
            <div className="value">${state.carry}</div>
          </div>
          <div className="state-item">
            <div className="label">Doubles</div>
            <div className="value">{state.doubles}</div>
          </div>
          <div className="state-item">
            <div className="label">Leading</div>
            <div className="value">{state.leadingTeam}</div>
          </div>
          <div className="state-item">
            <div className="label">Double Used</div>
            <div className="value">{state.doubleUsedThisHole ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>
      
      <div className="controls">
        <div className="control-section">
          <h3>Call Double</h3>
          <div className="buttons">
            <button 
              onClick={() => handleDouble('Red')}
              className="red-button"
              disabled={state.doubleUsedThisHole || state.leadingTeam === 'Red'}
            >
              Red Doubles
            </button>
            <button 
              onClick={() => handleDouble('Blue')}
              className="blue-button"
              disabled={state.doubleUsedThisHole || state.leadingTeam === 'Blue'}
            >
              Blue Doubles
            </button>
          </div>
        </div>
        
        <div className="control-section">
          <h3>Advance to Next Hole</h3>
          <div className="buttons">
            <button 
              onClick={() => handleAdvance('Red')}
              className="red-button"
            >
              Red Wins
            </button>
            <button 
              onClick={() => handleAdvance('Push')}
              className="tie-button"
            >
              Push
            </button>
            <button 
              onClick={() => handleAdvance('Blue')}
              className="blue-button"
            >
              Blue Wins
            </button>
          </div>
        </div>
        
        <div className="control-section">
          <button onClick={handleReset} className="reset-button">
            Reset Game
          </button>
        </div>
      </div>
      
      <div className="history">
        <h3>History</h3>
        <table>
          <thead>
            <tr>
              <th>Hole</th>
              <th>Base</th>
              <th>Carry</th>
              <th>Doubles</th>
              <th>Leading</th>
              <th>Double Used</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, idx) => (
              <tr key={idx} className={idx === history.length - 1 ? 'current-row' : ''}>
                <td>{item.currentHole}</td>
                <td>${item.base}</td>
                <td>${item.carry}</td>
                <td>{item.doubles}</td>
                <td>{item.leadingTeam}</td>
                <td>{item.doubleUsedThisHole ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 
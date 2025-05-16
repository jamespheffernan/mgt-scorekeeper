import React, { useState } from 'react';
import { JunkFlags } from '../../../store/gameStore';

interface BottomSheetProps {
  playerName: string;
  playerIndex: number;
  team: 'Red' | 'Blue';
  currentHole: number;
  par: number;
  initialScore: number;
  strokes: number;
  onScoreChange: (score: number) => void;
  onJunkChange: (junk: JunkFlags) => void;
  onClose: () => void;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ 
  playerName, 
  team, 
  currentHole, 
  par, 
  initialScore,
  strokes,
  onScoreChange, 
  onJunkChange, 
  onClose 
}) => {
  const [grossScore, setGrossScore] = useState<number>(initialScore);
  const [junkFlags, setJunkFlags] = useState<JunkFlags>({
    hadBunkerShot: false,
    isOnGreenFromTee: false,
    isClosestOnGreen: false,
    hadThreePutts: false,
    isLongDrive: false
  });
  
  const handleScoreChange = (value: number) => {
    setGrossScore(value);
    onScoreChange(value);
  };
  
  const handleJunkChange = (flag: keyof JunkFlags) => {
    const updatedFlags = { ...junkFlags, [flag]: !junkFlags[flag] };
    
    // If turning off green from tee, also turn off three putts
    if (flag === 'isOnGreenFromTee' && !updatedFlags.isOnGreenFromTee) {
      updatedFlags.hadThreePutts = false;
    }
    
    setJunkFlags(updatedFlags);
    onJunkChange(updatedFlags);
  };
  
  const teamColor = team === 'Red' ? '#e74c3c' : '#3498db';
  
  // Ensure par is a sensible value for generating score options
  // Golf pars are typically 3, 4, or 5. Rarely 6.
  const isValidPar = par && par >= 3 && par <= 6;
  const effectivePar = isValidPar ? par : 4; // Default to 4 if par is invalid/unlikely

  // Generate score options: from 1 up to Triple Bogey (effectivePar + 3).
  const scoreOptionsStart = 1;
  const scoreOptionsEnd = effectivePar + 3; 
  
  const scoreOptions = Array.from({ length: scoreOptionsEnd - scoreOptionsStart + 1 }, (_, i) => scoreOptionsStart + i);
  
  // Get the score text/class based on relation to par
  const getScoreInfo = (score: number) => {
    if (score === 1) return { text: 'Hole in One', class: 'ace-score' };
    if (score === par - 2) return { text: `${score} (Eagle)`, class: 'eagle-score' };
    if (score === par - 1) return { text: `${score} (Birdie)`, class: 'birdie-score' };
    if (score === par) return { text: `${score} (Par)`, class: 'par-score' };
    if (score === par + 1) return { text: `${score} (Bogey)`, class: 'bogey-score' };
    if (score === par + 2) return { text: `${score} (Double Bogey)`, class: 'double-bogey-score' };
    return { text: score.toString(), class: '' };
  };
  
  // Determine which junk options should be visible
  const isPar3 = par === 3;
  const canHaveGreenie = isPar3;
  const canHaveLongDrive = currentHole === 17; // Only available on hole 17
  const canHaveThreePutts = junkFlags.isOnGreenFromTee; // Only if on green from tee
  
  // Height for the fixed footer button
  const footerHeight = 64; // px
  
  return (
    <div className="bottom-sheet-modal-overlay" onClick={onClose}>
      <div
        className="bottom-sheet polished-bottom-sheet"
        data-testid="bottom-sheet"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        {/* Drag Handle */}
        <div className="bottom-sheet-drag-handle" />
        {/* Header */}
        <div className="bottom-sheet-header">
          <h3 style={{ margin: 0, color: teamColor }}>
            {playerName} - Hole {currentHole}
          </h3>
          <button 
            className="bottom-sheet-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {/* Scrollable Content Area */}
        <div className="bottom-sheet-content-area">
          <div className="bottom-sheet-score-row">
            <span className="bottom-sheet-par">Par: {par}</span>
            {strokes > 0 && (
              <span className="bottom-sheet-strokes" style={{ backgroundColor: teamColor }}>
                -{strokes} handicap {strokes === 1 ? 'stroke' : 'strokes'}
              </span>
            )}
          </div>
          <div className="bottom-sheet-section">
            <h4>Score</h4>
            <div className="bottom-sheet-score-options">
              {scoreOptions.map(score => {
                const { text, class: scoreClass } = getScoreInfo(score);
                return (
                  <button
                    key={score}
                    onClick={() => handleScoreChange(score)}
                    className={`bottom-sheet-score-btn ${scoreClass} ${grossScore === score ? 'selected' : ''}`}
                    style={grossScore === score ? { borderColor: teamColor, background: `${teamColor}22` } : {}}
                  >
                    {text}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="bottom-sheet-section">
            <h4>Junk</h4>
            <div className="bottom-sheet-junk-options">
              <label>
                <input 
                  type="checkbox" 
                  checked={junkFlags.hadBunkerShot} 
                  onChange={() => handleJunkChange('hadBunkerShot')}
                />
                Sandy
              </label>
              {canHaveGreenie && (
                <label>
                  <input 
                    type="checkbox" 
                    checked={junkFlags.isOnGreenFromTee} 
                    onChange={() => handleJunkChange('isOnGreenFromTee')}
                  />
                  Greenie
                </label>
              )}
              {canHaveLongDrive && (
                <label>
                  <input 
                    type="checkbox" 
                    checked={junkFlags.isLongDrive} 
                    onChange={() => handleJunkChange('isLongDrive')}
                  />
                  Long Drive
                </label>
              )}
              {canHaveThreePutts && (
                <label>
                  <input 
                    type="checkbox" 
                    checked={junkFlags.hadThreePutts} 
                    onChange={() => handleJunkChange('hadThreePutts')}
                  />
                  Three Putts
                </label>
              )}
            </div>
          </div>
        </div>
        {/* Fixed Footer with Done Button */}
        <div className="bottom-sheet-footer">
          <button
            className="bottom-sheet-done-btn"
            onClick={onClose}
            style={{ background: teamColor }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}; 
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
  
  // Generate score options around par
  const scoreOptions = Array.from({ length: par * 2 }, (_, i) => i + 1);
  
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
    <div
      data-testid="bottom-sheet"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        maxHeight: '75vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
        borderTopLeftRadius: '12px',
        borderTopRightRadius: '12px',
        zIndex: 1000,
        paddingBottom: `calc(${footerHeight}px + env(safe-area-inset-bottom, 0px))`, // Add safe area inset
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px',
        borderBottom: '1px solid #eee',
        position: 'sticky',
        top: 0,
        backgroundColor: '#fff',
        zIndex: 1,
        borderTopLeftRadius: '12px',
        borderTopRightRadius: '12px'
      }}>
        <h3 style={{ margin: 0, color: teamColor }}>
          {playerName} - Hole {currentHole}
        </h3>
        <button 
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          ×
        </button>
      </div>
      
      {/* Scrollable Content Area */}
      <div style={{ 
        overflowY: 'auto',
        padding: '16px',
        flex: '1 1 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: '15px' }}>
            <span style={{ fontWeight: 'bold', marginRight: 12 }}>Par: {par}</span>
            {strokes > 0 && (
              <span style={{
                backgroundColor: teamColor,
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                borderRadius: '4px',
                padding: '2px 8px',
              }}>
                -{strokes} handicap {strokes === 1 ? 'stroke' : 'strokes'}
              </span>
            )}
          </div>
        </div>
        
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 12 }}>Score</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {scoreOptions.map(score => {
              const { text, class: scoreClass } = getScoreInfo(score);
              return (
                <button
                  key={score}
                  onClick={() => handleScoreChange(score)}
                  style={{
                    border: grossScore === score ? `2px solid ${teamColor}` : '1px solid #ccc',
                    borderRadius: 4,
                    padding: '8px 12px',
                    background: grossScore === score ? `${teamColor}22` : '#fff',
                    cursor: 'pointer',
                    minWidth: 40,
                    textAlign: 'center',
                  }}
                  className={scoreClass}
                >
                  {text}
                </button>
              );
            })}
          </div>
        </div>
        
        <div>
          <h4 style={{ marginBottom: 12 }}>Junk</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="checkbox" 
                checked={junkFlags.hadBunkerShot} 
                onChange={() => handleJunkChange('hadBunkerShot')}
                style={{ marginRight: 8 }}
              />
              Sandy
            </label>
            
            {canHaveGreenie && (
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={junkFlags.isOnGreenFromTee} 
                  onChange={() => handleJunkChange('isOnGreenFromTee')}
                  style={{ marginRight: 8 }}
                />
                Greenie
              </label>
            )}
            
            {canHaveLongDrive && (
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={junkFlags.isLongDrive} 
                  onChange={() => handleJunkChange('isLongDrive')}
                  style={{ marginRight: 8 }}
                />
                Long Drive
              </label>
            )}
            
            {canHaveThreePutts && (
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={junkFlags.hadThreePutts} 
                  onChange={() => handleJunkChange('hadThreePutts')}
                  style={{ marginRight: 8 }}
                />
                Three Putts
              </label>
            )}
          </div>
        </div>
      </div>
      
      {/* Fixed Footer with Done Button */}
      <div style={{ 
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: footerHeight,
        padding: '12px 16px',
        borderTop: '1px solid #eee',
        backgroundColor: '#fff',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
        zIndex: 2,
      }}>
        <button
          onClick={onClose}
          style={{
            background: teamColor,
            color: 'white',
            border: 'none',
            borderRadius: 4,
            padding: '10px 24px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontSize: '16px',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}; 
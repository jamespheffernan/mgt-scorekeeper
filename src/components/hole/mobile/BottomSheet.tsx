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
  const canHaveLongDrive = par >= 4; // Typically only on longer holes
  const canHaveThreePutts = junkFlags.isOnGreenFromTee; // Only if on green from tee
  
  return (
    <div
      data-testid="bottom-sheet"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        maxHeight: '55vh',
        overflowY: 'auto',
        background: '#fff',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
        borderTopLeftRadius: '12px',
        borderTopRightRadius: '12px',
        padding: '16px',
        zIndex: 1000,
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid #eee'
      }}>
        <h3 style={{ margin: 0, color: teamColor }}>
          <span style={{ 
            width: 12, 
            height: 12, 
            borderRadius: '50%', 
            backgroundColor: teamColor,
            display: 'inline-block',
            marginRight: 8
          }}></span>
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
            Bunker Shot (Sandy)
          </label>
          
          {canHaveGreenie && (
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="checkbox" 
                checked={junkFlags.isOnGreenFromTee} 
                onChange={() => handleJunkChange('isOnGreenFromTee')}
                style={{ marginRight: 8 }}
              />
              On Green from Tee (Greenie)
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
          
          {/* Show note about context-specific junk options only if some are hidden */}
          {(!canHaveGreenie || !canHaveLongDrive || 
            (!canHaveThreePutts && junkFlags.isOnGreenFromTee === false)) && (
            <div style={{ 
              fontSize: '13px', 
              color: '#666', 
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px'
            }}>
              Note: Some junk options are only available in specific contexts:
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                {!canHaveGreenie && <li>Greenies only available on par 3 holes</li>}
                {!canHaveLongDrive && <li>Long drive only available on par 4+ holes</li>}
                {!canHaveThreePutts && junkFlags.isOnGreenFromTee === false && <li>Three putts requires green from tee</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
      
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onClose}
          style={{
            background: teamColor,
            color: 'white',
            border: 'none',
            borderRadius: 4,
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}; 
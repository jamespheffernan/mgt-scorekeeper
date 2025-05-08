import React, { useState } from 'react';
import { JunkFlags } from '../../../store/gameStore';

interface BottomSheetProps {
  playerName: string;
  playerIndex: number;
  team: 'Red' | 'Blue';
  currentHole: number;
  par: number;
  initialScore: number;
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
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={junkFlags.isOnGreenFromTee} 
              onChange={() => handleJunkChange('isOnGreenFromTee')}
              style={{ marginRight: 8 }}
            />
            On Green from Tee (Greenie)
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={junkFlags.isClosestOnGreen} 
              onChange={() => handleJunkChange('isClosestOnGreen')}
              style={{ marginRight: 8 }}
            />
            Closest to Pin
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={junkFlags.isLongDrive} 
              onChange={() => handleJunkChange('isLongDrive')}
              style={{ marginRight: 8 }}
            />
            Long Drive
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={junkFlags.hadThreePutts} 
              onChange={() => handleJunkChange('hadThreePutts')}
              style={{ marginRight: 8 }}
            />
            Three Putts
          </label>
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
import React, { useState } from 'react';
import { useGameStore, JunkFlags } from '../../../store/gameStore';
import { BottomSheet } from './BottomSheet';

interface PlayerCardProps {
  name: string;
  team: 'Red' | 'Blue';
  playerIndex: number;
  holeNumber: number;
  par: number;
  grossScore: number;
  strokes: number;
  yardage?: number;
  onEdit: () => void;
}

interface PlayersFourBoxProps {
  onScoreChange: (playerIndex: number, score: number) => void;
  onJunkChange: (playerIndex: number, junk: JunkFlags) => void;
  playerPars: number[];
  playerYardages: number[];
  playerStrokeIndexes: number[];
  playerStrokes: number[];
}

const PlayerCard: React.FC<PlayerCardProps> = ({ 
  name, 
  team, 
  par, 
  grossScore,
  strokes,
  yardage,
  onEdit
}) => {
  const teamColor = team === 'Red' ? '#e74c3c' : '#3498db';
  
  return (
    <div
      data-testid="player-card"
      onClick={onEdit}
      style={{
        border: '1px solid #ccc',
        borderLeft: `4px solid ${teamColor}`,
        borderRadius: 8,
        padding: 12,
        height: '100%',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: '16px' }}>{name}</strong>
        <span style={{ 
          width: 12, 
          height: 12, 
          borderRadius: '50%', 
          backgroundColor: teamColor,
          display: 'inline-block'
        }}></span>
      </div>
      <div style={{ fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ marginRight: 8 }}>⭐ Par {par}</span>
        {strokes > 0 && (
          <span style={{ 
            backgroundColor: teamColor,
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRadius: '4px',
            padding: '1px 6px'
          }}>-{strokes}</span>
        )}
      </div>
      {yardage && yardage > 0 && (
        <div style={{ fontSize: '13px', color: '#718096', marginTop: 2 }}>
          <span>{yardage} yds</span>
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <span style={{ fontWeight: 'bold' }}>gross {grossScore}</span>
        <span style={{ marginLeft: 8, color: '#666' }}>▾</span>
      </div>
    </div>
  );
};

export const PlayersFourBox: React.FC<PlayersFourBoxProps> = ({ 
  onScoreChange, 
  onJunkChange,
  playerPars,
  playerYardages,
  playerStrokeIndexes,
  playerStrokes
}) => {
  const players = useGameStore(state => state.players);
  const playerTeams = useGameStore(state => state.playerTeams);
  const currentHole = useGameStore(state => state.match.currentHole);
  const holePar = useGameStore(state => state.match.holePar);
  
  // Get the gross scores for the current hole if available
  const holeScores = useGameStore(state => state.holeScores);
  const currentHoleScore = holeScores.find(score => score.hole === currentHole);
  
  // Local UI state
  const [activePlayerIndex, setActivePlayerIndex] = useState<number | null>(null);
  // Track updated scores locally for immediate UI update
  const [localScores, setLocalScores] = useState<Record<number, number>>({});

  const handleCardClick = (index: number) => {
    setActivePlayerIndex(index);
  };

  const handleScoreChange = (score: number) => {
    if (activePlayerIndex !== null) {
      // Update the local score state for immediate feedback
      setLocalScores({
        ...localScores,
        [activePlayerIndex]: score
      });
      onScoreChange(activePlayerIndex, score);
    }
  };
  
  const handleJunkChange = (junkFlags: JunkFlags) => {
    if (activePlayerIndex !== null) {
      onJunkChange(activePlayerIndex, junkFlags);
    }
  };

  const closeSheet = () => setActivePlayerIndex(null);

  // Group players by team
  const redPlayerIndices: number[] = [];
  const bluePlayerIndices: number[] = [];
  
  // Find players by team
  playerTeams.forEach((team, index) => {
    if (index < 4) { // Only process the first 4 players
      if (team === 'Red') {
        redPlayerIndices.push(index);
      } else if (team === 'Blue') {
        bluePlayerIndices.push(index);
      }
    }
  });
  
  // Get the current score for a player, prioritizing local updates
  const getPlayerScore = (playerIndex: number): number => {
    // First check if there's a local update
    if (localScores[playerIndex] !== undefined) {
      return localScores[playerIndex];
    }
    
    // Then check if there's a submitted score from the store
    if (currentHoleScore && currentHoleScore.gross[playerIndex] !== undefined) {
      return currentHoleScore.gross[playerIndex];
    }
    
    // Fall back to par
    return playerPars[playerIndex] || holePar[currentHole - 1] || 4;
  };
  
  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: 8,
        padding: '0 4px'
      }}>
        <div style={{ 
          color: '#e74c3c', 
          fontWeight: 'bold', 
          fontSize: '15px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ 
            width: 10, 
            height: 10, 
            borderRadius: '50%', 
            backgroundColor: '#e74c3c',
            display: 'inline-block',
            marginRight: 6
          }}></span>
          RED TEAM
        </div>
        <div style={{ 
          color: '#3498db', 
          fontWeight: 'bold', 
          fontSize: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end'
        }}>
          BLUE TEAM
          <span style={{ 
            width: 10, 
            height: 10, 
            borderRadius: '50%', 
            backgroundColor: '#3498db',
            display: 'inline-block',
            marginLeft: 6
          }}></span>
        </div>
      </div>
      <div
        data-testid="players-grid"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: 8,
          margin: '0 -4px', // Compensate for small screens
        }}
      >
        {/* Create pairs of players (one red, one blue) for each row */}
        {redPlayerIndices.map((redIndex, i) => {
          const redPlayerIndex = redIndex;
          const bluePlayerIndex = bluePlayerIndices[i] !== undefined ? bluePlayerIndices[i] : -1;
          
          return (
            <React.Fragment key={`row-${i}`}>
              {/* Red player card */}
              {redPlayerIndex !== -1 && (
                <PlayerCard
                  key={players[redPlayerIndex].id || redPlayerIndex}
                  name={players[redPlayerIndex].name}
                  team={playerTeams[redPlayerIndex] as 'Red' | 'Blue'}
                  playerIndex={redPlayerIndex}
                  holeNumber={currentHole}
                  par={playerPars[redPlayerIndex] || holePar[currentHole - 1] || 4}
                  grossScore={getPlayerScore(redPlayerIndex)}
                  strokes={playerStrokes[redPlayerIndex] || 0}
                  yardage={playerYardages[redPlayerIndex] || 0}
                  onEdit={() => handleCardClick(redPlayerIndex)}
                />
              )}
              
              {/* Blue player card */}
              {bluePlayerIndex !== -1 && (
                <PlayerCard
                  key={players[bluePlayerIndex].id || bluePlayerIndex}
                  name={players[bluePlayerIndex].name}
                  team={playerTeams[bluePlayerIndex] as 'Red' | 'Blue'}
                  playerIndex={bluePlayerIndex}
                  holeNumber={currentHole}
                  par={playerPars[bluePlayerIndex] || holePar[currentHole - 1] || 4}
                  grossScore={getPlayerScore(bluePlayerIndex)}
                  strokes={playerStrokes[bluePlayerIndex] || 0}
                  yardage={playerYardages[bluePlayerIndex] || 0}
                  onEdit={() => handleCardClick(bluePlayerIndex)}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {activePlayerIndex !== null && (
        <BottomSheet
          playerName={players[activePlayerIndex].name}
          playerIndex={activePlayerIndex}
          team={playerTeams[activePlayerIndex] as 'Red' | 'Blue'}
          currentHole={currentHole}
          par={playerPars[activePlayerIndex] || holePar[currentHole - 1] || 4}
          initialScore={getPlayerScore(activePlayerIndex)}
          strokes={playerStrokes[activePlayerIndex] || 0}
          onScoreChange={handleScoreChange}
          onJunkChange={handleJunkChange}
          onClose={closeSheet}
        />
      )}
    </div>
  );
};

export default PlayersFourBox; 
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
  onEdit: () => void;
}

interface PlayersFourBoxProps {
  onScoreChange: (playerIndex: number, score: number) => void;
  onJunkChange: (playerIndex: number, junk: JunkFlags) => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ 
  name, 
  team, 
  par, 
  grossScore,
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
      <div style={{ fontSize: '15px' }}>
        <span style={{ marginRight: 8 }}>⭐ Par {par}</span>
      </div>
      <div style={{ marginTop: 4 }}>
        <span style={{ fontWeight: 'bold' }}>gross {grossScore}</span>
        <span style={{ marginLeft: 8, color: '#666' }}>▾</span>
      </div>
    </div>
  );
};

export const PlayersFourBox: React.FC<PlayersFourBoxProps> = ({ onScoreChange, onJunkChange }) => {
  const players = useGameStore(state => state.players);
  const playerTeams = useGameStore(state => state.playerTeams);
  const currentHole = useGameStore(state => state.match.currentHole);
  const holePar = useGameStore(state => state.match.holePar);
  
  // Get the gross scores for the current hole if available
  const holeScores = useGameStore(state => state.holeScores);
  const currentHoleScore = holeScores.find(score => score.hole === currentHole);
  
  // Local UI state
  const [activePlayerIndex, setActivePlayerIndex] = useState<number | null>(null);

  const handleCardClick = (index: number) => {
    setActivePlayerIndex(index);
  };

  const handleScoreChange = (score: number) => {
    if (activePlayerIndex !== null) {
      onScoreChange(activePlayerIndex, score);
    }
  };
  
  const handleJunkChange = (junkFlags: JunkFlags) => {
    if (activePlayerIndex !== null) {
      onJunkChange(activePlayerIndex, junkFlags);
    }
  };

  const closeSheet = () => setActivePlayerIndex(null);

  return (
    <div>
      <div
        data-testid="players-grid"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: 8,
          margin: '0 -4px', // Compensate for small screens
        }}
      >
        {players.slice(0, 4).map((player, i) => {
          // Get the gross score for this player if available
          const grossScore = currentHoleScore 
            ? currentHoleScore.gross[i] 
            : holePar[currentHole - 1] || 4; // Default to par
          
          return (
            <PlayerCard
              key={player.id || i}
              name={player.name}
              team={playerTeams[i] as 'Red' | 'Blue'}
              playerIndex={i}
              holeNumber={currentHole}
              par={holePar[currentHole - 1] || 4}
              grossScore={grossScore}
              onEdit={() => handleCardClick(i)}
            />
          );
        })}
      </div>
      {activePlayerIndex !== null && (
        <BottomSheet
          playerName={players[activePlayerIndex].name}
          playerIndex={activePlayerIndex}
          team={playerTeams[activePlayerIndex] as 'Red' | 'Blue'}
          currentHole={currentHole}
          par={holePar[currentHole - 1] || 4}
          initialScore={currentHoleScore?.gross[activePlayerIndex] || holePar[currentHole - 1] || 4}
          onScoreChange={handleScoreChange}
          onJunkChange={handleJunkChange}
          onClose={closeSheet}
        />
      )}
    </div>
  );
};

export default PlayersFourBox; 
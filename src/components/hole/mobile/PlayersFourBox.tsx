import React, { useState, useEffect } from 'react';
import { useGameStore, JunkFlags, Player as PlayerType, Team } from '../../../store/gameStore';
import { BottomSheet } from './BottomSheet';
import { PlayerCard } from '../../PlayerCard';
import { colors } from '../../../theme/tokens';
import { formatPlayerName } from '../../../utils/nameFormatter';
import './PlayersFourBox.css';

interface InternalPlayerDisplayCardProps {
  player: PlayerType;
  team: Team;
  par: number;
  grossScore: number;
  strokes: number;
  strokeIndex: number;
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

const PlayerCardDisplay: React.FC<InternalPlayerDisplayCardProps> = ({ 
  player, 
  team, 
  par, 
  grossScore,
  strokes,
  strokeIndex,
  yardage,
  onEdit
}) => {
  const teamColor = team === 'Red' ? colors.red : colors.blue;
  
  return (
    <div onClick={onEdit} className="player-card-clickable-wrapper">
      <PlayerCard 
        player={player} 
        teamColor={teamColor}
        nameRow={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {strokes > 0 && (
              <span style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: teamColor,
                marginRight: 8,
                verticalAlign: 'middle',
              }} />
            )}
            <span style={{ fontWeight: 600 }}>{player.name}</span>
          </div>
        }
      >
        <div>{/* Empty div for grid balance or future use */}</div>
        <div className="player-card-score-text">
          <span className="oooh-baby-regular">Gross {grossScore}</span>
          {strokes > 0 && (
            <>
              {' / '}
              <span className="oooh-baby-regular" style={{ fontStyle: 'italic', fontWeight: 700 }}>Net {grossScore - strokes}</span>
            </>
          )}
        </div>
      </PlayerCard>
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
  const storePlayers = useGameStore(state => state.players);
  const playerTeams = useGameStore(state => state.playerTeams);
  const currentHole = useGameStore(state => state.match.currentHole);
  const holePar = useGameStore(state => state.match.holePar);
  const holeScores = useGameStore(state => state.holeScores);
  const currentHoleScore = holeScores.find(score => score.hole === currentHole);
  
  const [activePlayerIndex, setActivePlayerIndex] = useState<number | null>(null);
  const [localScores, setLocalScores] = useState<Record<number, number>>({});

  useEffect(() => {
    setLocalScores({});
  }, [currentHole]);

  const handleCardClick = (index: number) => {
    setActivePlayerIndex(index);
  };

  const handleScoreChange = (score: number) => {
    if (activePlayerIndex !== null) {
      setLocalScores(prev => ({ ...prev, [activePlayerIndex]: score }));
      onScoreChange(activePlayerIndex, score);
    }
  };
  
  const handleJunkChange = (junkFlags: JunkFlags) => {
    if (activePlayerIndex !== null) {
      onJunkChange(activePlayerIndex, junkFlags);
    }
  };

  const closeSheet = () => setActivePlayerIndex(null);

  const getPlayerScore = (playerIndex: number): number => {
    if (localScores[playerIndex] !== undefined) return localScores[playerIndex];
    if (currentHoleScore && currentHoleScore.gross[playerIndex] !== undefined) return currentHoleScore.gross[playerIndex];
    return playerPars[playerIndex] || holePar[currentHole - 1] || 4;
  };
  
  // Split players by team, preserving their original index
  const blue: { player: PlayerType; idx: number }[] = [];
  const red: { player: PlayerType; idx: number }[] = [];
  storePlayers.forEach((player, i) => {
    if (playerTeams[i] === 'Blue') blue.push({ player, idx: i });
    else red.push({ player, idx: i });
  });

  return (
    <div className="players-four-box-root">
      <div className="players-grid">
        {[0, 1].map(row => (
          <React.Fragment key={row}>
            {/* Red team cell (now left) */}
            <div>
              {red[row] ? (
                <PlayerCardDisplay
                  player={red[row].player}
                  team={playerTeams[red[row].idx] as Team}
                  par={playerPars[red[row].idx]}
                  grossScore={getPlayerScore(red[row].idx)}
                  strokes={playerStrokes[red[row].idx]}
                  strokeIndex={playerStrokeIndexes[red[row].idx]}
                  yardage={playerYardages[red[row].idx]}
                  onEdit={() => handleCardClick(red[row].idx)}
                />
              ) : (
                <div className="team-placeholder-box team-placeholder-red">Red</div>
              )}
            </div>
            {/* Blue team cell (now right) */}
            <div>
              {blue[row] ? (
                <PlayerCardDisplay
                  player={blue[row].player}
                  team={playerTeams[blue[row].idx] as Team}
                  par={playerPars[blue[row].idx]}
                  grossScore={getPlayerScore(blue[row].idx)}
                  strokes={playerStrokes[blue[row].idx]}
                  strokeIndex={playerStrokeIndexes[blue[row].idx]}
                  yardage={playerYardages[blue[row].idx]}
                  onEdit={() => handleCardClick(blue[row].idx)}
                />
              ) : (
                <div className="team-placeholder-box team-placeholder-blue">Blue</div>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>

      {activePlayerIndex !== null && storePlayers[activePlayerIndex] && (
        <BottomSheet 
          onClose={closeSheet}
          playerName={formatPlayerName(storePlayers[activePlayerIndex])}
          playerIndex={activePlayerIndex}
          team={playerTeams[activePlayerIndex] as Team}
          currentHole={currentHole}
          par={playerPars[activePlayerIndex]}
          initialScore={getPlayerScore(activePlayerIndex)}
          strokes={playerStrokes[activePlayerIndex]}
          onScoreChange={handleScoreChange} 
          onJunkChange={handleJunkChange} 
        />
      )}
    </div>
  );
};

export default PlayersFourBox; 
import React, { useState, useEffect } from 'react';
import { useGameStore, JunkFlags, Player as PlayerType, Team } from '../../../store/gameStore';
import { BottomSheet } from './BottomSheet';
import { PlayerCard } from '../../PlayerCard';
import { colors } from '../../../theme/tokens';
import { formatPlayerName } from '../../../utils/nameFormatter';
import { GhostRevealModal } from './GhostRevealModal';
import './PlayersFourBox.css';

interface InternalPlayerDisplayCardProps {
  player: PlayerType;
  team: Team;
  par: number;
  grossScore: number;
  strokes: number; // Millbrook strokes
  bigGameStrokeOnHole: number; // New: Big Game strokes for this player on this hole
  strokeIndex: number;
  yardage?: number;
  onEdit: () => void;
  onGhostReveal?: (player: PlayerType, grossScore: number, par: number, yardage?: number) => void;
}

interface PlayersFourBoxProps {
  onScoreChange: (playerIndex: number, score: number) => void;
  onJunkChange: (playerIndex: number, junk: JunkFlags) => void;
  playerPars: number[];
  playerYardages: number[];
  playerStrokeIndexes: number[];
  playerStrokes: number[]; // Millbrook strokes for current hole for all players
  bigGameStrokesOnHole?: number[]; // New: Big Game strokes for current hole for all players
}

const PlayerCardDisplay: React.FC<InternalPlayerDisplayCardProps> = ({ 
  player, 
  team, 
  par, 
  grossScore,
  strokes, // Millbrook strokes
  bigGameStrokeOnHole, // Big Game stroke
  strokeIndex,
  yardage,
  onEdit,
  onGhostReveal
}) => {
  const teamColor = team === 'Red' ? colors.red : colors.blue;
  const isGhost = !!player.isGhost;
  
  // Ghost reveal functionality
  const { revealGhostScore, isGhostScoreRevealed } = useGameStore();
  const currentHole = useGameStore(state => state.match.currentHole);
  const isScoreRevealed = isGhost ? isGhostScoreRevealed(player.id, currentHole) : true;
  
  const [isRevealing, setIsRevealing] = useState(false);
  
  const handleRevealClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onEdit
    if (isGhost && !isScoreRevealed && onGhostReveal) {
      setIsRevealing(true);
      revealGhostScore(player.id, currentHole);
      onGhostReveal(player, grossScore, par, yardage);
      // Animation duration
      setTimeout(() => setIsRevealing(false), 500);
    }
  };
  
  const getScoreDisplay = () => {
    if (!isGhost || isScoreRevealed) {
      return (
        <>
          Gross {grossScore}
          {(strokes > 0 || bigGameStrokeOnHole > 0) && (
            <>
              {' / '}
              <span style={{ fontStyle: 'italic', fontWeight: 700 }}>Net {grossScore - strokes}</span> 
            </>
          )}
        </>
      );
    }
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#666' }}>Score: ?</span>
        <button
          onClick={handleRevealClick}
          style={{
            background: 'linear-gradient(45deg, #8B5CF6, #06B6D4)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
          }}
          aria-label={`Reveal ghost score for ${player.name} on hole ${currentHole}`}
        >
          👁️ Reveal
        </button>
      </div>
    );
  };
  
  return (
    <div onClick={isGhost && !isScoreRevealed ? undefined : onEdit} className="player-card-clickable-wrapper">
      <PlayerCard 
        player={player} 
        teamColor={teamColor}
        nameRow={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Millbrook Stroke Dot (Team Color) */}
            {strokes > 0 && (
              <span style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: teamColor,
                marginRight: bigGameStrokeOnHole > 0 ? 4 : 8, // Adjust margin if Big Game dot also present
                verticalAlign: 'middle',
              }} title={`Millbrook Strokes: ${strokes}`} />
            )}
            {/* Big Game Stroke Dot (Dark Green) */}
            {bigGameStrokeOnHole > 0 && (
              <span style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'darkgreen',
                marginRight: 8,
                verticalAlign: 'middle',
              }} title={`Big Game Strokes: ${bigGameStrokeOnHole}`} />
            )}
            <span
              style={{ fontWeight: 600, opacity: isGhost ? 0.7 : 1, fontStyle: isGhost ? 'italic' : 'normal' }}
              aria-label={isGhost ? `Ghost player: Synthetic player generated from ${player.name}` : player.name}
              title={isGhost ? `Ghost player: Synthetic player generated from ${player.name}` : player.name}
            >
              {isGhost && <span role="img" aria-label="Ghost" style={{ marginRight: 4 }}>👻</span>}
              {player.name}
            </span>
          </div>
        }
      >
        <div>{/* Empty div for grid balance or future use */}</div>
        <div 
          className="player-card-score-text"
          style={{
            opacity: isRevealing ? 0 : 1,
            transform: isRevealing ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.5s ease'
          }}
        >
          {getScoreDisplay()}
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
  playerStrokes, // Millbrook strokes
  bigGameStrokesOnHole // Big Game strokes
}) => {
  const storePlayers = useGameStore(state => state.players);
  const playerTeams = useGameStore(state => state.playerTeams);
  const currentHole = useGameStore(state => state.match.currentHole);
  const holePar = useGameStore(state => state.match.holePar);
  const holeScores = useGameStore(state => state.holeScores);
  const ghostJunkEvents = useGameStore(state => state.ghostJunkEvents);
  const currentHoleScore = holeScores.find(score => score.hole === currentHole);
  
  const [activePlayerIndex, setActivePlayerIndex] = useState<number | null>(null);
  const [localScores, setLocalScores] = useState<Record<number, number>>({});
  const [ghostRevealModal, setGhostRevealModal] = useState<{
    isOpen: boolean;
    player?: PlayerType;
    grossScore?: number;
    par?: number;
    yardage?: number;
  }>({ isOpen: false });

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

  const handleGhostReveal = (player: PlayerType, grossScore: number, par: number, yardage?: number) => {
    setGhostRevealModal({
      isOpen: true,
      player,
      grossScore,
      par,
      yardage
    });
  };

  const closeGhostModal = () => {
    setGhostRevealModal({ isOpen: false });
  };

  const getPlayerScore = (playerIndex: number): number => {
    if (localScores[playerIndex] !== undefined) return localScores[playerIndex];
    if (currentHoleScore && currentHoleScore.gross[playerIndex] !== undefined) {
      const grossScore = currentHoleScore.gross[playerIndex];
      // For real players, if gross score is 0 (no score entered yet), show par instead
      // Ghost players can have 0 as a valid generated score, so we don't override for them
      const player = storePlayers[playerIndex];
      if (!player?.isGhost && grossScore === 0) {
        return playerPars[playerIndex] || holePar[currentHole - 1] || 4;
      }
      return grossScore;
    }
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
                  strokes={playerStrokes[red[row].idx]} // Millbrook
                  bigGameStrokeOnHole={bigGameStrokesOnHole ? bigGameStrokesOnHole[red[row].idx] : 0} // Big Game
                  strokeIndex={playerStrokeIndexes[red[row].idx]}
                  yardage={playerYardages[red[row].idx]}
                  onEdit={() => handleCardClick(red[row].idx)}
                  onGhostReveal={handleGhostReveal}
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
                  strokes={playerStrokes[blue[row].idx]} // Millbrook
                  bigGameStrokeOnHole={bigGameStrokesOnHole ? bigGameStrokesOnHole[blue[row].idx] : 0} // Big Game
                  strokeIndex={playerStrokeIndexes[blue[row].idx]}
                  yardage={playerYardages[blue[row].idx]}
                  onEdit={() => handleCardClick(blue[row].idx)}
                  onGhostReveal={handleGhostReveal}
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
          strokes={playerStrokes[activePlayerIndex]} // Millbrook strokes for BottomSheet context
          // If BottomSheet needs Big Game strokes, add another prop here
          onScoreChange={handleScoreChange} 
          onJunkChange={handleJunkChange} 
        />
      )}

      {ghostRevealModal.isOpen && ghostRevealModal.player && (
        <GhostRevealModal
          isOpen={ghostRevealModal.isOpen}
          onClose={closeGhostModal}
          player={ghostRevealModal.player}
          grossScore={ghostRevealModal.grossScore!}
          par={ghostRevealModal.par!}
          hole={currentHole}
          junkFlags={ghostJunkEvents[ghostRevealModal.player.id]?.[currentHole]}
          yardage={ghostRevealModal.yardage}
        />
      )}
    </div>
  );
};

export default PlayersFourBox; 
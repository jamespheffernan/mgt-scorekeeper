import React from 'react';
// import { grid } from '../theme/tokens'; // Assuming 'grid' token isn't directly used for class names now
import { formatPlayerName, toTitleCase } from '../utils/nameFormatter';
import { Player } from '../db/API-GameState';
import './PlayerCard.css';

interface PlayerCardProps {
  teamColor: string;
  player: Player;
  children: React.ReactNode;
  className?: string;
  nameRow?: React.ReactNode;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ 
  teamColor, 
  player,
  children,
  className = '',
  nameRow
}) => {
  const isGhost = !!player.isGhost;
  return (
    <div 
      className={`player-card-root${isGhost ? ' ghost-player-card' : ''} ${className}`}
      aria-label={isGhost ? `Ghost player: Synthetic player generated from ${player.name || player.first}` : undefined}
      tabIndex={0}
    >
      <aside className="player-card-team-indicator" 
             style={{ '--team-color': teamColor } as React.CSSProperties} />
      
      <div className="player-card-content-wrapper">
        {nameRow ? (
          <div className="player-card-name" style={{ color: teamColor }}>
            {isGhost && (
              <span 
                role="img" 
                aria-label="Ghost player" 
                title={`Synthetic player generated from ${player.name || player.first}`}
                style={{ marginRight: 6, opacity: 0.7 }}
              >
                👻
              </span>
            )}
            {nameRow}
          </div>
        ) : (
          <h3 className="player-card-name" style={{ color: teamColor }}>
            {isGhost && (
              <span 
                role="img" 
                aria-label="Ghost player" 
                title={`Synthetic player generated from ${player.name || player.first}`}
                style={{ marginRight: 6, opacity: 0.7 }}
              >
                👻
              </span>
            )}
            {toTitleCase(formatPlayerName(player))}
          </h3>
        )}
        <div className="player-card-children-grid">
          {children}
        </div>
      </div>
    </div>
  );
}; 
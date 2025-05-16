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
  return (
    <div className={`player-card-root ${className}`}>
      <aside className="player-card-team-indicator" 
             style={{ '--team-color': teamColor } as React.CSSProperties} />
      
      <div className="player-card-content-wrapper">
        {nameRow ? (
          <div className="player-card-name" style={{ color: teamColor }}>{nameRow}</div>
        ) : (
          <h3 className="player-card-name" style={{ color: teamColor }}>
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
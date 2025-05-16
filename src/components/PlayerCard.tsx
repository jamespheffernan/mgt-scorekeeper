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
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ 
  teamColor, 
  player,
  children,
  className = ''
}) => {
  return (
    <div className={`player-card-root ${className}`}>
      <aside className="player-card-team-indicator" 
             style={{ '--team-color': teamColor } as React.CSSProperties} />
      
      <div className="player-card-content-wrapper">
        <h3 className="player-card-name" style={{ color: teamColor }}>
          {toTitleCase(formatPlayerName(player))}
        </h3>
        <div className="player-card-children-grid">
          {children}
        </div>
      </div>
    </div>
  );
}; 
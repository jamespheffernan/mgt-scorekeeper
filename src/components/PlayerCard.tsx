import React from 'react';
import { grid } from '../theme/tokens';

interface PlayerCardProps {
  teamColor: string;
  playerName: string;
  children: React.ReactNode;
  className?: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ 
  teamColor, 
  playerName, 
  children,
  className = ''
}) => {
  return (
    <div className={`relative bg-white rounded-lg shadow-sm p-3 mb-3 ${className}`}>
      <aside className="absolute inset-y-0 left-0 w-1 rounded-l bg-[var(--team-color)]" 
             style={{ '--team-color': teamColor } as React.CSSProperties} />
      
      <div className="pl-2">
        <h3 className="text-base font-medium mb-1">{playerName}</h3>
        <div className="grid grid-cols-2 gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}; 
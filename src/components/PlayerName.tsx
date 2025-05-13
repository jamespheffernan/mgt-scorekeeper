import React from 'react';
import { Player } from '../db/API-GameState';
import { getFullName } from '../utils/nameUtils';

interface PlayerNameProps {
  player: Player | any;
  className?: string;
}

/**
 * A standardized component for displaying player names
 * Handles the transition from using name to first/last
 */
export const PlayerName: React.FC<PlayerNameProps> = ({ player, className }) => {
  const fullName = getFullName(player);
  return <span className={className}>{fullName}</span>;
}

export default PlayerName; 
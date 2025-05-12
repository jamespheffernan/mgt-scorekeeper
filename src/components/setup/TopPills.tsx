import React, { useEffect } from 'react';
import { useRosterStore } from '../../store/rosterStore';
import { millbrookDb } from '../../db/millbrookDb';
import { Player } from '../../db/API-GameState';
import { MatchRoster } from '../../types/player';
import './PlayersRoster.css';

interface TeamPillProps {
  teamName: 'red' | 'blue';
  playerCount: number;
  players: Player[];
  onClick: () => void;
}

const TeamPill: React.FC<TeamPillProps> = ({ 
  teamName, 
  playerCount, 
  players,
  onClick
}) => {
  // Determine max 3 players to show avatars for
  const displayPlayers = players.slice(0, 3);
  
  // Get initials from player name
  const getInitials = (player: Player): string => {
    // If first/last are available in the extended Player type, use them
    if ('first' in player && 'last' in player) {
      return `${(player as any).first.charAt(0)}${(player as any).last.charAt(0)}`;
    }
    
    // Otherwise, use the existing name field
    const nameParts = player.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`;
    }
    return player.name.substring(0, 2).toUpperCase();
  };
  
  // State to track count changes for animation
  const [prevCount, setPrevCount] = React.useState(playerCount);
  const [animate, setAnimate] = React.useState(false);
  
  // Add animation when count changes
  useEffect(() => {
    if (prevCount !== playerCount && prevCount !== 0) {
      setAnimate(true);
      setTimeout(() => setAnimate(false), 300);
    }
    setPrevCount(playerCount);
  }, [playerCount, prevCount]);
  
  return (
    <button 
      className={`team-pill ${teamName} ${animate ? 'pulse-animation' : ''}`}
      onClick={onClick}
    >
      <div className="avatar-stack">
        {displayPlayers.map((player, index) => (
          <div 
            key={player.id} 
            className="avatar-circle"
          >
            {getInitials(player)}
          </div>
        ))}
      </div>
      <span>{playerCount}</span>
    </button>
  );
};

interface TopPillsProps {
  onOpenSheet: () => void;
}

export const TopPills: React.FC<TopPillsProps> = ({ onOpenSheet }) => {
  const roster = useRosterStore(state => state.roster);
  const [players, setPlayers] = React.useState<Player[]>([]);
  
  // Load players data
  React.useEffect(() => {
    const loadPlayers = async () => {
      try {
        const allPlayers = await millbrookDb.getAllPlayers();
        setPlayers(allPlayers);
      } catch (error) {
        console.error('Failed to load players:', error);
      }
    };
    
    loadPlayers();
  }, [roster]); // Reload when roster changes
  
  // Get players by team
  const getPlayersByTeam = (teamName: 'red' | 'blue'): Player[] => {
    const teamIds = roster[teamName];
    return players.filter(player => teamIds.includes(player.id));
  };
  
  const redPlayers = getPlayersByTeam('red');
  const bluePlayers = getPlayersByTeam('blue');
  
  return (
    <div className="top-pills">
      <TeamPill 
        teamName="red" 
        playerCount={roster.red.length} 
        players={redPlayers} 
        onClick={onOpenSheet} 
      />
      <TeamPill 
        teamName="blue" 
        playerCount={roster.blue.length} 
        players={bluePlayers} 
        onClick={onOpenSheet} 
      />
    </div>
  );
}; 
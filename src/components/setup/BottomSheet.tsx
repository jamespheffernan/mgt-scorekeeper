import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { millbrookDb } from '../../db/millbrookDb';
import { useRosterStore } from '../../store/rosterStore';
import { Player } from '../../db/API-GameState';
import { Team } from '../../types/player';
import './PlayersRoster.css';

interface PlayerRowProps {
  player: Player;
  team: Team | null;
  onTeamSelect: (id: string, team: Team) => void;
  onRemove: (id: string) => void;
}

const PlayerRow: React.FC<PlayerRowProps> = ({ player, team, onTeamSelect, onRemove }) => {
  // Get initials as fallback for avatar
  const getInitials = (player: Player): string => {
    if ('first' in player && 'last' in player) {
      return `${(player as any).first.charAt(0)}${(player as any).last.charAt(0)}`;
    }
    
    const nameParts = player.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`;
    }
    return player.name.substring(0, 2).toUpperCase();
  };
  
  // Handle swipe for remove
  const [swipeStart, setSwipeStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setSwipeStart(e.touches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipeStart === null) return;
    const diff = swipeStart - e.touches[0].clientX;
    if (diff > 0) { // Only allow swipe left
      setSwipeOffset(Math.min(diff, 100));
    }
  };
  
  const handleTouchEnd = () => {
    if (swipeOffset > 80) { // Threshold to trigger remove
      onRemove(player.id);
      // Haptic feedback on successful swipe
      if (navigator.vibrate) navigator.vibrate(10);
    }
    setSwipeOffset(0);
    setSwipeStart(null);
  };
  
  const handleRemoveClick = () => {
    onRemove(player.id);
    if (navigator.vibrate) navigator.vibrate(10);
  };
  
  return (
    <div 
      className="player-row"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform: `translateX(-${swipeOffset}px)` }}
    >
      {/* Delete action revealed on swipe */}
      <div 
        className="absolute right-0 top-0 bottom-0 bg-red-500 text-white flex items-center px-4"
        style={{ transform: `translateX(${100-swipeOffset}%)` }}
      >
      </div>
      
      <div className="player-info">
        <div className="player-initials">
          {getInitials(player)}
        </div>
        <div>
          <span>{player.name}</span>
          {player.index ? <span className="text-sm text-gray-500 ml-2">({player.index})</span> : null}
        </div>
      </div>
      
      <div className="player-actions">
        {/* Team selection radio buttons */}
        <div className="team-selection" role="radiogroup" aria-label="Team selection">
          <button
            role="radio"
            aria-checked={team === 'red'}
            className={`team-radio red ${team === 'red' ? 'selected' : ''}`}
            onClick={() => {
              onTeamSelect(player.id, 'red');
              if (navigator.vibrate) navigator.vibrate(10);
            }}
          >
            Red
          </button>
          
          <button
            role="radio"
            aria-checked={team === 'blue'}
            className={`team-radio blue ${team === 'blue' ? 'selected' : ''}`}
            onClick={() => {
              onTeamSelect(player.id, 'blue');
              if (navigator.vibrate) navigator.vibrate(10);
            }}
          >
            Blue
          </button>
        </div>
        
        {/* Remove button - always visible */}
        <button 
          className="remove-player-button" 
          onClick={handleRemoveClick}
          aria-label="Remove player from roster"
          title="Remove player from roster"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
};

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ open, onOpenChange }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const roster = useRosterStore(state => state.roster);
  const { setTeam, remove } = useRosterStore();
  
  // Load all players
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setLoading(true);
        const allPlayers = await millbrookDb.getAllPlayers();
        setPlayers(allPlayers);
        setError(null);
      } catch (err) {
        setError('Failed to load players');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    if (open) {
      loadPlayers();
    }
  }, [open]);
  
  // Get team assignment for a player
  const getPlayerTeam = (playerId: string): Team | null => {
    if (roster.red.includes(playerId)) return 'red';
    if (roster.blue.includes(playerId)) return 'blue';
    return null;
  };
  
  // Handle team selection with auto-close on mobile
  const handleTeamSelect = (playerId: string, team: Team) => {
    setTeam(playerId, team);
    
    // Auto-close on mobile after selection
    if (window.innerWidth < 768) {
      // Small delay to show the selection change
      setTimeout(() => onOpenChange(false), 300);
    }
  };
  
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bottom-sheet-overlay" />
        
        <Dialog.Content className="bottom-sheet-content">
          <Dialog.Title className="text-xl font-semibold mb-4">
            Player Roster
          </Dialog.Title>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 py-4">{error}</div>
          ) : players.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-5xl mb-2">🏌️</div>
              <p>No players found. Add players to get started.</p>
            </div>
          ) : (
            <div className="divide-y">
              <div className="font-medium text-sm text-gray-500 pb-2">
                All Players
              </div>
              
              {players.map(player => (
                <PlayerRow 
                  key={player.id}
                  player={player}
                  team={getPlayerTeam(player.id)}
                  onTeamSelect={handleTeamSelect}
                  onRemove={remove}
                />
              ))}
            </div>
          )}
          
          <Dialog.Close asChild>
            <button 
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100" 
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.8536 2.85355C13.0488 2.65829 13.0488 2.34171 12.8536 2.14645C12.6583 1.95118 12.3417 1.95118 12.1464 2.14645L7.5 6.79289L2.85355 2.14645C2.65829 1.95118 2.34171 1.95118 2.14645 2.14645C1.95118 2.34171 1.95118 2.65829 2.14645 2.85355L6.79289 7.5L2.14645 12.1464C1.95118 12.3417 1.95118 12.6583 2.14645 12.8536C2.34171 13.0488 2.65829 13.0488 2.85355 12.8536L7.5 8.20711L12.1464 12.8536C12.3417 13.0488 12.6583 13.0488 12.8536 12.8536C13.0488 12.6583 13.0488 12.3417 12.8536 12.1464L8.20711 7.5L12.8536 2.85355Z" fill="currentColor" />
              </svg>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}; 
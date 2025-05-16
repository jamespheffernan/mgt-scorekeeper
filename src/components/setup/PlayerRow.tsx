import React from 'react';
import { Player } from '../../db/API-GameState'; // Ensure Player type is correctly imported
import { Team } from '../../types/player';
import './PlayersRoster.css'; // Make sure styles are accessible

interface PlayerRowProps {
  player: Player;
  team: Team | null;
  onTeamSelect: (id: string, team: Team) => void;
  onRemove: (id: string) => void;
  onEdit?: (player: Player) => void;
}

// Get initials as fallback for avatar
const getInitials = (player: Player): string => {
  // Use first/last if available and non-empty
  if ('first' in player && player.first && 'last' in player && player.last) {
    return `${player.first.charAt(0)}${player.last.charAt(0)}`;
  }
  // Fallback to using the name field
  const nameParts = player.name ? player.name.split(' ') : [];
  if (nameParts.length >= 2) {
    return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`;
  }
  // Final fallback for single names or missing data
  return player.name ? player.name.substring(0, 2).toUpperCase() : '??';
};

export const PlayerRow: React.FC<PlayerRowProps> = ({ player, team, onTeamSelect, onRemove, onEdit }) => {

  const handleRemoveClick = () => {
    onRemove(player.id);
    // Optional haptic feedback
    if (navigator.vibrate) navigator.vibrate(10);
  };

  return (
    <div className="player-row">
      <div className="player-info">
        <div className="player-initials" title={player.name}>
          {getInitials(player)}
        </div>
        <div>
          <span
            className="player-name"
            style={onEdit ? { cursor: 'pointer' } : {}}
            onClick={onEdit ? () => onEdit(player) : undefined}
            tabIndex={onEdit ? 0 : undefined}
            role={onEdit ? 'button' : undefined}
            aria-label={onEdit ? `Edit ${player.name}` : undefined}
            onKeyPress={onEdit ? (e) => { if (e.key === 'Enter') onEdit(player); } : undefined}
          >
            {player.name}
          </span>
          {/* Display handicap index if available */}
          {player.index !== undefined && player.index !== null && (
             <span className="player-index"> ({player.index})</span>
          )}
        </div>
      </div>

      <div className="player-actions">
        {/* Team selection buttons */}
        <div className="team-selection" role="radiogroup" aria-label={`Team selection for ${player.name}`}>
          <button
            role="radio"
            aria-checked={team === 'red'}
            className={`team-radio red ${team === 'red' ? 'selected' : ''}`}
            onClick={() => onTeamSelect(player.id, 'red')}
            aria-label={`Assign ${player.name} to Red team`}
          >
            Red
          </button>
          <button
            role="radio"
            aria-checked={team === 'blue'}
            className={`team-radio blue ${team === 'blue' ? 'selected' : ''}`}
            onClick={() => onTeamSelect(player.id, 'blue')}
            aria-label={`Assign ${player.name} to Blue team`}
          >
            Blue
          </button>
        </div>

        {/* Remove button */}
        <button
          className="remove-player-button"
          onClick={handleRemoveClick}
          aria-label={`Remove ${player.name} from roster`}
          title={`Remove ${player.name} from roster`}
        >
          {/* Use a simple 'X' icon or an SVG */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}; 
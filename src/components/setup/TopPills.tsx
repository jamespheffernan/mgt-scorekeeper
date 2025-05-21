import React, { useEffect } from 'react';
import { useRosterStore } from '../../store/rosterStore';
import { millbrookDb } from '../../db/millbrookDb';
import { Player } from '../../db/API-GameState';
import './PlayersRoster.css';

interface TeamPillProps {
  teamName: 'red' | 'blue';
  playerCount: number;
  players: Player[];
}

const TeamPill: React.FC<TeamPillProps> = ({
  teamName,
  playerCount,
  players,
}) => {
  const getInitials = (player: Player): string => {
    if ('first' in player && player.first && 'last' in player && player.last) {
      return `${player.first.charAt(0)}${player.last.charAt(0)}`;
    }
    const nameParts = player.name ? player.name.split(' ') : [];
    if (nameParts.length >= 2) {
      return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`;
    }
    return player.name ? player.name.substring(0, 2).toUpperCase() : '??';
  };

  const [prevCount, setPrevCount] = React.useState(playerCount);
  const [animate, setAnimate] = React.useState(false);

  useEffect(() => {
    if (playerCount !== prevCount) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 300);
      return () => clearTimeout(timer);
    }
    setPrevCount(playerCount);
  }, [playerCount, prevCount]);

  const displayPlayers = players.slice(0, 3);

  return (
    <div className={`team-pill ${teamName} ${animate ? 'pulse-animation' : ''}`}>
      <div className="avatar-stack">
        {displayPlayers.map((player) => (
          <div
            key={player.id}
            className={`avatar-circle${player.isGhost ? ' ghost-avatar' : ''}`}
            title={player.isGhost ? `Ghost: Synthetic player generated from ${player.name || player.first}` : player.name}
            aria-label={player.isGhost ? `Ghost player: Synthetic player generated from ${player.name || player.first}` : player.name}
            tabIndex={0}
          >
            {player.isGhost ? (
              <span style={{ marginRight: 2, opacity: 0.7 }} role="img" aria-label="Ghost">👻</span>
            ) : null}
            {getInitials(player)}
          </div>
        ))}
        {players.length > displayPlayers.length && (
          <div className="avatar-circle extra-count">
            +{players.length - displayPlayers.length}
          </div>
        )}
      </div>
      <span className="pill-count">{playerCount}</span>
    </div>
  );
};

export const TopPills: React.FC = () => {
  const roster = useRosterStore(state => state.roster);
  const [rosterPlayers, setRosterPlayers] = React.useState<Player[]>([]);

  React.useEffect(() => {
    const loadRosterPlayerDetails = async () => {
      const allRosterIds = [...roster.red, ...roster.blue];
      if (allRosterIds.length === 0) {
        setRosterPlayers([]);
        return;
      }
      try {
        console.debug("Fetching all players to update pill details.");
        const allPlayers = await millbrookDb.getAllPlayers();
        const playersDetails = allPlayers.filter(p => allRosterIds.includes(p.id));
        setRosterPlayers(playersDetails);
      } catch (error) {
        console.error('Failed to load player details for pills:', error);
        setRosterPlayers([]);
      }
    };

    loadRosterPlayerDetails();
  }, [roster]);

  const getPlayersByTeam = (teamName: 'red' | 'blue'): Player[] => {
    const teamIds = roster[teamName];
    return rosterPlayers.filter(player => teamIds.includes(player.id));
  };

  const redPlayers = getPlayersByTeam('red');
  const bluePlayers = getPlayersByTeam('blue');

  return (
    <div className="top-pills">
      <TeamPill
        teamName="red"
        playerCount={roster.red.length}
        players={redPlayers}
      />
      <TeamPill
        teamName="blue"
        playerCount={roster.blue.length}
        players={bluePlayers}
      />
    </div>
  );
}; 
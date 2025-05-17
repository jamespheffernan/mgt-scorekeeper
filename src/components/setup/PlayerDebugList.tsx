import React, { useEffect, useState } from 'react';
import { millbrookDb } from '../../db/millbrookDb';
import { Player } from '../../db/API-GameState';

const PlayerDebugList: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    (async () => {
      const allPlayers = await millbrookDb.getAllPlayers();
      const transformedPlayers: Player[] = allPlayers.map(dbPlayer => {
        const rawIndex = dbPlayer.index;
        let finalIndex: number;
        if (rawIndex === null || rawIndex === undefined) {
          finalIndex = 0;
        } else {
          const num = Number(rawIndex);
          finalIndex = isNaN(num) ? 0 : num;
        }

        // Explicitly construct the Player object to ensure type conformity
        const playerTyped: Player = {
          id: String(dbPlayer.id ?? `unknown-id-${Date.now()}`),
          first: String(dbPlayer.first ?? ''),
          last: String(dbPlayer.last ?? ''),
          name: dbPlayer.name ? String(dbPlayer.name) : undefined,
          index: finalIndex, // Guaranteed number
          ghin: dbPlayer.ghin ? String(dbPlayer.ghin) : undefined,
          defaultTeam: dbPlayer.defaultTeam ?? undefined, // Assuming Team type or undefined
          preferredTee: dbPlayer.preferredTee ? String(dbPlayer.preferredTee) : undefined,
          lastUsed: dbPlayer.lastUsed ? String(dbPlayer.lastUsed) : undefined,
          notes: dbPlayer.notes ? String(dbPlayer.notes) : undefined,
        };
        return playerTyped;
      });
      setPlayers(transformedPlayers);
    })();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Player Debug List</h2>
      <table border={1} cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>First</th>
            <th>Last</th>
            <th>Index</th>
          </tr>
        </thead>
        <tbody>
          {(players as Player[]).map(p => (
            <tr key={String(p.id)}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>{p.first}</td>
              <td>{p.last}</td>
              <td>{p.index}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlayerDebugList; 
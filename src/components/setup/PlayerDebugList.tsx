import React, { useEffect, useState } from 'react';
import { millbrookDb } from '../../db/millbrookDb';
import { Player } from '../../db/API-GameState';

const PlayerDebugList: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    (async () => {
      const allPlayers = await millbrookDb.getAllPlayers();
      // Ensure index is always a number for TS
      setPlayers(
        allPlayers.map(p => ({
          ...p,
          index: typeof p.index === 'string' ? parseFloat(p.index) : p.index,
        }))
      );
    })();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Player Debug List</h2>
      <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
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
          {players.map(p => (
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
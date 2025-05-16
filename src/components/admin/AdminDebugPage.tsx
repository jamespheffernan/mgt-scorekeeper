import React, { useEffect, useState } from 'react';
import { millbrookDb } from '../../db/millbrookDb';
import { Player } from '../../db/API-GameState';

const AdminDebugPage: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPlayers = async () => {
    setLoading(true);
    const allPlayers = await millbrookDb.getAllPlayers();
    setPlayers(allPlayers);
    setLoading(false);
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this player?')) return;
    await millbrookDb.deletePlayer(id);
    await loadPlayers();
  };

  const filteredPlayers = players.filter(p => {
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.first?.toLowerCase().includes(q) ||
      p.last?.toLowerCase().includes(q) ||
      p.id.includes(q)
    );
  });

  return (
    <div style={{ padding: 24 }}>
      <h2>Admin Player Debug</h2>
      <input
        type="text"
        placeholder="Search by name or ID..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16, padding: 6, width: 300 }}
      />
      {loading ? <div>Loading...</div> : null}
      <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>First</th>
            <th>Last</th>
            <th>Index</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredPlayers.map(p => (
            <tr key={String(p.id)}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>{p.first}</td>
              <td>{p.last}</td>
              <td>{p.index}</td>
              <td>
                <button onClick={() => handleDelete(p.id)} style={{ color: 'red' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 16, color: '#888', fontSize: 13 }}>
        <b>Note:</b> This page is for admin/debug use only. Deletions are permanent in local DB.
      </div>
    </div>
  );
};

export default AdminDebugPage; 
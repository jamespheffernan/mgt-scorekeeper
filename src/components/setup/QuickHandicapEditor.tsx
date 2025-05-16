import React, { useState } from 'react';
import { Player } from '../../store/gameStore';
import { formatPlayerName } from '../../utils/nameFormatter';

interface QuickHandicapEditorProps {
  player: Player;
  onSave: (updatedPlayer: Player) => void;
  onCancel: () => void;
  onDelete: (playerId: string) => void;
}

export const QuickHandicapEditor: React.FC<QuickHandicapEditorProps> = ({ 
  player, 
  onSave, 
  onCancel, 
  onDelete 
}) => {
  // Add state for first/last name
  const [firstNameValue, setFirstNameValue] = useState(player.first || '');
  const [lastNameValue, setLastNameValue] = useState(player.last || '');
  const [indexValue, setIndexValue] = useState(player.index.toString());
  const [ghinValue, setGhinValue] = useState(player.ghin || '');
  const [notes, setNotes] = useState(player.notes || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');
  
  // Validate index input
  const validateIndex = (value: string) => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0 || parsed > 36) {
      setIsValid(false);
      setError('Index must be a number between 0 and 36');
      return false;
    }
    setIsValid(true);
    setError('');
    return true;
  };
  
  // Handle input change
  const handleIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIndexValue(value);
    validateIndex(value);
  };
  
  // Handle save button click
  const handleSave = () => {
    if (!validateIndex(indexValue)) return;
    
    const updatedPlayer: Player = {
      ...player,
      first: firstNameValue,
      last: lastNameValue,
      name: `${firstNameValue} ${lastNameValue}`.trim(),
      index: parseFloat(indexValue),
      ghin: ghinValue || undefined,
      notes: notes || undefined,
      lastUsed: new Date().toISOString()
    };
    
    onSave(updatedPlayer);
  };
  
  // Handle delete button click
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${formatPlayerName(player)}? This action cannot be undone.`)) {
      onDelete(player.id);
    }
  };
  
  return (
    <div className="quick-handicap-editor">
      <div className="editor-container">
        <div className="editor-form">
          <h2>Edit Player</h2>
          
          <div className="form-group">
            <label htmlFor="player-first-name">First Name:</label>
            <input
              id="player-first-name"
              type="text"
              value={firstNameValue}
              onChange={(e) => setFirstNameValue(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="player-last-name">Last Name:</label>
            <input
              id="player-last-name"
              type="text"
              value={lastNameValue}
              onChange={(e) => setLastNameValue(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="handicap-index">Handicap Index:</label>
            <input
              id="handicap-index"
              type="number"
              step="0.1"
              min="0"
              max="36"
              value={indexValue}
              onChange={handleIndexChange}
              className={!isValid ? 'invalid' : ''}
            />
            {error && <div className="error-message">{error}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="ghin-number">GHIN Number (optional):</label>
            <input
              id="ghin-number"
              type="text"
              value={ghinValue}
              onChange={(e) => setGhinValue(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="player-notes">Notes (optional):</label>
            <textarea
              id="player-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      
        <div className="editor-actions">
          <button
            className="save-button"
            onClick={handleSave}
            disabled={!isValid || !firstNameValue}
          >
            Save Changes
          </button>
          <div className="secondary-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onCancel}
            >
              Cancel
            </button>
            {typeof onDelete === 'function' && (
              <button
                type="button"
                className="delete-button"
                onClick={handleDelete}
              >
                Delete Player
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 
import React, { useState, useEffect } from 'react';
import '../../App.css'; // For modal styles
import './AddPlayerForm.css'; // For specific form styles

interface AddPlayerFormProps {
  show: boolean;
  onSave: (playerData: { first: string; last: string; index: number }) => Promise<void>;
  onCancel: () => void;
}

const AddPlayerForm: React.FC<AddPlayerFormProps> = ({ show, onSave, onCancel }) => {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [indexString, setIndexString] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form when 'show' prop changes to true (form is opened)
  useEffect(() => {
    if (show) {
      setFirst('');
      setLast('');
      setIndexString('');
      setError(null);
    }
  }, [show]);

  if (!show) {
    return null;
  }

  const handleSubmit = async () => {
    setError(null);
    if (!first.trim() && !last.trim()) {
      const trimmedFirst = first.trim();
      const trimmedLast = last.trim();
      if (!trimmedFirst && !trimmedLast) {
        setError('Player name (first or last) cannot be empty.');
        return;
      }
    }
    if (!indexString.trim()) {
      setError('Handicap index cannot be empty.');
      return;
    }

    const index = parseFloat(indexString);
    if (isNaN(index)) {
      setError('Handicap index must be a number.');
      return;
    }
    if (index < -10 || index > 54) { 
      setError('Please enter a valid handicap index (e.g., -5 to 54).');
      return;
    }

    const finalFirst = first.trim();
    const finalLast = last.trim();
    const playerName = `${finalFirst} ${finalLast}`.trim();
    if (!playerName) { // Should be caught by first/last check, but good failsafe
        setError('Player name cannot be empty.');
        return;
    }

    try {
      await onSave({ first: finalFirst, last: finalLast, index });
    } catch (e) {
      setError('Failed to save player. Please try again.');
      console.error(e);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content add-player-form-content" onClick={(e) => e.stopPropagation()}>
        <h3>Add New Player</h3>
        
        {error && <p className="form-error">{error}</p>}

        <div className="form-group">
          <label htmlFor="firstName">First Name</label>
          <input
            type="text"
            id="firstName"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder="e.g., John"
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name</label>
          <input
            type="text"
            id="lastName"
            value={last}
            onChange={(e) => setLast(e.target.value)}
            placeholder="e.g., Doe"
          />
        </div>

        <div className="form-group">
          <label htmlFor="handicapIndex">Handicap Index</label>
          <input
            type="number"
            id="handicapIndex"
            value={indexString}
            onChange={(e) => setIndexString(e.target.value)}
            placeholder="e.g., 10.5"
            step="0.1"
          />
        </div>

        <div className="dialog-actions">
          <button type="button" className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="confirm-button" onClick={handleSubmit}>
            Save Player
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPlayerForm; 
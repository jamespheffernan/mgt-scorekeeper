import React from 'react';
import './Chip.css';

interface ChipProps {
  name: string;
  onRemove?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({ name, onRemove, className = '' }) => {
  return (
    <span className={`chip-root ${className}`}>
      {name}
      {onRemove && (
        <button 
          onClick={onRemove}
          className="chip-remove-button"
          aria-label="Remove"
        >
          &times;
        </button>
      )}
    </span>
  );
}; 
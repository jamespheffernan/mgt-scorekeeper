import React from 'react';
import './Chip.css';

interface ChipProps {
  name: string;
  onRemove?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Chip: React.FC<ChipProps> = ({ name, onRemove, className = '', style }) => {
  return (
    <span className={`chip-root ${className}`} style={style}>
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
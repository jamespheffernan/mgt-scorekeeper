import React from 'react';
import './Chip.css';

// name now accepts React.ReactNode for flexibility (e.g., icon + label)
interface ChipProps {
  name: React.ReactNode;
  onRemove?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

// name can be a string or JSX (e.g., ghost icon + label)
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
import React from 'react';

interface ChipProps {
  name: string;
  onRemove?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({ name, onRemove, className = '' }) => {
  return (
    <span className={`inline-flex items-center h-8 px-3 bg-brand20 rounded-full ${className}`}>
      {name}
      {onRemove && (
        <button 
          onClick={onRemove}
          className="ml-2 text-grey60 hover:text-grey90"
          aria-label="Remove"
        >
          &times;
        </button>
      )}
    </span>
  );
}; 
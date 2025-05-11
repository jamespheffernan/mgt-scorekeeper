import React from 'react';

interface PotRowProps {
  red: string;
  carry: string;
  blue: string;
}

export const PotRow: React.FC<PotRowProps> = ({ red, carry, blue }) => {
  return (
    <div className="flex justify-between items-center h-10 px-2">
      <span className="text-red">{red}</span>
      <span className="font-medium">{carry}</span>
      <span className="text-blue">{blue}</span>
    </div>
  );
}; 
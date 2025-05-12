import React from 'react';

interface PotRowProps {
  red: string;
  holeValue: string;
  blue: string;
  carryingAmount?: number;
}

export const PotRow: React.FC<PotRowProps> = ({ red, holeValue, blue, carryingAmount }) => {
  return (
    <div className="flex justify-between items-center min-h-10 px-2">
      <span className="text-red">{red}</span>
      <div className="flex flex-col items-center">
        <span className="font-medium">{holeValue}</span>
        {(carryingAmount || 0) > 0 && (
          <span className="text-sm text-gray-500">
            carrying ${carryingAmount}
          </span>
        )}
      </div>
      <span className="text-blue">{blue}</span>
    </div>
  );
}; 
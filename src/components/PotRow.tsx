import React from 'react';
import './PotRow.css';

interface PotRowProps {
  red: string;
  holeValue: string;
  blue: string;
  carryingAmount?: number;
}

export const PotRow: React.FC<PotRowProps> = ({ red, holeValue, blue, carryingAmount }) => {
  return (
    <div className="pot-row-root">
      <span className="pot-row-team pot-row-team-red">{red}</span>
      <div className="pot-row-center-column">
        <span className="pot-row-hole-value">{holeValue}</span>
        {(carryingAmount || 0) > 0 && (
          <span className="pot-row-carrying-amount">
            carrying ${carryingAmount}
          </span>
        )}
      </div>
      <span className="pot-row-team pot-row-team-blue">{blue}</span>
    </div>
  );
}; 
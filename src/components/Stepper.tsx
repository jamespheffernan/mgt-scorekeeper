import React from 'react';
import './Stepper.css';

interface StepperProps {
  current: number;
  of: number;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({ current, of, className = '' }) => {
  return (
    <div className={`stepper-root ${className}`}>
      <h2 className="stepper-title">Step {current} of {of}</h2>
      <div className="stepper-bar-container">
        {Array.from({ length: of }, (_, i) => (
          <div
            key={i}
            className={`stepper-bar-item ${
              i < current ? 'stepper-bar-item-active' : 'stepper-bar-item-inactive'
            }`}
          />
        ))}
      </div>
    </div>
  );
}; 
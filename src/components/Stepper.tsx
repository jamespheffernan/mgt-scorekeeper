import React from 'react';

interface StepperProps {
  current: number;
  of: number;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({ current, of, className = '' }) => {
  return (
    <div className={`mb-4 ${className}`}>
      <h2 className="text-lg font-medium">Step {current} of {of}</h2>
      <div className="flex mt-2 gap-2">
        {Array.from({ length: of }, (_, i) => (
          <div 
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < current ? 'bg-brand' : 'bg-grey30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}; 
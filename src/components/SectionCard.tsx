import React from 'react';

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 mb-4 ${className}`}>
      {children}
    </div>
  );
}; 
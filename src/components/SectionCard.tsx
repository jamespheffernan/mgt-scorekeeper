import React from 'react';
import './SectionCard.css'; // Import the new CSS file

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`section-card-container ${className.trim()}`.trim()}>
      {children}
    </div>
  );
}; 
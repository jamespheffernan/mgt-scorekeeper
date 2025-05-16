import React from 'react';
import './BottomNav.css';

interface BottomNavProps {
  children: React.ReactNode;
  className?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ children, className = '' }) => {
  return (
    <footer className={`bottom-nav-root safe-wrapper ${className}`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="bottom-nav-content">
        {children}
      </div>
    </footer>
  );
}; 
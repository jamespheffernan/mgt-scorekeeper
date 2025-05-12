import React from 'react';

interface BottomNavProps {
  children: React.ReactNode;
  className?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ children, className = '' }) => {
  return (
    <footer className={`fixed bottom-0 inset-x-0 safe-wrapper bg-white shadow-inner z-40 ${className}`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-between px-3 py-2">
        {children}
      </div>
    </footer>
  );
}; 
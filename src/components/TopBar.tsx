import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface TopBarProps {
  title?: string;
}

export default function TopBar({ title = "The Millbrook Game" }: TopBarProps) {
  const location = useLocation();
  
  return (
    <header className="safe-wrapper fixed top-0 inset-x-0 bg-brand shadow-md z-50" style={{ 
      height: 'var(--header-height)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 className="topbar-title m-0" style={{ 
        textAlign: 'center'
      }}>
        {title}
      </h1>
    </header>
  );
} 
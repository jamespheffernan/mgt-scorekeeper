import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './TopBar.css';

interface TopBarProps {
  title?: string;
}

export default function TopBar({ title = "The Millbrook Game" }: TopBarProps) {
  const location = useLocation();
  
  // Detect iOS standalone mode
  const isIOSStandalone = useMemo(() => {
    return (
      (window.navigator as any).standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    );
  }, []);

  return (
    <header className={`top-bar-root safe-wrapper${isIOSStandalone ? ' top-bar-standalone' : ''}`} style={{ 
      height: 'var(--header-height)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 className="topbar-title" style={{ 
        textAlign: 'center'
      }}>
        {title}
      </h1>
    </header>
  );
} 
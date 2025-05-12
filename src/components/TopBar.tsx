import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface TopBarProps {
  title?: string;
}

export default function TopBar({ title = "The Millbrook Game" }: TopBarProps) {
  const location = useLocation();
  
  return (
    <header className="safe-wrapper fixed top-0 inset-x-0 flex items-center justify-center bg-brand shadow-md z-50">
      <h1 className="topbar-title">
        {title}
      </h1>
      <Link to="/roster" className={location.pathname === '/roster' ? 'active' : ''}>
        Roster
      </Link>
    </header>
  );
} 
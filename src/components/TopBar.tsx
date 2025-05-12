import React from 'react';

interface TopBarProps {
  title?: string;
}

export default function TopBar({ title = "The Millbrook Game" }: TopBarProps) {
  return (
    <header className="safe-wrapper fixed top-0 inset-x-0 flex items-center justify-center bg-brand shadow-md z-50">
      <h1 className="topbar-title">
        {title}
      </h1>
    </header>
  );
} 
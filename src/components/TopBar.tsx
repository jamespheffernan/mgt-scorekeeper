import React from 'react';

interface TopBarProps {
  title?: string;
}

export default function TopBar({ title = "The Millbrook Game" }: TopBarProps) {
  return (
    <header className="safe-wrapper fixed top-0 inset-x-0 h-14 flex items-center justify-center bg-brand shadow-md z-50">
      <h1 className="text-white text-lg font-semibold tracking-wide">
        {title}
      </h1>
    </header>
  );
} 
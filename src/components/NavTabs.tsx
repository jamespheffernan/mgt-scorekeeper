import React from 'react';
import { useNavigate } from 'react-router-dom';
import { radius } from '../theme/tokens';

interface NavItem {
  id: string;
  label: string;
  href: string;
}

interface NavTabsProps {
  items: NavItem[];
  current: string;
}

export const NavTabs: React.FC<NavTabsProps> = ({ items, current }) => {
  const navigate = useNavigate();
  
  return (
    <nav className="flex gap-2 my-3">
      {items.map(i => (
        <button 
          key={i.id}
          className={`flex-1 h-10 rounded-${radius} text-sm font-medium
                    ${current === i.id
                        ? 'bg-brand text-white'
                        : 'bg-grey30 text-grey90'}`}
          onClick={() => navigate(i.href)}>
          {i.label}
        </button>
      ))}
    </nav>
  );
}; 
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { radius } from '../theme/tokens';
import './NavTabs.css';

interface NavItem {
  id: string;
  label: string;
  href: string;
}

interface NavTabsProps {
  items: NavItem[];
  current: string;
  onTabClick?: (id: string) => void;
}

export const NavTabs: React.FC<NavTabsProps> = ({ items, current, onTabClick }) => {
  const navigate = useNavigate();
  
  return (
    <nav className="nav-tabs-root">
      {items.map(i => (
        <button 
          key={i.id}
          className={`nav-tab-button ${
            current === i.id
                ? 'nav-tab-button-active'
                : 'nav-tab-button-inactive'}`}
          style={{ borderRadius: typeof radius === 'string' ? radius : `${radius}px` }}
          onClick={() => {
            if (onTabClick) {
              onTabClick(i.id);
            } else {
              navigate(i.href);
            }
          }}>
          {i.label}
        </button>
      ))}
    </nav>
  );
}; 
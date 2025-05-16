import React from 'react';
import './PageHeader.css';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="page-header-root">
      <h1 className="page-header-title">{title}</h1>
      {subtitle && <h2 className="page-header-subtitle">{subtitle}</h2>}
    </div>
  );
}; 
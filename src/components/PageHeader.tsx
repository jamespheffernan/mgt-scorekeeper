import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-bold">{title}</h1>
      {subtitle && <h2 className="text-lg text-grey60">{subtitle}</h2>}
    </div>
  );
}; 
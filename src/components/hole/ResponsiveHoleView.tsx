import React, { useState, useEffect } from 'react';
import { HoleView } from './HoleView';
import { HoleViewMobile } from './mobile/HoleViewMobile';

// Optional query parameter to force mobile view for testing
const useForcedMobileView = (): boolean => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('mview') === '1';
  }
  return false;
};

// Custom hook for responsive rendering
const useViewportWidth = (): number => {
  const [width, setWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 0
  );

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
};

export const ResponsiveHoleView: React.FC = () => {
  const viewportWidth = useViewportWidth();
  const forceMobile = useForcedMobileView();

  // Use mobile view for small screens and when forced via query param
  const useMobileView = viewportWidth <= 600 || forceMobile;

  return useMobileView ? <HoleViewMobile /> : <HoleView />;
}; 
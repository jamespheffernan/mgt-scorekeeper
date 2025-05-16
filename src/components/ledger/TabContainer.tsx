import React, { useState, useEffect, useRef, ReactElement } from 'react';

interface TabPanelProps {
  id: string;
  children?: React.ReactNode;
}

// Type guard to check if an element is a valid TabPanel
const isTabPanel = (child: unknown): child is ReactElement<TabPanelProps> => {
  return (
    React.isValidElement(child) && 
    typeof child.props === 'object' && 
    child.props !== null && 
    'id' in child.props
  );
};

interface TabContainerProps {
  tabs: Array<{
    id: string;
    label: string;
  }>;
  defaultActiveTab?: string;
  onTabChange?: (tabId: string) => void;
  children: React.ReactNode;
}

const TabContainer: React.FC<TabContainerProps> = ({
  tabs,
  defaultActiveTab,
  onTabChange,
  children
}) => {
  const [activeTab, setActiveTab] = useState<string>(defaultActiveTab || tabs[0]?.id || '');
  const tabsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Scroll to active tab when it changes
    if (tabsRef.current) {
      const activeTabElement = tabsRef.current.querySelector(`.tab-button[data-tab-id="${activeTab}"]`);
      if (activeTabElement) {
        // Scroll the active tab into view with some offset
        const tabsContainer = tabsRef.current;
        const tabRect = activeTabElement.getBoundingClientRect();
        const containerRect = tabsContainer.getBoundingClientRect();
        
        // Calculate the center position
        const scrollLeft = tabsContainer.scrollLeft + 
                          (tabRect.left - containerRect.left) - 
                          (containerRect.width / 2) + 
                          (tabRect.width / 2);
        
        tabsContainer.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
    }
    
    // Notify parent component if callback is provided
    if (onTabChange) {
      onTabChange(activeTab);
    }
    
    // Force browser to recalculate layout - helps with iOS scrolling issues
    window.scrollTo(0, window.scrollY);
  }, [activeTab, onTabChange]);
  
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };
  
  // Find the currently active child using the type guard
  const activeChild = React.Children.toArray(children).find(
    (child) => isTabPanel(child) && child.props.id === activeTab
  );
  
  return (
    <div className="tab-container">
      <div className="settlement-tabs" ref={tabsRef}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-tab-id={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="settlement-content">
        {activeChild}
      </div>
    </div>
  );
};

// TabPanel component for use with TabContainer
export const TabPanel: React.FC<TabPanelProps> = ({ children }) => {
  return <>{children}</>;
};

export default TabContainer; 
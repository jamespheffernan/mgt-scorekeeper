import React, { useState, useEffect } from 'react';
import { TopPills } from './TopPills';
import { BottomSheet } from './BottomSheet';
import { useRosterStore } from '../../store/rosterStore';
import './PlayersRoster.css';

export const PlayersScreen: React.FC = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const initialize = useRosterStore(state => state.initialize);
  
  // Initialize roster store when component mounts
  useEffect(() => {
    initialize().catch(err => {
      console.error('Failed to initialize roster store:', err);
    });
  }, [initialize]);
  
  const handleOpenSheet = () => {
    setSheetOpen(true);
  };
  
  return (
    <div className="players-screen">
      <TopPills onOpenSheet={handleOpenSheet} />
      
      <div className="players-content">
        <h1 className="players-title">Player Roster</h1>
        <p className="players-description">
          Select players for your match by tapping the team pills above or 
          the button below.
        </p>
        
        <button
          className="manage-players-button"
          onClick={handleOpenSheet}
        >
          Manage Players
        </button>
      </div>
      
      <BottomSheet 
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}; 
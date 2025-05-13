import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRosterStore } from '../../store/rosterStore';
import { useSetupFlowStore } from '../../store/setupFlowStore';

const StartMatchButton: React.FC = () => {
  const navigate = useNavigate();
  const roster = useRosterStore(state => state.roster);
  const setTeamPlayers = useSetupFlowStore(state => state.setTeamPlayers);
  
  // Check if both teams have exactly 2 players
  const isReady = roster.red.length === 2 && roster.blue.length === 2;
  
  // If not ready, don't render the button
  if (!isReady) return null;
  
  const handleStartMatch = () => {
    // Save the team selections to the setup flow store
    setTeamPlayers(roster.red, roster.blue);
    
    // Navigate to tee selection screen
    navigate('/tee-selection');
  };
  
  return (
    <button 
      className="start-match-button" 
      onClick={handleStartMatch}
      aria-label="Start Match"
    >
      Start Match
    </button>
  );
};

export default StartMatchButton; 
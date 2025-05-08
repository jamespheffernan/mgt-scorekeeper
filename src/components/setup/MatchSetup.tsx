import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, Player, Team } from '../../store/gameStore';
import { CourseSetup } from './CourseSetup';
import PlayerRoster from './PlayerRoster';
import '../../App.css';

enum SetupStep {
  PLAYERS,
  COURSE
}

export const MatchSetup = () => {
  // Access store functions
  const createMatch = useGameStore(state => state.createMatch);
  const navigate = useNavigate();
  
  // Setup step tracking
  const [currentStep, setCurrentStep] = useState<SetupStep>(SetupStep.PLAYERS);
  
  // Local state
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>(['Red', 'Blue', 'Red', 'Blue']);
  const [bigGame, setBigGame] = useState(false);
  
  // Handle players selected from roster
  const handlePlayersSelected = (selectedPlayers: Player[], selectedTeams: Team[]) => {
    setPlayers(selectedPlayers);
    setTeams(selectedTeams);
    
    // Show Big Game toggle
    setCurrentStep(SetupStep.COURSE);
  };
  
  // Navigate to course preview
  const navigateToCoursePreview = () => {
    navigate('/course-preview');
  };
  
  // Handle course setup completion
  const handleCourseSetupComplete = (courseId: string, playerTeeIds: [string, string, string, string]) => {
    // Create the match with all information
    createMatch(players, teams, { 
      bigGame,
      courseId,
      playerTeeIds
    });
    
    // Navigate to hole 1 after match creation
    navigate('/hole/1');
  };
  
  // Go back to player setup
  const handleBackToPlayerSetup = () => {
    setCurrentStep(SetupStep.PLAYERS);
  };
  
  // Render the appropriate setup step
  const renderSetupStep = () => {
    switch (currentStep) {
      case SetupStep.PLAYERS:
        return (
          <>
            <h2>Match Setup</h2>
            <PlayerRoster onPlayersSelected={handlePlayersSelected} />
            <div className="setup-actions">
              <button 
                className="preview-course-button"
                onClick={navigateToCoursePreview}
              >
                View Course Details
              </button>
            </div>
          </>
        );
        
      case SetupStep.COURSE:
        return (
          <>
            <div className="game-options">
              <div className="big-game-toggle-container">
                <label className="big-game-toggle">
                  <input 
                    type="checkbox"
                    checked={bigGame}
                    onChange={(e) => setBigGame(e.target.checked)}
                  />
                  <span className="toggle-label">Enable "Big Game" scoring</span>
                </label>
                <div className="big-game-explanation">
                  When enabled, the app will track the two lowest net scores on each hole.
                  The total is shared with other groups playing in the Big Game.
                  <br />
                  <strong>Note:</strong> Big Game has different rules for gimmes and pick-ups than the Millbrook side match.
                </div>
              </div>
            </div>
            
            <CourseSetup 
              selectedPlayers={players} 
              onComplete={handleCourseSetupComplete}
              onBack={handleBackToPlayerSetup}
            />
          </>
        );
    }
  };
  
  return (
    <div className="setup-container">
      {renderSetupStep()}
    </div>
  );
}; 
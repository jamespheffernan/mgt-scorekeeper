import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, Player, Team } from '../../store/gameStore';
import { CourseSetup } from './CourseSetup';
import PlayerRoster from './PlayerRoster';
import { Stepper } from '../Stepper';
import TopBar from '../TopBar';
import { SectionCard } from '../SectionCard';

interface MatchSetupProps {
  // No props needed for now, fetches from store or uses internal state
}

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
  const [showBigGameExplanation, setShowBigGameExplanation] = useState(false);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  
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
  const handleCourseSetupComplete = async (courseId: string, playerTeeIds: [string, string, string, string]) => {
    setIsCreatingMatch(true);
    try {
      await createMatch(players, teams, { 
        bigGame,
        courseId,
        playerTeeIds
      });
      navigate('/hole/1');
    } finally {
      setIsCreatingMatch(false);
    }
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
            <Stepper current={1} of={2} />
            <PlayerRoster onPlayersSelected={handlePlayersSelected} />
            <div className="setup-actions mobile-full-width-buttons">
              <button 
                className="secondary-action-button"
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
            <Stepper current={2} of={2} />
            <SectionCard>
              <div className="game-options">
                <div className="big-game-toggle-container">
                  <label className="big-game-toggle mobile-touch-target">
                    <input 
                      type="checkbox"
                      checked={bigGame}
                      onChange={(e) => setBigGame(e.target.checked)}
                    />
                    <span className="toggle-label">Enable "Big Game" scoring</span>
                  </label>
                  <button 
                    onClick={() => setShowBigGameExplanation(!showBigGameExplanation)}
                    className="learn-more-button"
                  >
                    {showBigGameExplanation ? 'Hide details' : 'Learn more'}
                  </button>
                  {showBigGameExplanation && (
                    <div className="big-game-explanation mobile-text-block">
                      When enabled, the app will track the two lowest net scores on each hole.
                      The total is shared with other groups playing in the Big Game.
                      <br />
                      <strong>Note:</strong> Big Game has different rules for gimmes and pick-ups than the Millbrook side match.
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
            
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
    <>
      <TopBar title="Game Setup" />
      <div className="setup-container mobile-setup-container">
        {renderSetupStep()}
      </div>
    </>
  );
};

export default MatchSetup; 